import urllib.request, json

with open('scratch/owner_jwt.txt', 'r', encoding='utf-8') as f:
    token = f.read().strip()

headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
    'Authorization': f'Bearer {token}'
}

req = urllib.request.Request('https://fsximdllrhglabxbqvay.supabase.co/rest/v1/inventory_items?limit=1', headers=headers)
with urllib.request.urlopen(req) as resp:
    item = json.loads(resp.read().decode('utf-8'))[0]
    print('inventory_items schema columns:', list(item.keys()))
