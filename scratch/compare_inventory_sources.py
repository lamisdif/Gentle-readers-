import openpyxl, urllib.request, json

# 1. Load Excel
wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws_new = wb['NEW BATCH']
ws_old = wb['OLD STOCK']

excel_new = []
for r in ws_new.iter_rows(min_row=2, values_only=True):
    title = str(r[2] or '').strip()
    if title:
        excel_new.append({
            'supplier': str(r[0] or '').strip(),
            'date': str(r[1] or '').strip(),
            'title': title,
            'author': str(r[3] or '').strip(),
            'isbn': str(r[4] or '').strip(),
            'category': str(r[5] or '').strip(),
            'qty_received': int(r[6]) if r[6] is not None else 0,
            'qty_sold': int(r[7] or 0),
            'qty_damaged': int(r[8] or 0),
            'current_qty': int(r[9]) if r[9] is not None else int(r[6] or 0),
            'total_batch_cost': float(r[10]) if r[10] is not None else 0.0,
            'unit_cost': float(r[11]) if r[11] is not None else None,
            'selling_price': float(r[12]) if r[12] is not None else None,
            'notes': str(r[13] or '').strip(),
            'batch': str(r[14] or '').strip()
        })

excel_old = []
for r in ws_old.iter_rows(min_row=2, values_only=True):
    title = str(r[0] or '').strip()
    if title:
        excel_old.append({
            'title': title,
            'author': str(r[1] or '').strip(),
            'isbn': str(r[2] or '').strip(),
            'category': str(r[3] or '').strip(),
            'qty_counted': int(r[4]) if r[4] is not None else 0,
            'original_cost': float(r[5]) if r[5] is not None else None,
            'selling_price': float(r[6]) if r[6] is not None else None,
            'condition': str(r[7] or '').strip(),
            'notes': str(r[8] or '').strip()
        })

print(f"Excel NEW BATCH: {len(excel_new)} titles")
print(f"Excel OLD STOCK: {len(excel_old)} titles")

# 2. Check overlap between Excel NEW BATCH and Excel OLD STOCK
overlap = []
old_titles_exact = {t['title'].lower(): t for t in excel_old}
for nb in excel_new:
    if nb['title'].lower() in old_titles_exact:
        overlap.append((nb, old_titles_exact[nb['title'].lower()]))

print(f"\nTitles present in BOTH NEW BATCH and OLD STOCK (exact name): {len(overlap)}")
for nb, os in overlap:
    print(f"  Title: '{nb['title']}'")
    print(f"    -> NEW BATCH: Author='{nb['author']}', Supplier='{nb['supplier']}', Qty={nb['qty_received']}, Cost={nb['unit_cost']} DA, Price={nb['selling_price']} DA")
    print(f"    -> OLD STOCK:  Author='{os['author']}', Qty={os['qty_counted']}, Cost={os['original_cost']} DA, Price={os['selling_price']} DA")

# 3. Fetch Supabase records
with open('scratch/owner_jwt.txt') as f:
    token = f.read().strip()

SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q"

req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/inventory_items?select=*&limit=500", headers={
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {token}'
})

with urllib.request.urlopen(req) as resp:
    db_items = json.loads(resp.read().decode())

print(f"\nTotal items in Supabase: {len(db_items)}")
db_new = [it for it in db_items if it.get('stock_group') == 'NEW_STOCK']
db_old = [it for it in db_items if it.get('stock_group') == 'OLD_STOCK']
print(f"Supabase NEW_STOCK rows: {len(db_new)}")
print(f"Supabase OLD_STOCK rows: {len(db_old)}")

# Compare Excel NEW BATCH vs DB NEW_STOCK
db_new_map = {it['title'].strip().lower(): it for it in db_new}
missing_in_db_new = [t for t in excel_new if t['title'].lower() not in db_new_map]
print(f"NEW BATCH titles missing from DB NEW_STOCK: {len(missing_in_db_new)}")
for m in missing_in_db_new:
    print("  Missing in DB NEW_STOCK:", m['title'])

# Compare quantities and costs for NEW BATCH
qty_cost_diffs = []
for t in excel_new:
    db_it = db_new_map.get(t['title'].lower())
    if db_it:
        db_qty = db_it.get('quantity_received') or 0
        db_cost = db_it.get('unit_purchase_cost_da')
        if db_qty != t['qty_received'] or db_cost != t['unit_cost']:
            qty_cost_diffs.append((t, db_it))

print(f"NEW BATCH titles with qty or cost diff vs DB: {len(qty_cost_diffs)}")
for t, db_it in qty_cost_diffs:
    print(f"  Diff for '{t['title']}': Excel qty={t['qty_received']} cost={t['unit_cost']} vs DB qty={db_it.get('quantity_received')} cost={db_it.get('unit_purchase_cost_da')}")
