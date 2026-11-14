import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)

def safe_str(val):
    return '' if val is None else str(val).strip()

def safe_num(val):
    if val is None or val == '': return None
    try:
        f = float(str(val).replace(',', '').replace(' ', ''))
        return f
    except:
        return None

def get_col(row_dict, candidates):
    for c in candidates:
        for k in row_dict:
            if safe_str(k).lower() == c.lower():
                if row_dict[k] not in (None, ''): return row_dict[k]
        for k in row_dict:
            if c.lower() in safe_str(k).lower():
                if row_dict[k] not in (None, ''): return row_dict[k]
    return None

ws = wb['Sheet1']
data = list(ws.iter_rows(values_only=True))
headers = [safe_str(h) for h in data[0]]
rows = []
for r in data[1:]:
    row_dict = {headers[i]: r[i] for i in range(len(headers)) if i < len(r)}
    rows.append(row_dict)

accessories_count = 0
for r in rows:
    name = safe_str(get_col(r, ['Product Name', 'Title', 'Product', 'Item', 'PRODUCT', 'اسم المنتج', 'عنوان', 'منتج', 'الاسم']))
    if not name:
        continue
    cost = safe_num(get_col(r, ['Unit purchase cost (DA)', 'unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء']))
    price = safe_num(get_col(r, ['Selling price (DA)', 'selling price', 'price', 'سعر البيع']))
    raw_qty = get_col(r, ['Quantity purchased', 'QUANTITY', 'Quantity received', 'الكمية المشتراة', 'quantity', 'qty'])
    qty = int(raw_qty) if raw_qty and str(raw_qty).isdigit() else 1
    accessories_count += 1
    print(f'Acc {accessories_count}: name="{name}", cost={cost}, price={price}, qty={qty}')

print('Total accessories parsed:', accessories_count)
