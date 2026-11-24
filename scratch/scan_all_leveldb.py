import glob, os, re, json, time, base64

dirs = [
    os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb'),
    os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb'),
]

for d in dirs:
    if not os.path.exists(d):
        continue
    files = glob.glob(os.path.join(d, '*.ldb')) + glob.glob(os.path.join(d, '*.log'))
    files.sort(key=os.path.getmtime, reverse=True)
    print(f"Scanning {d} ({len(files)} files)...")
    for fpath in files:
        try:
            with open(fpath, 'rb') as f:
                content = f.read().decode('utf-8', errors='ignore')
                for m in re.finditer(r'sb-fsximdllrhglabxbqvay-auth-token["\s:]+({.+?})', content):
                    val = m.group(1)
                    try:
                        obj = json.loads(val)
                        tok = obj.get('access_token')
                        ref = obj.get('refresh_token')
                        exp = obj.get('expires_at')
                        print(f"File: {os.path.basename(fpath)}, exp: {exp}, left: {exp - time.time() if exp else None}")
                        if exp and exp > time.time():
                            print("VALID TOKEN FOUND!")
                            with open('scratch/owner_token.txt', 'w') as out:
                                out.write(tok)
                    except:
                        pass
        except Exception as e:
            pass
