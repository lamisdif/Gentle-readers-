import urllib.request, json

with open('scratch/owner_jwt.txt') as f:
    token = f.read().strip()

SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q"

req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/inventory_items?select=*&limit=300", headers={
    'apikey': ANON_KEY,
    'Authorization': f'Bearer {token}'
})

try:
    with urllib.request.urlopen(req) as resp:
        items = json.loads(resp.read().decode())
        print(f"Total inventory items in Supabase: {len(items)}")
        
        by_group = {}
        for it in items:
            grp = it.get('stock_group') or 'UNKNOWN'
            by_group[grp] = by_group.get(grp, 0) + 1
        print("By stock group in DB:", by_group)

        # Check sample titles in DB
        new_in_db = [it for it in items if it.get('stock_group') == 'NEW_STOCK']
        old_in_db = [it for it in items if it.get('stock_group') == 'OLD_STOCK']
        print(f"NEW_STOCK count in DB: {len(new_in_db)}")
        print(f"OLD_STOCK count in DB: {len(old_in_db)}")

        print("\nFirst 10 NEW_STOCK items in DB:")
        for it in new_in_db[:10]:
            print(f"  {it.get('title')} | Qty: {it.get('quantity_received')} | Batch: {it.get('batch_id')} | Cost: {it.get('unit_purchase_cost_da')} | Created: {it.get('created_at')}")

        print("\nFirst 10 OLD_STOCK items in DB:")
        for it in old_in_db[:10]:
            print(f"  {it.get('title')} | Qty: {it.get('quantity_received')} | Batch: {it.get('batch_id')} | Cost: {it.get('unit_purchase_cost_da')} | Created: {it.get('created_at')}")

except Exception as e:
    print("Error fetching inventory_items:", e)
