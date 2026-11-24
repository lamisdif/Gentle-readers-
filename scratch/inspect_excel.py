import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\.gemini\antigravity\brain\98f29795-0abe-4d94-b04e-ec50b375ee18\.user_uploaded\media_1794075421146_d814f8cb.xlsx', data_only=True)
print("Sheet names:", wb.sheetnames)

for sname in wb.sheetnames:
    ws = wb[sname]
    print(f"\n--- Sheet: {sname} (max_row={ws.max_row}, max_column={ws.max_column}) ---")
    headers = [cell.value for cell in ws[1]]
    print("Headers:", headers)
    print("Sample row 2:", [cell.value for cell in ws[2]])
