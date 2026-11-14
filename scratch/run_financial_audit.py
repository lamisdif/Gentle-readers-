import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)

print("="*80)
print("FINANCIAL AUDIT: GENTLE READERS INVENTORY WORKBOOK")
print("="*80)

# -----------------------------------------------------------------------------
# 1. NEW BATCH
# -----------------------------------------------------------------------------
ws_nb = wb['NEW BATCH']
nb_items = []
for r in range(2, ws_nb.max_row + 1):
    title = ws_nb.cell(r, 3).value
    if title is None or str(title).strip() == '':
        continue
    supplier = str(ws_nb.cell(r, 1).value or '').strip()
    author = str(ws_nb.cell(r, 4).value or '').strip()
    qty_rec = int(ws_nb.cell(r, 7).value or 0)
    qty_sold = int(ws_nb.cell(r, 8).value or 0)
    qty_dmg = int(ws_nb.cell(r, 9).value or 0)
    curr_qty = int(ws_nb.cell(r, 10).value or 0)
    total_cost_cell = ws_nb.cell(r, 11).value
    unit_cost_cell = ws_nb.cell(r, 12).value
    selling_price_cell = ws_nb.cell(r, 13).value
    notes = str(ws_nb.cell(r, 14).value or '').strip()
    
    unit_cost = float(unit_cost_cell) if unit_cost_cell is not None else None
    price = float(selling_price_cell) if selling_price_cell is not None else None
    
    nb_items.append({
        'row': r,
        'title': str(title).strip(),
        'author': author,
        'supplier': supplier,
        'qty_purchased': qty_rec,
        'qty_sold': qty_sold,
        'qty_damaged': qty_dmg,
        'qty_remaining': curr_qty,
        'unit_cost': unit_cost,
        'selling_price': price,
        'notes': notes
    })

print(f"\n1. NEW BATCH: {len(nb_items)} titles loaded.")

# -----------------------------------------------------------------------------
# 2. OLD STOCK
# -----------------------------------------------------------------------------
ws_os = wb['OLD STOCK']
os_items = []
for r in range(2, ws_os.max_row + 1):
    title = ws_os.cell(r, 1).value
    if title is None or str(title).strip() == '':
        continue
    author = str(ws_os.cell(r, 2).value or '').strip()
    category = str(ws_os.cell(r, 4).value or '').strip()
    qty_counted = int(ws_os.cell(r, 5).value or 0)
    unit_cost_cell = ws_os.cell(r, 6).value
    price_cell = ws_os.cell(r, 7).value
    condition = str(ws_os.cell(r, 8).value or '').strip()
    notes = str(ws_os.cell(r, 9).value or '').strip()
    
    unit_cost = float(unit_cost_cell) if unit_cost_cell is not None else None
    price = float(price_cell) if price_cell is not None else None
    
    os_items.append({
        'row': r,
        'title': str(title).strip(),
        'author': author,
        'category': category,
        'qty_purchased': qty_counted, # Counted physical inventory
        'qty_sold': 0,
        'qty_damaged': 0,
        'qty_remaining': qty_counted,
        'unit_cost': unit_cost,
        'selling_price': price,
        'condition': condition,
        'notes': notes
    })

print(f"2. OLD STOCK: {len(os_items)} titles loaded.")

# -----------------------------------------------------------------------------
# 3. ACCESSORIES (Sheet1)
# -----------------------------------------------------------------------------
ws_acc = wb['Sheet1']
acc_items = []
for r in range(2, ws_acc.max_row + 1):
    product = ws_acc.cell(r, 1).value
    if product is None or str(product).strip() == '':
        continue
    category = str(ws_acc.cell(r, 2).value or '').strip()
    qty_cell = ws_acc.cell(r, 3).value
    qty = int(qty_cell) if qty_cell is not None else None
    unit_cost_cell = ws_acc.cell(r, 4).value
    unit_cost = float(unit_cost_cell) if unit_cost_cell is not None else None
    price_cell = ws_acc.cell(r, 5).value
    price = float(price_cell) if price_cell is not None else None
    supplier = str(ws_acc.cell(r, 6).value or '').strip()
    
    acc_items.append({
        'row': r,
        'title': str(product).strip(),
        'category': category if category else ('packaging' if 'paper' in str(product).lower() else 'accessory'),
        'qty_purchased': qty,
        'qty_sold': 0,
        'qty_damaged': 0,
        'qty_remaining': qty,
        'unit_cost': unit_cost,
        'selling_price': price,
        'supplier': supplier
    })

print(f"3. ACCESSORIES (Sheet1): {len(acc_items)} items loaded.")

# -----------------------------------------------------------------------------
# Summary Functions
# -----------------------------------------------------------------------------
def analyze_category(name, items):
    total_qty_purchased = 0
    total_cost = 0.0
    missing_cost_items = []
    missing_price_items = []
    missing_qty_items = []
    
    total_remaining_qty = 0
    remaining_value_at_cost = 0.0
    expected_revenue = 0.0
    expected_profit = 0.0
    
    for it in items:
        q = it['qty_purchased']
        c = it['unit_cost']
        p = it['selling_price']
        rem = it['qty_remaining']
        
        if q is None:
            missing_qty_items.append(it['title'])
        else:
            total_qty_purchased += q
            
        if c is None:
            missing_cost_items.append(it['title'])
        elif q is not None:
            total_cost += q * c
            
        if rem is not None and c is not None:
            remaining_value_at_cost += rem * c
            
        if rem is not None and p is not None:
            expected_revenue += rem * p
            if c is not None:
                expected_profit += rem * (p - c)
        elif rem is not None and p is None:
            missing_price_items.append(it['title'])
            
    avg_unit_cost = (total_cost / total_qty_purchased) if total_qty_purchased > 0 else 0.0
    
    return {
        'name': name,
        'total_titles': len(items),
        'total_qty_purchased': total_qty_purchased,
        'total_cost': total_cost,
        'avg_unit_cost': avg_unit_cost,
        'total_remaining_qty': sum(it['qty_remaining'] for it in items if it['qty_remaining'] is not None),
        'remaining_value_at_cost': remaining_value_at_cost,
        'expected_revenue': expected_revenue,
        'expected_profit': expected_profit,
        'missing_cost': missing_cost_items,
        'missing_price': missing_price_items,
        'missing_qty': missing_qty_items
    }

nb_summary = analyze_category("NEW BATCH", nb_items)
os_summary = analyze_category("OLD STOCK", os_items)
acc_summary = analyze_category("ACCESSORIES", acc_items)

print("\n--- SUMMARY REPORT ---")
for s in [nb_summary, os_summary, acc_summary]:
    print(f"\n[{s['name']}]")
    print(f"  Titles: {s['total_titles']}")
    print(f"  Purchased Qty: {s['total_qty_purchased']}")
    print(f"  Purchase Cost: {s['total_cost']:,.2f} DA")
    print(f"  Average Unit Cost: {s['avg_unit_cost']:,.2f} DA")
    print(f"  Remaining Qty: {s['total_remaining_qty']}")
    print(f"  Remaining Value at Cost: {s['remaining_value_at_cost']:,.2f} DA")
    print(f"  Expected Revenue: {s['expected_revenue']:,.2f} DA")
    print(f"  Expected Profit: {s['expected_profit']:,.2f} DA")
    if s['missing_cost']:
        print(f"  Missing Cost: {s['missing_cost']}")
    if s['missing_price']:
        print(f"  Missing Price: {s['missing_price']}")
    if s['missing_qty']:
        print(f"  Missing Quantity: {s['missing_qty']}")
