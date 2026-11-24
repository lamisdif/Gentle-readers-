import urllib.request, json

SUPABASE_URL = 'https://fsximdllrhglabxbqvay.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

tables = [
    'orders', 'inventory_items', 'purchase_batches', 'suppliers',
    'expenses', 'debts', 'debt_repayments', 'opening_position',
    'order_meta', 'order_stock_allocations', 'order_returns',
    'capital_contributions', 'owner_withdrawals', 'owner_capital',
    'stock_movements', 'stock_adjustments', 'push_subscriptions'
]

results = {}
for t in tables:
    url = f'{SUPABASE_URL}/rest/v1/{t}?select=*&limit=1'
    req = urllib.request.Request(url, headers={'apikey': ANON_KEY, 'Authorization': f'Bearer {ANON_KEY}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode('utf-8')
            results[t] = f'EXISTS & READABLE (200 OK, sample={data[:40]})'
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        if e.code == 401:
            results[t] = 'EXISTS (401 Unauthorized - table exists with RLS restricted to authenticated owner)'
        elif e.code == 404:
            results[t] = 'DOES NOT EXIST (404 Not Found)'
        elif 'PGRST204' in body or 'relation' in body or 'not exist' in body:
            results[t] = f'DOES NOT EXIST ({body[:60]})'
        else:
            results[t] = f'EXISTS (code {e.code}: {body[:60]})'
    except Exception as ex:
        results[t] = f'ERROR: {ex}'

for t, res in results.items():
    print(f'{t:25} -> {res}')
