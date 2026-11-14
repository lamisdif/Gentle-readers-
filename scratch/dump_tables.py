import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)

# 1. NEW BATCH
ws_nb = wb['NEW BATCH']
nb_rows = list(ws_nb.iter_rows(values_only=True))
nb_headers = nb_rows[0]
print("=== NEW BATCH TITLES ===")
nb_tot_cost = 0
nb_tot_rev = 0
nb_tot_qty = 0

for idx, r in enumerate(nb_rows[1:41], start=2):
    supp = r[0]
    date = r[1]
    title = r[2]
    author = r[3]
    isbn = r[4]
    cat = r[5]
    qty_rec = int(r[6] or 0)
    qty_sold = int(r[7] or 0)
    qty_cur = int(r[9] or qty_rec)
    tot_cost = float(r[10] or 0)
    unit_cost = float(r[11] or 0)
    price = float(r[12] or 0)
    
    exp_rev = qty_cur * price
    exp_prof = exp_rev - tot_cost
    margin = (exp_prof / exp_rev * 100) if exp_rev > 0 else 0
    
    nb_tot_qty += qty_cur
    nb_tot_cost += tot_cost
    nb_tot_rev += exp_rev
    
print(f"NEW BATCH Totals: Qty={nb_tot_qty}, Cost={nb_tot_cost:.2f}, Rev={nb_tot_rev:.2f}, Profit={nb_tot_rev - nb_tot_cost:.2f}")

# 2. OLD STOCK
ws_os = wb['OLD STOCK']
os_rows = list(ws_os.iter_rows(values_only=True))
print("\n=== OLD STOCK TITLES ===")
os_tot_qty = 0
os_tot_cost = 0
os_tot_rev = 0
os_unpriced = []

for idx, r in enumerate(os_rows[1:48], start=2):
    title = r[0]
    author = r[1]
    isbn = r[2]
    cat = r[3]
    qty = int(r[4] or 0)
    unit_cost = r[5]
    price = r[6]
    cond = r[7]
    notes = r[8]
    
    os_tot_qty += qty
    if unit_cost is not None and price is not None:
        c = float(unit_cost) * qty
        rev = float(price) * qty
        os_tot_cost += c
        os_tot_rev += rev
    else:
        os_unpriced.append((idx, title, qty))

print(f"OLD STOCK Priced Totals: Qty={os_tot_qty - 1}, Cost={os_tot_cost:.2f}, Rev={os_tot_rev:.2f}, Profit={os_tot_rev - os_tot_cost:.2f}")
print("Unpriced:", os_unpriced)

# 3. ACCESSORIES
ws_acc = wb['Sheet1']
acc_rows = list(ws_acc.iter_rows(values_only=True))
print("\n=== ACCESSORIES ===")
for idx, r in enumerate(acc_rows[1:8], start=2):
    prod = r[0]
    cat = r[1]
    qty = r[2]
    cost = r[3]
    price = r[4]
    supp = r[5]
    print(f"Row {idx}: {prod} | cat={cat} | qty={qty} | cost={cost} | price={price} | supp={supp}")
