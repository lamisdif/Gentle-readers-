with open(r'C:\Users\DELL PRO\AppData\Local\Microsoft\Edge\User Data\Default\Local Storage\leveldb\000173.ldb', 'rb') as fp:
    raw = fp.read()

idx = raw.find(b'eyJhbGciOiJIUzI1Ni')
if idx != -1:
    end = raw.find(b'"', idx)
    token = raw[idx:end].decode('latin1')
    print("Found token! Length:", len(token))
    with open('scratch/owner_jwt.txt', 'w') as out:
        out.write(token)
    
    import base64, json, time
    payload = token.split('.')[1]
    payload += '=' * (-len(payload) % 4)
    data = json.loads(base64.b64decode(payload).decode('utf-8'))
    print("Owner email:", data.get('email'))
    print("Owner sub:", data.get('sub'))
    exp = data.get('exp')
    print(f"Expires at: {exp} (in {exp - time.time():.0f} seconds)")
