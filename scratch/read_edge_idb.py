import os, re, json, base64

edge_idb = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\IndexedDB\http_localhost_8080.indexeddb.leveldb\000007.log')
with open(edge_idb, 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='ignore')
print("Read bytes:", len(raw))

# Search for tokens
tokens = []
for m in re.finditer(r'access_token.*?([a-zA-Z0-9_\-\.]{50,})', text):
    cand = m.group(1)
    if cand.startswith('ey'):
        tokens.append(cand)

print("Found candidate tokens:", len(tokens))
if tokens:
    tok = tokens[-1] # latest
    print("Latest token length:", len(tok))
    payload = tok.split('.')[1]
    payload += '=' * (-len(payload) % 4)
    data = json.loads(base64.b64decode(payload).decode('utf-8'))
    print("User email:", data.get('email'))
    print("Expires at:", data.get('exp'))
    with open('scratch/edge_owner_token.txt', 'w') as out:
        out.write(tok)

# Search for debts in Edge IDB
print("\n--- Debts found in Edge IndexedDB ---")
for m in re.finditer(r'\{[^{}]*creditor_name[^{}]*\}', text):
    print(m.group(0))

# Search for pending mutations in Edge IDB
print("\n--- Debt mutations found in Edge IndexedDB ---")
for m in re.finditer(r'\{[^{}]*entity_table[^{}]*debts[^{}]*\}', text):
    print(m.group(0))
