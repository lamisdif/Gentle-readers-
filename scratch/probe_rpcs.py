import urllib.request, json

SUPABASE_URL = 'https://fsximdllrhglabxbqvay.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

rpcs = [
    'create_storefront_order', 'find_inventory_item_id', 'normalize_book_title',
    'update_order_operational_meta', 'transition_order_fulfillment_status',
    'reserve_order_stock', 'confirm_order_delivery', 'cancel_order',
    'record_order_return', 'is_owner'
]

for rpc in rpcs:
    url = f'{SUPABASE_URL}/rest/v1/rpc/{rpc}'
    req = urllib.request.Request(url, data=b'{}', headers={'apikey': ANON_KEY, 'Authorization': f'Bearer {ANON_KEY}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = resp.read().decode('utf-8')
            print(f'{rpc:35} -> 200 OK: {data[:50]}')
    except urllib.error.HTTPError as e:
        msg = e.read().decode('utf-8')
        if e.code == 404:
            print(f'{rpc:35} -> 404 NOT FOUND (Function not in DB)')
        elif e.code == 401:
            print(f'{rpc:35} -> 401 UNAUTHORIZED (Function exists with permission restriction)')
        elif e.code == 400:
            print(f'{rpc:35} -> 400 PARAM ERROR (Function exists!): {msg[:60]}')
        else:
            print(f'{rpc:35} -> {e.code}: {msg[:60]}')
    except Exception as ex:
        print(f'{rpc:35} -> ERROR: {ex}')
