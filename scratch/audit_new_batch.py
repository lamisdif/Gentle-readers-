import openpyxl, json

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
ws = wb['NEW BATCH']

headers = [cell for cell in next(ws.iter_rows(min_row=1, max_row=1, values_only=True))]
print("Headers:", headers)

rows = []
for r_idx, r in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
    row_dict = {headers[i]: r[i] for i in range(len(headers)) if i < len(r)}
    title = str(row_dict.get('Title') or '').strip()
    if title:
        rows.append((r_idx, row_dict))

print(f"Total non-empty NEW BATCH rows: {len(rows)}")

total_copies = 0
total_purchase_cost = 0.0
titles_list = []
unpriced_titles = []
duplicates = {}

for r_idx, r in rows:
    title = str(r.get('Title') or '').strip()
    author = str(r.get('Author') or '').strip()
    supplier = str(r.get('Supplier') or '').strip()
    qty_received = r.get('Quantity received')
    qty_sold = r.get('Quantity sold') or 0
    qty_damaged = r.get('Quantity damaged') or 0
    current_qty = r.get('Current quantity')
    unit_cost = r.get('Unit purchase cost (DA)')
    selling_price = r.get('Selling price (DA)')
    total_batch_cost = r.get('Total batch cost (DA)')
    notes = str(r.get('Notes') or '').strip()

    qty = int(qty_received) if qty_received is not None else 0
    total_copies += qty

    if unit_cost is not None:
        cost = float(unit_cost)
        total_purchase_cost += qty * cost
    else:
        unpriced_titles.append((r_idx, title))

    if title in duplicates:
        duplicates[title].append(r_idx)
    else:
        duplicates[title] = [r_idx]

    titles_list.append({
        'row': r_idx,
        'title': title,
        'author': author,
        'supplier': supplier,
        'quantity_purchased': qty,
        'quantity_remaining': current_qty if current_qty is not None else qty,
        'unit_purchase_cost_da': unit_cost,
        'total_line_cost': (qty * float(unit_cost)) if unit_cost is not None else 0,
        'selling_price_da': selling_price,
        'notes': notes
    })

print(f"Total distinct titles: {len(duplicates)}")
print(f"Total copies purchased: {total_copies}")
print(f"Total original purchase cost: {total_purchase_cost:,.2f} DA")
print(f"Unpriced titles count: {len(unpriced_titles)}")
for up in unpriced_titles:
    print(f"  Unpriced: Row {up[0]}: {up[1]}")

dup_found = {k: v for k, v in duplicates.items() if len(v) > 1}
print(f"Duplicates found: {len(dup_found)}")
for k, v in dup_found.items():
    print(f"  Duplicate: '{k}' in rows {v}")

print("\nAll 40 NEW BATCH titles:")
for idx, t in enumerate(titles_list, start=1):
    print(f"{idx}. Row {t['row']}: '{t['title']}' by '{t['author']}' | Supplier: {t['supplier']} | Qty: {t['quantity_purchased']} | Cost: {t['unit_purchase_cost_da']} DA | Total: {t['total_line_cost']:,.2f} DA | Sell: {t['selling_price_da']} DA | Notes: {t['notes']}")
