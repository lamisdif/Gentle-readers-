import re, json, base64, time

def search_file(path):
    with open(path, 'rb') as fp:
        raw = fp.read()
    
    # Try UTF-8
    text_u8 = raw.decode('latin1')
    # Try stripping null bytes from UTF-16LE
    clean_text = raw.replace(b'\x00', b'').decode('latin1')
    
    tokens = re.findall(r'ey[a-zA-Z0-9_-]{20,}\.ey[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}', clean_text)
    print(f"File {path}: found {len(tokens)} JWTs")
    for t_str in tokens:
        try:
            payload = t_str.split('.')[1]
            payload += '=' * (-len(payload) % 4)
            data = json.loads(base64.b64decode(payload).decode('utf-8'))
            email = data.get('email')
            exp = data.get('exp', 0)
            now = time.time()
            print(f"  Token email: {email}, exp diff: {exp - now:.0f}s, role: {data.get('role')}")
            if email == 'lamisdif@gmail.com':
                return t_str
        except Exception as e:
            pass
    return None

tok = search_file(r'C:\Users\DELL PRO\AppData\Local\Microsoft\Edge\User Data\Default\Local Storage\leveldb\000173.ldb')
if not tok:
    tok = search_file(r'C:\Users\DELL PRO\AppData\Local\Microsoft\Edge\User Data\Default\Local Storage\leveldb\000171.ldb')

if tok:
    print("Found owner JWT!")
    with open('scratch/owner_jwt.txt', 'w') as out:
        out.write(tok)
