import openpyxl, re

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws = wb['Sheet1']

rows = list(ws.iter_rows(values_only=True))
headers = rows[0]
print("Headers:", headers)

for idx, r in enumerate(rows[1:8], start=2):
    name = r[0]
    cat = r[1]
    qty = r[2]
    cost = r[3]
    price = r[4]
    supp = r[5]
    print(f"Row {idx}: {name} | Cat: {cat} | Qty: {qty} | Cost: {cost} | Price: {price}")
