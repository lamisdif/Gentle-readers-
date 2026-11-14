import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws = wb['OLD STOCK']
data = list(ws.iter_rows(values_only=True))
headers = [str(h).strip() if h is not None else '' for h in data[0]]

valid_rows = []
for i, r in enumerate(data[1:48], start=2):
    title = str(r[0] or '').strip()
    author = str(r[1] or '').strip()
    qty = r[4]
    cost = r[5]
    price = r[6]
    valid_rows.append((i, title, author, qty, cost, price))

print(f"Total valid books: {len(valid_rows)}")
for r in valid_rows:
    print(f"Row {r[0]:2d}: '{r[1]}' by '{r[2]}' | Qty: {r[3]} | Cost: {r[4]} | Price: {r[5]}")
