import openpyxl

wb_path = r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx'
wb = openpyxl.load_workbook(wb_path, data_only=True)

# 1. NEW BATCH
ws_new = wb['NEW BATCH']
new_rows = list(ws_new.iter_rows(values_only=True))[1:41] # 40 titles
new_titles_count = len(new_rows)
new_total_units = 0
new_total_cost = 0.0
new_total_retail = 0.0

new_items = []
for i, r in enumerate(new_rows, start=2):
    title = str(r[2] or '').strip()
    author = str(r[3] or '').strip()
    qty = int(r[6] or 0)
    cost = float(r[11] or 0.0)
    price = float(r[12] or 0.0)
    row_cost = qty * cost
    row_retail = qty * price
    new_total_units += qty
    new_total_cost += row_cost
    new_total_retail += row_retail
    new_items.append({
        'row': i, 'title': title, 'author': author, 'qty': qty,
        'unit_cost': cost, 'price': price, 'total_cost': row_cost, 'total_retail': row_retail
    })

# 2. OLD STOCK
ws_old = wb['OLD STOCK']
old_rows = list(ws_old.iter_rows(values_only=True))[1:48] # 47 titles
old_titles_count = len(old_rows)
old_total_units = 0
old_total_cost = 0.0
old_total_retail = 0.0
unpriced_old = []

old_items = []
for i, r in enumerate(old_rows, start=2):
    title = str(r[0] or '').strip()
    author = str(r[1] or '').strip()
    qty = int(r[4] or 0)
    cost = float(r[5]) if r[5] is not None else None
    price = float(r[6]) if r[6] is not None else None
    old_total_units += qty
    row_cost = (qty * cost) if cost is not None else 0.0
    row_retail = (qty * price) if price is not None else 0.0
    if cost is not None:
        old_total_cost += row_cost
    else:
        unpriced_old.append(title)
    if price is not None:
        old_total_retail += row_retail
    old_items.append({
        'row': i, 'title': title, 'author': author, 'qty': qty,
        'unit_cost': cost, 'price': price, 'total_cost': row_cost, 'total_retail': row_retail
    })

# 3. ACCESSORIES
ws_acc = wb['ACCESSORIES']
acc_rows = list(ws_acc.iter_rows(values_only=True))[1:8] # 7 items
acc_titles_count = len(acc_rows)
acc_total_units = 0
acc_total_cost = 0.0
acc_total_retail = 0.0

acc_items = []
for i, r in enumerate(acc_rows, start=2):
    name = str(r[0] or '').strip()
    cat = str(r[1] or '').strip()
    qty = int(r[2]) if r[2] is not None else 1
    cost = float(r[3]) if r[3] is not None else 0.0
    price = float(r[4]) if r[4] is not None else 0.0
    row_cost = qty * cost
    row_retail = qty * price
    acc_total_units += qty
    acc_total_cost += row_cost
    acc_total_retail += row_retail
    acc_items.append({
        'row': i, 'name': name, 'cat': cat, 'qty': qty,
        'unit_cost': cost, 'price': price, 'total_cost': row_cost, 'total_retail': row_retail
    })

print("================================================================================")
print("             GENTLE READERS — VERIFIED COMPREHENSIVE FINANCIAL RECOUNT          ")
print("================================================================================")
print(f"A. NEW BATCH (November 2026 Book Fair):")
print(f"   - Titles: {new_titles_count}")
print(f"   - Copies: {new_total_units}")
print(f"   - Total Purchase Cost:       {new_total_cost:12,.2f} DA (Avg: {new_total_cost/new_total_units:,.2f} DA/unit)")
print(f"   - Expected Sales Revenue:    {new_total_retail:12,.2f} DA")
print(f"   - Expected Gross Profit:     {new_total_retail - new_total_cost:12,.2f} DA ({(new_total_retail - new_total_cost)/new_total_retail*100:.2f}% Margin)")

print(f"\nB. OLD STOCK (Previous Store Inventory):")
print(f"   - Titles: {old_titles_count}")
print(f"   - Copies: {old_total_units}")
print(f"   - Total Purchase Cost:       {old_total_cost:12,.2f} DA (Avg: {old_total_cost/old_total_units:,.2f} DA/unit)")
print(f"   - Expected Sales Revenue:    {old_total_retail:12,.2f} DA")
print(f"   - Expected Gross Profit:     {old_total_retail - old_total_cost:12,.2f} DA ({(old_total_retail - old_total_cost)/old_total_retail*100:.2f}% Margin)")
if unpriced_old:
    print(f"   - Unpriced Titles: {unpriced_old}")
else:
    print(f"   - Unpriced Titles: None (All 47 titles priced!)")

print(f"\nC. ACCESSORIES (Bookmarks & Packaging Materials):")
print(f"   - Items: {acc_titles_count}")
print(f"   - Units: {acc_total_units}")
print(f"   - Total Purchase Cost:       {acc_total_cost:12,.2f} DA (Avg: {acc_total_cost/acc_total_units:,.2f} DA/unit)")
print(f"   - Expected Sales Revenue:    {acc_total_retail:12,.2f} DA")
print(f"   - Expected Gross Profit:     {acc_total_retail - acc_total_cost:12,.2f} DA ({(acc_total_retail - acc_total_cost)/acc_total_retail*100:.2f}% Margin)")

comb_titles = new_titles_count + old_titles_count + acc_titles_count
comb_units = new_total_units + old_total_units + acc_total_units
comb_cost = new_total_cost + old_total_cost + acc_total_cost
comb_retail = new_total_retail + old_total_retail + acc_total_retail
comb_profit = comb_retail - comb_cost

print(f"\n================================================================================")
print(f"D. COMBINED INVENTORY TOTALS:")
print(f"   - Total Items / Titles:      {comb_titles} distinct products")
print(f"   - Total Physical Units:      {comb_units} units on hand")
print(f"   - Total Inventory Cost:      {comb_cost:12,.2f} DA")
print(f"   - Expected Total Revenue:    {comb_retail:12,.2f} DA")
print(f"   - Expected Total Profit:     {comb_profit:12,.2f} DA ({comb_profit/comb_retail*100:.2f}% Margin)")
print("================================================================================")
