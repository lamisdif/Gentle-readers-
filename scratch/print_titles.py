import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws = wb['NEW BATCH']

headers = [cell.value for cell in ws[1]]

rows = []
for row in ws.iter_rows(min_row=2, values_only=True):
    title = row[2]
    if not title or str(title).strip() == '':
        continue
    rows.append({
        'supplier': str(row[0] or '').strip(),
        'date': str(row[1] or '').strip(),
        'title': str(title).strip(),
        'author': str(row[3] or '').strip(),
        'isbn': str(row[4] or '').strip(),
        'category': str(row[5] or '').strip(),
        'qty_rec': int(row[6]) if row[6] is not None else 0,
        'sold': int(row[7]) if row[7] is not None else 0,
        'damaged': int(row[8]) if row[8] is not None else 0,
        'curr_qty': int(row[9]) if row[9] is not None else 0,
        'total_cost': float(row[10]) if row[10] is not None else 0.0,
        'unit_cost': float(row[11]) if row[11] is not None else 0.0,
        'price': float(row[12]) if row[12] is not None else 0.0,
        'notes': str(row[13] or '').strip(),
        'batch': str(row[14] or '').strip(),
    })

print(f"Total titles: {len(rows)}")
total_copies = sum(r['qty_rec'] for r in rows)
total_cost_calc = sum(r['qty_rec'] * r['unit_cost'] for r in rows)
total_remaining = sum(r['curr_qty'] for r in rows)
total_val_remaining = sum(r['curr_qty'] * r['unit_cost'] for r in rows)

print(f"Total copies: {total_copies}")
print(f"Total purchase cost (sum qty * unit_cost): {total_cost_calc:.2f} DA")
print(f"Total remaining copies: {total_remaining}")
print(f"Total value remaining: {total_val_remaining:.2f} DA")

print("\n--- DETAILED TITLE BREAKDOWN ---")
for i, r in enumerate(rows, 1):
    subtotal = r['qty_rec'] * r['unit_cost']
    print(f"{i:2d}. {r['title']} | Author: {r['author']} | Supplier: {r['supplier']} | Qty: {r['qty_rec']} | Cost/unit: {r['unit_cost']:.2f} DA | Total: {subtotal:.2f} DA | Price: {r['price']:.0f} DA | Remaining: {r['curr_qty']}")
