import glob, os, re, base64, json

files = glob.glob(os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb\*.ldb'))
files.extend(glob.glob(os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb\*.log')))
files.sort(key=os.path.getmtime, reverse=True)

token = None
for fpath in files:
    try:
        with open(fpath, 'rb') as f:
            content = f.read().decode('utf-8', errors='ignore')
            m = re.search(r'sb-fsximdllrhglabxbqvay-auth-token.*?access_token.*?([a-zA-Z0-9_\-\.]{50,})', content)
            if m:
                cand = m.group(1)
                if cand.startswith('ey'):
                    token = cand
                    print('Found token in:', os.path.basename(fpath))
                    break
    except Exception as e:
        pass

if token:
    print('Token found! Length:', len(token))
    payload = token.split('.')[1]
    payload += '=' * (-len(payload) % 4)
    data = json.loads(base64.b64decode(payload).decode('utf-8'))
    print('User email:', data.get('email'))
    print('Expires at:', data.get('exp'))
    with open('scratch/owner_token.txt', 'w') as out:
        out.write(token)
else:
    print('Token not found in leveldb files.')
