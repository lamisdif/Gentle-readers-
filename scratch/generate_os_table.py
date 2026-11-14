import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws_os = wb['OLD STOCK']
os_rows = list(ws_os.iter_rows(values_only=True))

print("### OLD STOCK Full Table")
print("| # | Title | Author | Category | Counted Qty | Unit Cost | Total Cost | Unit Price | Exp. Revenue | Exp. Gross Profit | Margin | Status |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|")

os_tot_qty = 0
os_tot_cost = 0
os_tot_rev = 0
os_tot_prof = 0

for i, r in enumerate(os_rows[1:48], start=1):
    title = str(r[0] or '').strip()
    author = str(r[1] or '-').strip()
    cat = str(r[3] or '-').strip()
    qty = int(r[4] or 0)
    unit_cost = r[5]
    price = r[6]
    
    os_tot_qty += qty
    
    if unit_cost is not None and price is not None:
        uc = float(unit_cost)
        p = float(price)
        tc = qty * uc
        rev = qty * p
        prof = rev - tc
        margin = (prof / rev * 100) if rev > 0 else 0
        os_tot_cost += tc
        os_tot_rev += rev
        os_tot_prof += prof
        status = "Complete"
        cost_str = f"{uc:,.2f} DA"
        tcost_str = f"{tc:,.2f} DA"
        price_str = f"{p:,.2f} DA"
        rev_str = f"{rev:,.2f} DA"
        prof_str = f"{prof:,.2f} DA"
        margin_str = f"{margin:.1f}%"
    else:
        status = "⚠️ Missing Cost & Price"
        cost_str = "NULL"
        tcost_str = "NULL"
        price_str = "NULL"
        rev_str = "NULL"
        prof_str = "NULL"
        margin_str = "N/A"
        
    print(f"| {i} | {title} | {author} | {cat} | {qty} | {cost_str} | {tcost_str} | {price_str} | {rev_str} | {prof_str} | {margin_str} | {status} |")

print(f"\nOLD STOCK Priced Subtotal: Qty={os_tot_qty - 1}, Cost={os_tot_cost:,.2f} DA, Rev={os_tot_rev:,.2f} DA, Profit={os_tot_prof:,.2f} DA, Margin={os_tot_prof/os_tot_rev*100:.2f}%")
