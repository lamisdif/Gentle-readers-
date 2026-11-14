import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
sheet_nb = wb['NEW BATCH']
rows_nb = list(sheet_nb.iter_rows(values_only=True))

headers = rows_nb[0]
print("Index map for NEW BATCH:")
for idx, h in enumerate(headers):
    print(f"  [{idx}] {h}")

total_qty = 0
total_cost = 0.0
total_revenue = 0.0

for r_idx, r in enumerate(rows_nb[1:41], start=2):
    title = r[2]
    author = r[3]
    isbn = r[4]
    qty_rec = r[6]
    qty_sold = r[7]
    qty_dam = r[8]
    cur_qty = r[9]
    tot_cost = r[10]
    unit_cost = r[11]
    unit_price = r[12]

    # Calculate row cost
    if unit_cost is not None:
        c = float(unit_cost) * int(qty_rec)
    elif tot_cost is not None:
        c = float(tot_cost)
    else:
        c = 0.0
    
    rev = float(unit_price) * int(qty_rec) if unit_price is not None else 0.0

    total_qty += int(qty_rec)
    total_cost += c
    total_revenue += rev

print(f"\nNEW BATCH Summary (40 titles):")
print(f"  Total Copies: {total_qty}")
print(f"  Total Purchase Cost: {total_cost:,.2f} DA")
print(f"  Average Purchase Cost / Unit: {total_cost/total_qty:,.2f} DA")
print(f"  Total Expected Sales Revenue: {total_revenue:,.2f} DA")
print(f"  Expected Profit: {total_revenue - total_cost:,.2f} DA")
print(f"  Expected Gross Margin: {((total_revenue - total_cost)/total_revenue)*100:.2f}%")
