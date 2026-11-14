import base64

with open(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

test_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="/public/manager/vendor/xlsx.full.min.js"></script>
</head>
<body>
    <div id="output"></div>
    <script>
    function safeCellString(val) {{
      if (val === null || val === undefined) return '';
      return String(val).trim();
    }}

    function safeCellNumber(val) {{
      if (val === null || val === undefined || val === '') return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    }}

    function getRowColumn(row, candidates) {{
      if (!row || typeof row !== 'object') return null;
      const keys = Object.keys(row);
      for (const candidate of candidates) {{
        const target = safeCellString(candidate).toLowerCase();
        for (const key of keys) {{
          if (safeCellString(key).toLowerCase() === target) {{
            if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key];
          }}
        }}
        for (const key of keys) {{
          if (safeCellString(key).toLowerCase().includes(target)) {{
            if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key];
          }}
        }}
      }}
      return null;
    }}

    function detectSheetRole(sheetName, headers) {{
      const sLower = safeCellString(sheetName).toLowerCase();
      const hStr = headers.map(h => safeCellString(h).toLowerCase()).join(' ');

      if (sLower.includes('new batch') || (hStr.includes('supplier') && hStr.includes('date received') && hStr.includes('batch cost'))) {{
        return 'NEW BATCH';
      }}
      if (sLower.includes('old stock') || (hStr.includes('counted today') || hStr.includes('condition'))) {{
        return 'OLD STOCK';
      }}
      if (sLower.includes('accessor') || sLower.includes('bookmark') || sLower.includes('فواصل') || sLower.includes('إكسسوار') || sLower.includes('sheet1') || (hStr.includes('product') && (hStr.includes('category') || hStr.includes('quantity')))) {{
        return 'ACCESSORIES';
      }}
      if (sLower.includes('debt') || hStr.includes('creditor')) {{
        return 'DEBTS';
      }}
      if (sLower.includes('opening') || hStr.includes('cash available') || hStr.includes('item')) {{
        return 'OPENING POSITION';
      }}
      return 'OTHER';
    }}

    const b64 = "{b64_data}";
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    const wb = XLSX.read(bytes, {{ type: 'array', cellDates: true }});

    const parsedSheets = {{}};
    wb.SheetNames.forEach(sName => {{
        const ws = wb.Sheets[sName];
        const raw2D = XLSX.utils.sheet_to_json(ws, {{ header: 1, defval: null }});
        if (raw2D.length === 0) return;

        let headerRowIndex = 0;
        for (let r = 0; r < Math.min(raw2D.length, 15); r++) {{
            const row = raw2D[r];
            if (Array.isArray(row)) {{
                const nonNull = row.filter(c => c !== null && String(c).trim() !== '');
                if (nonNull.length >= 2) {{
                    headerRowIndex = r;
                    break;
                }}
            }}
        }}

        const headers = (raw2D[headerRowIndex] || []).map((h, i) => safeCellString(h) || ('Col_' + (i + 1)));
        const role = detectSheetRole(sName, headers);
        const rows = XLSX.utils.sheet_to_json(ws, {{ range: headerRowIndex, defval: null }});

        let validCount = 0;
        let emptyCount = 0;
        const warnings = [];

        rows.forEach((r, idx) => {{
            const rowNum = headerRowIndex + 2 + idx;
            r.__rowNum = rowNum;

            if (role === 'NEW BATCH') {{
                const title = safeCellString(getRowColumn(r, ['Title', 'عنوان', 'book_title', 'book']));
                if (!title) {{
                    emptyCount++;
                }} else {{
                    validCount++;
                    const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'cost']));
                    const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'price']));
                    if (cost === null) warnings.push(`Row ${{rowNum}}: "${{title}}" is missing Unit Purchase Cost.`);
                    if (price === null) warnings.push(`Row ${{rowNum}}: "${{title}}" is missing Selling Price.`);
                }}
            }} else if (role === 'OLD STOCK') {{
                const title = safeCellString(getRowColumn(r, ['Title', 'عنوان', 'book_title', 'book']));
                if (!title) {{
                    emptyCount++;
                }} else {{
                    validCount++;
                    const cost = safeCellNumber(getRowColumn(r, ['Original purchase cost per copy (DA)', 'cost']));
                    const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'price']));
                    if (cost === null) warnings.push(`Row ${{rowNum}}: "${{title}}" is missing Purchase Cost.`);
                    if (price === null) warnings.push(`Row ${{rowNum}}: "${{title}}" is missing Selling Price.`);
                }}
            }} else if (role === 'ACCESSORIES') {{
                const prod = safeCellString(getRowColumn(r, ['Product Name', 'Title', 'Product', 'Item', 'PRODUCT']));
                if (!prod) {{
                    emptyCount++;
                }} else {{
                    validCount++;
                    const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'unit purchase cost', 'cost']));
                    const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'selling price', 'price']));
                    const qty = safeCellNumber(getRowColumn(r, ['Quantity purchased', 'QUANTITY', 'qty']));
                    if (cost === null) warnings.push(`Row ${{rowNum}}: "${{prod}}" is missing Unit Purchase Cost.`);
                    if (price === null) warnings.push(`Row ${{rowNum}}: "${{prod}}" is missing Selling Price.`);
                    if (qty === null) warnings.push(`Row ${{rowNum}}: "${{prod}}" has no Quantity specified.`);
                }}
            }} else if (role === 'DEBTS') {{
                const creditor = safeCellString(getRowColumn(r, ['Creditor / person', 'creditor', 'دائن']));
                const amt = safeCellNumber(getRowColumn(r, ['Original amount (DA)', 'amount'])) || 0;
                if (!creditor || amt <= 0) emptyCount++;
                else validCount++;
            }} else if (role === 'OPENING POSITION') {{
                const item = safeCellString(getRowColumn(r, ['Item', 'بند']));
                if (!item) emptyCount++;
                else validCount++;
            }} else {{
                validCount = rows.length;
            }}
        }});

        parsedSheets[sName] = {{
            role: role,
            headerRow: headerRowIndex + 1,
            headers: headers,
            totalRows: rows.length,
            validCount: validCount,
            emptyCount: emptyCount,
            warnings: warnings
        }};
    }});

    document.getElementById('output').textContent = JSON.stringify(parsedSheets, null, 2);
    </script>
</body>
</html>
"""

with open('scratch/test_new_parser.html', 'w', encoding='utf-8') as f:
    f.write(test_html)

print("Created scratch/test_new_parser.html")
