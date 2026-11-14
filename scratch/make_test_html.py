import asyncio
import json
import base64
import urllib.request

# Let's read the xlsx file as base64
with open(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

test_html = f"""<!DOCTYPE html>
<html>
<head>
<script src="/public/manager/vendor/xlsx.full.min.js"></script>
</head>
<body>
<div id="output">Running...</div>
<script>
window.testResults = {{}};
try {{
    const b64 = "{b64_data}";
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    const wb = XLSX.read(bytes, {{ type: 'array', cellDates: true }});
    window.testResults.sheetNames = wb.SheetNames;
    
    // Test parsing each sheet with sheet_to_json
    const parsedSheets = {{}};
    wb.SheetNames.forEach(name => {{
        const ws = wb.Sheets[name];
        const raw = XLSX.utils.sheet_to_json(ws, {{ header: 1, defval: null }});
        parsedSheets[name] = {{
            totalRows: raw.length,
            headerSample: raw[0],
            firstRow: raw[1]
        }};
    }});
    window.testResults.parsedSheets = parsedSheets;
    document.getElementById('output').textContent = JSON.stringify(window.testResults);
}} catch(err) {{
    window.testResults.error = err.message + "\\n" + err.stack;
    document.getElementById('output').textContent = JSON.stringify(window.testResults);
}}
</script>
</body>
</html>
"""

with open('scratch/test_xlsx_parse.html', 'w', encoding='utf-8') as f:
    f.write(test_html)

print("Created scratch/test_xlsx_parse.html")
