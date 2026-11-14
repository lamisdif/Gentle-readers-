import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)

# 1. NEW BATCH
sheet_nb = wb['NEW BATCH']
rows_nb = list(sheet_nb.iter_rows(values_only=True))
headers_nb = rows_nb[0]
print("NEW BATCH Headers:", headers_nb)
valid_nb = []
empty_nb = []
for i, r in enumerate(rows_nb[1:], start=2):
    title = r[2] # Title is column 3 (index 2)
    if title is not None and str(title).strip() != '':
        valid_nb.append((i, r))
    else:
        empty_nb.append((i, r))

print(f"NEW BATCH: {len(valid_nb)} valid book rows, {len(empty_nb)} empty/template rows.")
print("First 3 valid NEW BATCH rows:")
for r in valid_nb[:3]:
    print(f"  Row {r[0]}: Title='{r[1][2]}', Author='{r[1][3]}', Qty={r[1][6]}, Cost={r[1][10] if len(r[1])>10 else 'N/A'}, Price={r[1][12] if len(r[1])>12 else 'N/A'}")
if empty_nb:
    print(f"Empty rows range from Row {empty_nb[0][0]} to Row {empty_nb[-1][0]}")

# 2. OLD STOCK
sheet_os = wb['OLD STOCK']
rows_os = list(sheet_os.iter_rows(values_only=True))
headers_os = rows_os[0]
print("\nOLD STOCK Headers:", headers_os)
valid_os = []
empty_os = []
for i, r in enumerate(rows_os[1:], start=2):
    title = r[0] # Title is column 1 (index 0)
    if title is not None and str(title).strip() != '':
        valid_os.append((i, r))
    else:
        empty_os.append((i, r))

print(f"OLD STOCK: {len(valid_os)} valid book rows, {len(empty_os)} empty/template rows.")
print("First 3 valid OLD STOCK rows:")
for r in valid_os[:3]:
    print(f"  Row {r[0]}: Title='{r[1][0]}', Author='{r[1][1]}', Qty={r[1][4]}, Cost={r[1][5]}, Price={r[1][6]}")
if empty_os:
    print(f"Empty rows range from Row {empty_os[0][0]} to Row {empty_os[-1][0]}")

# 3. ACCESSORIES
sheet_acc = wb['ACCESSORIES']
rows_acc = list(sheet_acc.iter_rows(values_only=True))
headers_acc = rows_acc[0]
print("\nACCESSORIES Headers:", headers_acc)
valid_acc = []
for i, r in enumerate(rows_acc[1:], start=2):
    prod = r[0]
    if prod is not None and str(prod).strip() != '':
        valid_acc.append((i, r))
print(f"ACCESSORIES: {len(valid_acc)} valid rows.")
for r in valid_acc:
    print(f"  Row {r[0]}: Product='{r[1][0]}', Cat='{r[1][1]}', Qty={r[1][2]}, Cost={r[1][3]}, Price={r[1][4]}")
