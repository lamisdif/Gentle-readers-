import urllib.request, json, re

SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q"

# Fetch orders
req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/orders?select=*")
req.add_header('apikey', ANON_KEY)
req.add_header('Authorization', f'Bearer {ANON_KEY}')
with urllib.request.urlopen(req) as resp:
    orders = json.loads(resp.read().decode())

# Fetch inventory from Supabase
with open('scratch/decompressed_token.txt') as f:
    token = f.read().strip()

req_inv = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/inventory_items?select=*")
req_inv.add_header('apikey', ANON_KEY)
req_inv.add_header('Authorization', f'Bearer {token}')
try:
    with urllib.request.urlopen(req_inv) as resp:
        inventory = json.loads(resp.read().decode())
except Exception as e:
    print("Could not fetch remote inventory, using Excel directly:", e)
    inventory = []

if not inventory:
    # Load from Excel
    import openpyxl
    wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
    inventory = []
    # NEW BATCH
    ws_new = wb['NEW BATCH']
    for r in ws_new.iter_rows(min_row=2, values_only=True):
        if r[2]: # Title
            inventory.append({
                'title': str(r[2]).strip(),
                'stock_group': 'NEW_STOCK',
                'unit_purchase_cost_da': float(r[11]) if r[11] is not None else None,
                'selling_price_da': float(r[12]) if r[12] is not None else None,
            })
    # OLD STOCK
    ws_old = wb['OLD STOCK']
    for r in ws_old.iter_rows(min_row=2, values_only=True):
        if r[0]: # Title
            inventory.append({
                'title': str(r[0]).strip(),
                'stock_group': 'OLD_STOCK',
                'unit_purchase_cost_da': float(r[5]) if r[5] is not None else None,
                'selling_price_da': float(r[6]) if r[6] is not None else None,
            })

print(f"Total inventory items loaded: {len(inventory)}")
title_map = {}
for itm in inventory:
    title_map[itm['title'].strip().lower()] = itm

sales_by_title = {}
total_sales_revenue = 0

for o in orders:
    total_price = float(o.get('total_price') or 0)
    total_sales_revenue += total_price
    items = o.get('items')
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except:
            items = [items]
    if not isinstance(items, list):
        items = [items] if items else []
    
    count = max(1, len(items))
    for it in items:
        if isinstance(it, dict):
            t = it.get('title') or it.get('name') or ''
            p = float(it.get('price') or (total_price / count))
            q = int(it.get('quantity') or it.get('qty') or 1)
        else:
            t = str(it).strip()
            p = total_price / count
            q = 1
        
        t_clean = t.strip()
        key = t_clean.lower()
        if key not in sales_by_title:
            matched = title_map.get(key)
            sales_by_title[key] = {
                'title': t_clean,
                'quantity_sold': 0,
                'revenue': 0,
                'matched': matched
            }
        sales_by_title[key]['quantity_sold'] += q
        sales_by_title[key]['revenue'] += (p * q)

matched_count = sum(1 for v in sales_by_title.values() if v['matched'] is not None)
print(f"Total sales revenue: {total_sales_revenue:,.2f} DA across {len(orders)} orders")
print(f"Total unique sold titles: {len(sales_by_title)}")
print(f"Titles matched directly with inventory cost: {matched_count}")

# Check with fuzzy match or normalization
def normalize(s):
    s = s.lower().replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[\s\-_ـ]+', '', s)

norm_map = {normalize(k): v for k, v in title_map.items()}

fuzzy_matched = 0
total_cogs_exact = 0
total_rev_exact = 0

for k, v in sales_by_title.items():
    inv_item = v['matched']
    if not inv_item:
        inv_item = norm_map.get(normalize(k))
    if inv_item:
        fuzzy_matched += 1
        cost = inv_item.get('unit_purchase_cost_da')
        if cost is not None:
            cogs = v['quantity_sold'] * cost
            total_cogs_exact += cogs
            total_rev_exact += v['revenue']

print(f"Titles matched after Arabic normalization: {fuzzy_matched} / {len(sales_by_title)}")
print(f"Matched revenue: {total_rev_exact:,.2f} DA")
print(f"Calculated COGS on matched: {total_cogs_exact:,.2f} DA")
if total_rev_exact > 0:
    print(f"Gross margin % on matched: {(total_rev_exact - total_cogs_exact) / total_rev_exact * 100:.1f}%")
