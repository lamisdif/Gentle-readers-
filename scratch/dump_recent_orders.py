import urllib.request, json

SUPABASE_URL = 'https://fsximdllrhglabxbqvay.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

req = urllib.request.Request(f'{SUPABASE_URL}/rest/v1/orders?id=gte.171&order=id.asc', headers={
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {ANON_KEY}'
})

with urllib.request.urlopen(req) as resp:
    orders = json.loads(resp.read().decode('utf-8'))

print("=== COMPLETE ORDERS SINCE YESTERDAY (IDs 171 - 178) ===")
for o in orders:
    print(f"Order #{o['id']} | {o['created_at']} | {o['firstName']} {o['familyName']} | {o['wilaya']} | Phone: {o['phoneNumber']} | Total: {o['total_price']} DA")
    print(f"  Items: {o['items']}")
