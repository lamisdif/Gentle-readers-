import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)
print("Sheet names:", wb.sheetnames)

for name in wb.sheetnames:
    sheet = wb[name]
    rows = list(sheet.iter_rows(values_only=True))
    non_empty = [r for r in rows if any(c is not None and str(c).strip() != '' for c in r)]
    print(f"\nSheet '{name}': total rows={len(rows)}, non-empty rows={len(non_empty)}")
    if len(rows) > 0:
        print("  Row 1 (headers):", rows[0][:10])
    if len(rows) > 1:
        print("  Row 2 (first data):", rows[1][:10])
