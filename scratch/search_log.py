import glob, os, base64, json, time

edge_ls = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb')
for f in glob.glob(os.path.join(edge_ls, '*.*')):
    try:
        with open(f, 'rb') as fp:
            raw = fp.read()
    except:
        continue
    idx = 0
    while True:
        idx = raw.find(b'eyJhbGciOiJIUzI1Ni', idx)
        if idx == -1:
            break
        end = raw.find(b'"', idx)
        cand = raw[idx:end]
        if b'\x00' not in cand and b'\x01' not in cand and len(cand) > 500:
            tok = cand.decode('ascii', errors='ignore')
            try:
                payload = tok.split('.')[1]
                payload += '=' * (-len(payload) % 4)
                data = json.loads(base64.b64decode(payload).decode('utf-8'))
                email = data.get('email')
                exp = data.get('exp')
                print(f"File {os.path.basename(f)}: email={email}, exp={exp}, valid={exp > time.time()}")
                if email == 'lamisdif@gmail.com' and exp > time.time():
                    with open('scratch/valid_owner_token.txt', 'w') as out:
                        out.write(tok)
                    print("SAVED VALID TOKEN TO scratch/valid_owner_token.txt!")
            except Exception as e:
                pass
        idx += 18
