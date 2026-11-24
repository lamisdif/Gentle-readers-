import glob, json, urllib.request

url = 'https://fsximdllrhglabxbqvay.supabase.co/rest/v1/rpc/create_storefront_order'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

all_books = []
for f in glob.glob('src/data/books/*.json'):
    try:
        data = json.load(open(f, encoding='utf-8'))
        t = data.get('title')
        if t:
            all_books.append(t)
    except:
        pass

print(f"Total book titles in src/data/books: {len(all_books)}")

found_in_inv = []
for t in all_books:
    payload = {
        'p_first_name': 'Probe',
        'p_family_name': 'Probe',
        'p_phone_number': '0555555555',
        'p_delivery_method': 'home',
        'p_wilaya': 'Alger',
        'p_daira': 'Alger',
        'p_address': 'Test',
        'p_desk': '',
        'p_instagram_username': '',
        'p_shipping_price': 500,
        'p_packaging_type': 'none',
        'p_packaging_price': 0,
        'p_total_price': 5000,
        'p_legacy_items': [f'{t} × 9999'],
        'p_requested_items': [{'title': t, 'quantity': 9999, 'type': 'book'}]
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={
        'apikey': key,
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json'
    })
    try:
        with urllib.request.urlopen(req) as resp:
            pass # v_inv_id was NULL, so it didn't check stock
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode('utf-8'))
        msg = err.get('message', '')
        if 'INSUFFICIENT_STOCK' in msg:
            found_in_inv.append((t, msg))

print(f"\nTitles matched in inventory_items: {len(found_in_inv)}")
for t, msg in sorted(found_in_inv):
    print(f"  {t} -> {msg}")
