import glob, os, re, json, base64

edge_ls = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb')
files = glob.glob(os.path.join(edge_ls, '*.ldb'))
files.extend(glob.glob(os.path.join(edge_ls, '*.log')))
files.sort(key=os.path.getmtime, reverse=True)

print("Edge Local Storage files:", len(files))
token = None
for fpath in files:
    try:
        with open(fpath, 'rb') as f:
            raw = f.read()
            # In LevelDB localStorage, keys/values are often UTF-16 or UTF-8
            # Look for "access_token"
            idx = 0
            while True:
                idx = raw.find(b'access_token', idx)
                if idx == -1:
                    break
                snippet = raw[idx:idx+2000].decode('utf-8', errors='ignore')
                m = re.search(r'access_token["\s:]+([a-zA-Z0-9_\-\.]{100,})', snippet)
                if m and m.group(1).startswith('ey'):
                    token = m.group(1)
                    print("Found token in:", os.path.basename(fpath))
                    break
                idx += 12
            if token:
                break
    except Exception as e:
        print("Error reading:", fpath, e)

if token:
    print("Token found! Length:", len(token))
    payload = token.split('.')[1]
    payload += '=' * (-len(payload) % 4)
    data = json.loads(base64.b64decode(payload).decode('utf-8'))
    print("User email:", data.get('email'))
    print("User ID:", data.get('sub'))
    print("Role:", data.get('role'))
    import time
    exp = data.get('exp')
    print("Expires at:", exp, "(current:", time.time(), "- valid:", exp > time.time(), ")")
    with open('scratch/owner_jwt.txt', 'w') as out:
        out.write(token)
else:
    print("Token not found in Edge Local Storage.")
