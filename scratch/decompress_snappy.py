import struct

def snappy_decompress(data):
    # First: varint uncompressed length
    pos = 0
    uncompressed_len = 0
    shift = 0
    while True:
        b = data[pos]
        pos += 1
        uncompressed_len |= (b & 0x7f) << shift
        if not (b & 0x80):
            break
        shift += 7

    out = bytearray()
    while pos < len(data) and len(out) < uncompressed_len:
        tag_byte = data[pos]
        pos += 1
        tag = tag_byte & 0x03
        if tag == 0: # Literal
            length = (tag_byte >> 2) + 1
            if length > 60:
                extra_bytes = length - 60
                length = int.from_bytes(data[pos:pos+extra_bytes], 'little') + 1
                pos += extra_bytes
            out.extend(data[pos:pos+length])
            pos += length
        elif tag == 1: # Copy with 1-byte offset
            length = ((tag_byte >> 2) & 0x07) + 4
            offset = ((tag_byte >> 5) << 8) | data[pos]
            pos += 1
            for _ in range(length):
                out.append(out[-offset])
        elif tag == 2: # Copy with 2-byte offset
            length = (tag_byte >> 2) + 1
            offset = int.from_bytes(data[pos:pos+2], 'little')
            pos += 2
            for _ in range(length):
                out.append(out[-offset])
        elif tag == 3: # Copy with 4-byte offset
            length = (tag_byte >> 2) + 1
            offset = int.from_bytes(data[pos:pos+4], 'little')
            pos += 4
            for _ in range(length):
                out.append(out[-offset])
    return bytes(out)

# LevelDB sstable records blocks
with open(r'C:\Users\DELL PRO\AppData\Local\Microsoft\Edge\User Data\Default\Local Storage\leveldb\000173.ldb', 'rb') as fp:
    raw = fp.read()

# Let's search each block or test offsets where fsximdllrhglabxbqvay occurs
idx = raw.find(b'fsximdllrhglabxbqvay')
print("Found target at idx:", idx)

# Find block start (in LevelDB, block type byte 0x01 means snappy compressed)
# Let's decompress from ~100 bytes before to ~4000 bytes after
for start in range(max(0, idx - 500), idx):
    try:
        decomp = snappy_decompress(raw[start:])
        if b'access_token' in decomp and b'eyJhbGci' in decomp:
            print("Successfully decompressed block starting at:", start)
            import re
            m = re.search(rb'eyJhbGciOiJIUzI1Ni[a-zA-Z0-9_\-\.]+', decomp)
            if m:
                tok = m.group(0).decode()
                print("Extracted Token! Length:", len(tok))
                with open('scratch/decompressed_token.txt', 'w') as f:
                    f.write(tok)
                break
    except Exception as e:
        pass
