import urllib.request, json

with open('scratch/owner_jwt.txt', 'r', encoding='utf-8') as f:
    token = f.read().strip()

url = 'https://fsximdllrhglabxbqvay.supabase.co/rest/v1/inventory_items?select=*'
req = urllib.request.Request(url, headers={
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
    'Authorization': f'Bearer {token}'
})

try:
    with urllib.request.urlopen(req) as response:
        items = json.loads(response.read().decode('utf-8'))
        print(f'Total Supabase inventory items: {len(items)}')
        sold_sum = sum(int(i.get('quantity_sold') or 0) for i in items)
        print(f'Total quantity_sold in Supabase: {sold_sum}')
        with_sold = [i for i in items if int(i.get('quantity_sold') or 0) > 0]
        print(f'Items with quantity_sold > 0: {len(with_sold)}')
        for it in with_sold[:5]:
            print('  -', it.get('title'), 'sold:', it.get('quantity_sold'))
except Exception as e:
    print('Error:', e)
