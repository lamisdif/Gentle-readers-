import glob, os, re

idb_dir = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\IndexedDB\http_localhost_8080.indexeddb.leveldb')
files = glob.glob(os.path.join(idb_dir, '*.*'))

print("IndexedDB files:", len(files))
all_text = ""
for f in files:
    try:
        with open(f, 'rb') as fp:
            data = fp.read().decode('utf-8', errors='ignore')
            all_text += "\n" + data
    except Exception as e:
        print("Read error:", f, e)

# Search for debts and mutations
print("\n--- Searching for debts in IndexedDB ---")
for m in re.finditer(r'\{[^{}]*creditor_name[^{}]*\}', all_text):
    print("Found debt JSON:", m.group(0))

print("\n--- Searching for pending mutations in IndexedDB ---")
for m in re.finditer(r'\{[^{}]*entity_table[^{}]*debts[^{}]*\}', all_text):
    print("Found debt mutation:", m.group(0))

print("\n--- Searching for token in IndexedDB ---")
for m in re.finditer(r'access_token.*?([a-zA-Z0-9_\-\.]{50,})', all_text):
    tok = m.group(1)
    if tok.startswith('ey'):
        print("Found token!", tok[:30] + "...")
        with open('scratch/owner_token.txt', 'w') as out:
            out.write(tok)
        break
