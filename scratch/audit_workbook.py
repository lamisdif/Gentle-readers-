import openpyxl

wb_path = r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx'
wb = openpyxl.load_workbook(wb_path, data_only=True)

print("WORKBOOK FILENAME:", wb_path)
print("SHEETS DETECTED:", wb.sheetnames)

for sname in wb.sheetnames:
    ws = wb[sname]
    all_rows = list(ws.iter_rows(values_only=True))
    non_empty = [r for r in all_rows if any(c is not None and str(c).strip() != '' for c in r)]
    print(f"\n--- SHEET: {sname} ---")
    print(f"Total raw rows: {len(all_rows)} | Non-empty rows: {len(non_empty)}")
    if non_empty:
        print("Header row:", non_empty[0])
        print(f"First 3 data rows:")
        for r in non_empty[1:4]:
            print("  ", r)
