import urllib.request, json, openpyxl, re

with open('scratch/owner_jwt.txt', 'r', encoding='utf-8') as f:
    token = f.read().strip()

headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
    'Authorization': f'Bearer {token}'
}

req = urllib.request.Request('https://fsximdllrhglabxbqvay.supabase.co/rest/v1/orders?select=*', headers=headers)
with urllib.request.urlopen(req) as resp:
    orders = json.loads(resp.read().decode('utf-8'))

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)

# Load NEW BATCH
ws_nb = wb['NEW BATCH']
nb_items = []
for r in range(2, 42):
    title = str(ws_nb.cell(r, 3).value or '').strip()
    qty = int(ws_nb.cell(r, 7).value or 0)
    cost = float(ws_nb.cell(r, 12).value or 0)
    price = float(ws_nb.cell(r, 13).value or 0)
    nb_items.append({
        'title': title,
        'author': str(ws_nb.cell(r, 4).value or '-').strip(),
        'stock_group': 'NEW_STOCK',
        'batch_id': 'batch-nov-2026',
        'quantity_received': qty,
        'quantity_sold': 0,
        'quantity_reserved': 0,
        'quantity_damaged': 0,
        'unit_purchase_cost_da': cost,
        'selling_price_da': price
    })

# Load OLD STOCK
ws_os = wb['OLD STOCK']
os_items = []
for r in range(2, 48):
    title = str(ws_os.cell(r, 1).value or '').strip()
    qty = int(ws_os.cell(r, 5).value or 0)
    cost = ws_os.cell(r, 6).value
    price = ws_os.cell(r, 7).value
    os_items.append({
        'title': title,
        'author': str(ws_os.cell(r, 2).value or '-').strip(),
        'stock_group': 'OLD_STOCK',
        'batch_id': 'default',
        'quantity_received': qty,
        'quantity_sold': 0,
        'quantity_reserved': 0,
        'quantity_damaged': 0,
        'unit_purchase_cost_da': float(cost) if cost is not None else None,
        'selling_price_da': float(price) if price is not None else None
    })

all_inventory = nb_items + os_items

# Test matching rule: Historical orders CANNOT match NEW_STOCK!
nb_valuation_cost = sum(i['quantity_received'] * i['unit_purchase_cost_da'] for i in nb_items)
nb_valuation_retail = sum(i['quantity_received'] * i['selling_price_da'] for i in nb_items)
nb_expected_profit = nb_valuation_retail - nb_valuation_cost

print(f"NEW BATCH Units: {sum(i['quantity_received'] for i in nb_items)}")
print(f"NEW BATCH Sold Units: 0")
print(f"NEW BATCH Total Purchase Cost: {nb_valuation_cost:,.2f} DA")
print(f"NEW BATCH Total Retail Selling Value (Selling Price * Copies): {nb_valuation_retail:,.2f} DA")
print(f"NEW BATCH Expected Gross Profit: {nb_expected_profit:,.2f} DA")
print(f"NEW BATCH Expected Profit Margin: {nb_expected_profit / nb_valuation_retail * 100:.2f}%")
