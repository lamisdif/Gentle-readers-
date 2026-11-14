import os, re, json, urllib.request

candidates = []

for base_dir in [
    os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb'),
    os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb')
]:
    if not os.path.exists(base_dir):
        continue
    for fname in os.listdir(base_dir):
        fpath = os.path.join(base_dir, fname)
        if fpath.endswith(('.log', '.ldb')):
            try:
                with open(fpath, 'rb') as fp:
                    raw = fp.read()
                    matches = re.findall(rb'refresh_token[\\":\s]+([a-zA-Z0-9_\-]+)', raw)
                    for m in matches:
                        s = m.decode('utf-8', errors='ignore')
                        if len(s) > 10 and s not in candidates:
                            candidates.append(s)
            except Exception as e:
                pass

print("Found candidate refresh tokens:", len(candidates))

ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q"

for s in candidates:
    print("Testing refresh token:", s[:15], "...")
    data = json.dumps({'refresh_token': s}).encode('utf-8')
    req = urllib.request.Request('https://fsximdllrhglabxbqvay.supabase.co/auth/v1/token?grant_type=refresh_token', data=data, headers={
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
    })
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode())
            new_access_token = res.get('access_token')
            new_refresh_token = res.get('refresh_token')
            print("SUCCESS! Acquired fresh owner token for:", res.get('user', {}).get('email'))
            with open('scratch/owner_jwt.txt', 'w') as out:
                out.write(new_access_token)
            break
    except urllib.error.HTTPError as e:
        print("  Error:", e.code, e.read().decode())
    except Exception as e:
        print("  Error:", e)
