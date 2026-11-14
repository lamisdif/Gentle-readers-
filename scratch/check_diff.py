import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
sheet_nb = wb['NEW BATCH']
rows_nb = list(sheet_nb.iter_rows(values_only=True))

sum_col_10 = 0.0 # Total batch cost (DA)
sum_col_11_times_qty = 0.0 # Unit purchase cost * qty

for r_idx, r in enumerate(rows_nb[1:41], start=2):
    title = r[2]
    qty = r[6]
    tot_cost = r[10]
    unit_cost = r[11]
    
    c10 = float(tot_cost) if tot_cost is not None else 0.0
    c11 = (float(unit_cost) * int(qty)) if unit_cost is not None else 0.0
    
    sum_col_10 += c10
    sum_col_11_times_qty += c11
    
    if abs(c10 - c11) > 0.01:
        print(f"Row {r_idx}: '{title}', Qty={qty}, Col 10 (Total Cost)={tot_cost}, Col 11 (Unit Cost)={unit_cost}, Unit*Qty={c11}, Diff={c10-c11}")

print(f"\nSum of Column 10 (Total batch cost): {sum_col_10:,.2f} DA")
print(f"Sum of Column 11 * Qty: {sum_col_11_times_qty:,.2f} DA")
