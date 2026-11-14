import openpyxl
from collections import Counter

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws = wb['OLD STOCK']
rows = list(ws.iter_rows(values_only=True))[1:48]

titles = []
for i, r in enumerate(rows, start=2):
    t = str(r[0] or '').strip()
    a = str(r[1] or '').strip()
    qty = r[4]
    cost = r[5]
    price = r[6]
    titles.append((i, t, a, qty, cost, price))

print(f"Total populated book rows: {len(titles)}")
c = Counter([t[1].lower() for t in titles])
dups = {k: v for k, v in c.items() if v > 1}
print(f"Duplicate titles within OLD STOCK sheet: {dups}")

# Now check cross-sheet duplicates: between NEW BATCH and OLD STOCK!
ws_new = wb['NEW BATCH']
new_rows = list(ws_new.iter_rows(values_only=True))[1:41] # 40 titles in NEW BATCH
new_titles = []
for i, r in enumerate(new_rows, start=2):
    t = str(r[2] or '').strip()
    a = str(r[3] or '').strip()
    qty = r[6]
    cost = r[11]
    price = r[12]
    new_titles.append((i, t, a, qty, cost, price))

print(f"\nTotal populated NEW BATCH titles: {len(new_titles)}")

# Compare titles between OLD STOCK and NEW BATCH
old_set = {t[1].lower(): t for t in titles}
new_set = {t[1].lower(): t for t in new_titles}
common = set(old_set.keys()).intersection(set(new_set.keys()))
print(f"Titles present in BOTH NEW BATCH and OLD STOCK: {len(common)}")
for k in common:
    print(f"  Title in both: '{k}'")
    print(f"    In OLD STOCK: {old_set[k]}")
    print(f"    In NEW BATCH: {new_set[k]}")

# Check similar or approximate matches
print("\nChecking similar/sub-string titles between OLD STOCK and NEW BATCH:")
for ot in old_set.keys():
    for nt in new_set.keys():
        if ot != nt and (ot in nt or nt in ot):
            print(f"  Similar: OLD STOCK '{ot}' vs NEW BATCH '{nt}'")
