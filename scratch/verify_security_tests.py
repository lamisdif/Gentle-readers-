import urllib.request, json

url_fn = 'https://gentle-readers.netlify.app/.netlify/functions/admin-orders'
url_page = 'https://gentle-readers.netlify.app/admin/orders'

print('=== 1. VERIFYING LIVE HTML PAGE ===')
with urllib.request.urlopen(url_page) as resp:
    html = resp.read().decode('utf-8')
    has_gate = 'auth-gate' in html
    has_session = 'sessionStorage' in html
    has_direct_select = 'from(\'orders\')' in html or 'from("orders")' in html
    print('  - Authentication Gate present in HTML:', has_gate)
    print('  - Browser sessionStorage caching present:', has_session)
    print('  - Direct Supabase select fallback present:', has_direct_select)

print('\n=== 2. VERIFYING 3 MANDATORY ENDPOINT SECURITY TESTS ===')

# TEST 1: No password
t1 = False
try:
    req = urllib.request.Request(url_fn, data=b'{}', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        print('  FAIL: Test 1 allowed request without password!')
except urllib.error.HTTPError as e:
    if e.code == 401:
        print(f'  [PASS] Test 1: No password -> HTTP 401 ({e.read().decode().strip()})')
        t1 = True

# TEST 2: Wrong password
t2 = False
try:
    req = urllib.request.Request(url_fn, data=json.dumps({'password': 'wrong_password'}).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        print('  FAIL: Test 2 allowed request with wrong password!')
except urllib.error.HTTPError as e:
    if e.code == 401:
        print(f'  [PASS] Test 2: Wrong password -> HTTP 401 ({e.read().decode().strip()})')
        t2 = True

# TEST 3: Correct password
t3 = False
try:
    req = urllib.request.Request(url_fn, data=json.dumps({'password': 'gentleadmin'}).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        if resp.status == 200:
            data = json.loads(resp.read().decode())
            orders = data.get('orders', [])
            print(f'  [PASS] Test 3: Correct password -> HTTP 200 ({len(orders)} customer orders loaded securely)')
            t3 = True
except urllib.error.HTTPError as e:
    print('  FAIL: Test 3 error:', e.code, e.read().decode())

print('\n=== VERIFICATION SUMMARY ===')
if has_gate and not has_session and not has_direct_select and t1 and t2 and t3:
    print('ALL SECURITY TESTS & FRONTEND GATES FULLY VERIFIED ON PRODUCTION!')
else:
    print('VERIFICATION INCOMPLETE OR FAILED')
