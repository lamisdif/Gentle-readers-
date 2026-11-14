import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
sheet_os = wb['OLD STOCK']
rows_os = list(sheet_os.iter_rows(values_only=True))[1:48] # 47 rows

titles = {}
isbns = {}

print("Checking 47 rows of OLD STOCK for internal duplicates:")
for idx, r in enumerate(rows_os, start=2):
    title = str(r[0] or '').strip()
    author = str(r[1] or '').strip()
    isbn = str(r[2] or '').strip() if r[2] is not None else None
    qty = r[4]
    cost = r[5]
    price = r[6]
    
    t_lower = title.lower()
    if t_lower in titles:
        print(f"DUPLICATE TITLE IN EXCEL: '{title}' on Row {idx} and Row {titles[t_lower]['row']}")
    else:
        titles[t_lower] = {'row': idx, 'title': title, 'author': author, 'isbn': isbn, 'qty': qty, 'cost': cost, 'price': price}

    if isbn and isbn != 'None':
        if isbn in isbns:
            print(f"DUPLICATE ISBN IN EXCEL: ISBN {isbn} on Row {idx} ('{title}') and Row {isbns[isbn]['row']} ('{isbns[isbn]['title']}')")
        else:
            isbns[isbn] = {'row': idx, 'title': title}

print(f"Total rows examined: {len(rows_os)}")
print(f"Total distinct titles in OLD STOCK: {len(titles)}")
print(f"Total copies: {sum(int(r[4] or 0) for r in rows_os)}")
