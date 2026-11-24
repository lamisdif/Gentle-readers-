import openpyxl, urllib.request, json

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
all_titles = []
for s in ['NEW BATCH', 'OLD STOCK']:
    ws = wb[s]
    col = 2 if s == 'NEW BATCH' else 0
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[col]:
            t = str(r[col]).strip()
            if t and t not in all_titles:
                all_titles.append((s, t))

print(f"Total titles to test: {len(all_titles)}")

url = 'https://fsximdllrhglabxbqvay.supabase.co/rest/v1/rpc/create_storefront_order'
key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

# Filter for titles containing keywords of interest
interesting = [item for item in all_titles if any(k in item[1] for k in ['شمس', 'تبريز', 'مختارات', 'رومي', 'صوفي', 'مثنوي', 'قواعد'])]
print("Interesting titles:", interesting)

for sheet, t in interesting:
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
            print(f"[{sheet}] '{t}' -> 200 OK (v_inv_id IS NULL)")
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode('utf-8'))
        print(f"[{sheet}] '{t}' -> {err.get('message')}")
