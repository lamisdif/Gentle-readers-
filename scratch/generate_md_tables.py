import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)

# Generate detailed markdown for NEW BATCH
ws_nb = wb['NEW BATCH']
nb_rows = list(ws_nb.iter_rows(values_only=True))

print("### NEW BATCH Full Table")
print("| # | Title | Author | Supplier | Date | Qty | Unit Cost | Total Cost | Unit Price | Exp. Revenue | Exp. Gross Profit | Margin |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")

nb_tot_qty = 0
nb_tot_cost = 0
nb_tot_rev = 0
nb_tot_prof = 0

for i, r in enumerate(nb_rows[1:41], start=1):
    supp = str(r[0] or '-').strip()
    date = str(r[1] or '-').strip()[:10]
    title = str(r[2] or '').strip()
    author = str(r[3] or '-').strip()
    qty = int(r[6] or 0)
    tot_cost = float(r[10] or 0)
    unit_cost = float(r[11] or 0)
    price = float(r[12] or 0)
    rev = qty * price
    prof = rev - tot_cost
    margin = (prof / rev * 100) if rev > 0 else 0
    
    nb_tot_qty += qty
    nb_tot_cost += tot_cost
    nb_tot_rev += rev
    nb_tot_prof += prof
    
    print(f"| {i} | {title} | {author} | {supp} | {date} | {qty} | {unit_cost:,.2f} DA | {tot_cost:,.2f} DA | {price:,.2f} DA | {rev:,.2f} DA | {prof:,.2f} DA | {margin:.1f}% |")

print(f"TOTAL: Qty={nb_tot_qty}, Cost={nb_tot_cost:,.2f} DA, Rev={nb_tot_rev:,.2f} DA, Profit={nb_tot_prof:,.2f} DA, Margin={nb_tot_prof/nb_tot_rev*100:.2f}%")
