import urllib.request, json
from datetime import datetime

SUPABASE_URL = 'https://fsximdllrhglabxbqvay.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

# Fetch orders with id >= 165 or created_at >= 2026-11-14
req = urllib.request.Request(f'{SUPABASE_URL}/rest/v1/orders?order=id.desc&limit=30', headers={
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}'
})

with urllib.request.urlopen(req) as resp:
    orders = json.loads(resp.read().decode('utf-8'))

print(f"Total fetched orders: {len(orders)}")
for o in orders:
    oid = o.get('id')
    cat = o.get('created_at')
    name = f"{o.get('firstName', '')} {o.get('familyName', '')}".strip()
    status = o.get('status')
    items = o.get('items')
    total = o.get('total_price')
    print(f"ID: {oid} | Created: {cat} | Name: {name} | Status: {status} | Total: {total}")
    print(f"   Items: {items}")
