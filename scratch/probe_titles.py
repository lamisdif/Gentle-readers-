import urllib.request, json
url = 'https://fsximdllrhglabxbqvay.supabase.co/rest/v1/rpc/create_storefront_order'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

def check_stock(t):
    payload = {
        'p_first_name': 'Test',
        'p_family_name': 'Test',
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
            print(f"{t} -> 200 OK (v_inv_id IS NULL)")
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode('utf-8'))
        print(f"{t} -> {err.get('message')}")

for title in [
    'مختارات',
    'ديوان',
    'تبريزي',
    'شمس',
    'رومي',
    'افاق'
]:
    check_stock(title)
