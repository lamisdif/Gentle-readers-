import openpyxl
from collections import Counter

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws = wb['OLD STOCK']
data = list(ws.iter_rows(values_only=True))
headers = [str(h).strip() if h is not None else '' for h in data[0]]
print('Headers:', headers)

rows = []
for i, r in enumerate(data[1:], start=2):
    if any(r):
        row_dict = {headers[j]: r[j] for j in range(len(headers)) if j < len(r)}
        row_dict['__rowNum'] = i
        rows.append(row_dict)

print(f'Total non-empty rows in OLD STOCK: {len(rows)}')

titles = []
for r in rows:
    title = str(r.get('Title') or '').strip()
    author = str(r.get('Author') or '').strip()
    qty = r.get('Quantity counted today')
    cost = r.get('Original purchase cost per copy (DA)')
    price = r.get('Selling price (DA)')
    titles.append((title, author, qty, cost, price, r['__rowNum']))

print(f'Total rows with titles: {len(titles)}')

# Check for duplicate titles
title_counts = Counter([t[0].lower() for t in titles])
duplicates = {t: c for t, c in title_counts.items() if c > 1}
print(f'Duplicate title names in Excel: {len(duplicates)}')
for d, count in duplicates.items():
    print(f'Duplicate "{d}": appeared {count} times:')
    for t in titles:
        if t[0].lower() == d:
            print(f'   Row {t[5]}: Title="{t[0]}", Author="{t[1]}", Qty={t[2]}, Cost={t[3]}, Price={t[4]}')

total_copies = sum(int(t[2]) for t in titles if t[2] is not None and str(t[2]).isdigit())
print(f'Total copies in Excel: {total_copies}')
print(f'Distinct titles count: {len(title_counts)}')
