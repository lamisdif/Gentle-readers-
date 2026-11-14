import urllib.request, json

with open('scratch/owner_jwt.txt', 'r', encoding='utf-8') as f:
    token = f.read().strip()

headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
    'Authorization': f'Bearer {token}'
}

# Check distinct stock_group in existing inventory_items
req = urllib.request.Request('https://fsximdllrhglabxbqvay.supabase.co/rest/v1/inventory_items?select=stock_group', headers=headers)
with urllib.request.urlopen(req) as resp:
    groups = set(i.get('stock_group') for i in json.loads(resp.read().decode('utf-8')))
    print('Existing stock_group values in DB:', groups)

candidates = ['OLD_STOCK', 'NEW_STOCK', 'NEW_BATCH', 'ACCESSORY', 'ACCESSORIES', 'GENERAL', 'OTHER']
url = 'https://fsximdllrhglabxbqvay.supabase.co/rest/v1/inventory_items'

for c in candidates:
    test_item = {
        'id': '00000000-0000-0000-0000-000000000001',
        'title': 'Test Item ' + c,
        'stock_group': c,
        'quantity_received': 1
    }
    req = urllib.request.Request(url, data=json.dumps(test_item).encode('utf-8'), headers={
        **headers,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            print(f'Candidate "{c}": ALLOWED!')
            del_req = urllib.request.Request(f'{url}?id=eq.00000000-0000-0000-0000-000000000001', headers=headers, method='DELETE')
            urllib.request.urlopen(del_req)
    except urllib.error.HTTPError as e:
        err = e.read().decode('utf-8')
        if 'stock_group_check' in err:
            print(f'Candidate "{c}": REJECTED by stock_group_check')
        else:
            print(f'Candidate "{c}": Other error: {err[:80]}')
