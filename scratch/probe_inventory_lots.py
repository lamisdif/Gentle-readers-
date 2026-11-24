import urllib.request, json
from collections import Counter

with open('scratch/owner_jwt.txt', 'r') as f:
    token = f.read().strip()

SUPABASE_URL = 'https://fsximdllrhglabxbqvay.supabase.co'
ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'

url = f'{SUPABASE_URL}/rest/v1/inventory_items?select=id,title,stock_group,batch_id,quantity_received,quantity_on_hand,unit_purchase_cost_da,acquisition_date'
req = urllib.request.Request(url, headers={'apikey': ANON_KEY, 'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(req) as resp:
    items = json.loads(resp.read().decode())

titles = [i['title'].strip() for i in items]
counts = Counter(titles)
duplicates = {t: c for t, c in counts.items() if c > 1}
print(f'Titles appearing multiple times across batches/stock_groups: {len(duplicates)}')
for t, c in list(duplicates.items())[:5]:
    matched = [i for i in items if i['title'].strip() == t]
    print(f'  Title: "{t}"')
    for m in matched:
        print(f'    - StockGroup: {m["stock_group"]}, Batch: {m["batch_id"]}, Qty: {m["quantity_received"]}, Cost: {m["unit_purchase_cost_da"]}, Date: {m["acquisition_date"]}')
