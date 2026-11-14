import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws_os = wb['OLD STOCK']

print("Row | Title | Qty | Unit Cost | Total Cost | Unit Price | Total Price | Profit | Margin")
tot_qty = 0
tot_cost = 0
tot_rev = 0

for r in range(2, 49):
    title = ws_os.cell(r, 1).value
    qty = ws_os.cell(r, 5).value or 0
    cost = ws_os.cell(r, 6).value
    price = ws_os.cell(r, 7).value
    
    tot_qty += qty
    
    if cost is not None and price is not None:
        c = float(cost)
        p = float(price)
        tc = qty * c
        tp = qty * p
        prof = tp - tc
        tot_cost += tc
        tot_rev += tp
        margin = (prof / tp * 100) if tp > 0 else 0
        print(f"{r:2d} | {str(title)[:20]:20s} | {qty:2d} | {c:7.2f} | {tc:8.2f} | {p:7.2f} | {tp:8.2f} | {prof:7.2f} | {margin:4.1f}%")
    else:
        print(f"{r:2d} | {str(title)[:20]:20s} | {qty:2d} | {'NULL':7s} | {'NULL':8s} | {'NULL':7s} | {'NULL':8s} | {'NULL':7s} | N/A")

print("---")
print(f"Total Titles: 47")
print(f"Total Counted Copies: {tot_qty}")
print(f"Total Purchase Cost (Priced 60 copies): {tot_cost:,.2f} DA")
print(f"Total Selling Value (Priced 60 copies): {tot_rev:,.2f} DA")
print(f"Total Expected Profit: {tot_rev - tot_cost:,.2f} DA")
