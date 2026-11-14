import openpyxl

wb = openpyxl.load_workbook(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', data_only=True)

print("Worksheet Analysis:")
for sheetname in wb.sheetnames:
    ws = wb[sheetname]
    raw_rows = list(ws.iter_rows(values_only=True))
    if not raw_rows:
        print(f"Sheet {sheetname}: completely empty")
        continue
    
    # Header detection
    headers = None
    header_idx = 0
    for idx, row in enumerate(raw_rows[:10]):
        non_empty = [c for c in row if c is not None and str(c).strip() != '']
        if len(non_empty) >= 2:
            headers = [str(c).strip() if c is not None else f"Col_{i+1}" for i, c in enumerate(row)]
            header_idx = idx
            break
            
    headers_str = " ".join(headers).lower() if headers else ""
    
    # Classify
    role = "OTHER"
    if "new batch" in sheetname.lower() or ("supplier" in headers_str and "date received" in headers_str):
        role = "NEW BATCH"
    elif "old stock" in sheetname.lower() or ("counted today" in headers_str or "condition" in headers_str):
        role = "OLD STOCK"
    elif any(kw in sheetname.lower() for kw in ["accessor", "bookmark", "sheet1"]) or ("product" in headers_str and "category" in headers_str):
        role = "ACCESSORIES"
    elif "debt" in sheetname.lower() or "creditor" in headers_str:
        role = "DEBTS"
    elif "opening" in sheetname.lower() or "cash available" in headers_str:
        role = "OPENING POSITION"
        
    # Count populated rows
    populated_rows = []
    template_rows = []
    for r_i, r in enumerate(raw_rows[header_idx + 1:], start=header_idx + 2):
        non_empty = [c for c in r if c is not None and str(c).strip() != '']
        # Check if first cell or key cell has text
        first_val = str(r[0]).strip() if r[0] is not None else ""
        second_val = str(r[1]).strip() if len(r) > 1 and r[1] is not None else ""
        third_val = str(r[2]).strip() if len(r) > 2 and r[2] is not None else ""
        
        has_data = False
        if role == "NEW BATCH" and third_val != "": # Title is col 3
            has_data = True
        elif role == "OLD STOCK" and first_val != "": # Title is col 1
            has_data = True
        elif role == "ACCESSORIES" and first_val != "": # Product is col 1
            has_data = True
        elif role == "DEBTS" and first_val != "" and str(r[2] or 0) != "0": # Creditor is col 1, amount > 0
            has_data = True
        elif role == "OPENING POSITION" and first_val != "":
            has_data = True
        elif len(non_empty) >= 2:
            has_data = True
            
        if has_data:
            populated_rows.append((r_i, r))
        else:
            template_rows.append((r_i, r))
            
    print(f"\nSheet: [{sheetname}] -> Detected Role: {role}")
    print(f"  Headers ({len(headers)} cols): {headers}")
    print(f"  Populated Data Rows: {len(populated_rows)}")
    print(f"  Template / Empty Rows: {len(template_rows)}")
    if populated_rows:
        print(f"  Sample Row {populated_rows[0][0]}: {populated_rows[0][1][:6]}")
