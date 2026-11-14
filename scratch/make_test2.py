with open('scratch/test_xlsx_parse.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's replace the script to test sheetToJsonAuto and the exact manager.js logic
test_script = """
function safeCellString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function safeCellNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

function getRowColumn(row, candidates) {
  if (!row || typeof row !== 'object') return null;
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const target = safeCellString(candidate).toLowerCase();
    for (const key of keys) {
      if (safeCellString(key).toLowerCase() === target) {
        if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key];
      }
    }
    for (const key of keys) {
      if (safeCellString(key).toLowerCase().includes(target)) {
        if (row[key] !== null && row[key] !== undefined && row[key] !== '') return row[key];
      }
    }
  }
  return null;
}

function sheetToJsonAuto(ws, headerKeywords = []) {
  if (!ws) return [];
  const raw2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (raw2D.length === 0) return [];

  let headerRowIndex = 0;
  if (headerKeywords && headerKeywords.length > 0) {
    for (let r = 0; r < Math.min(raw2D.length, 25); r++) {
      const row = raw2D[r];
      if (Array.isArray(row)) {
        const rowStr = row.map(c => safeCellString(c).toLowerCase()).join(' ');
        const matches = headerKeywords.filter(kw => rowStr.includes(kw.toLowerCase()));
        if (matches.length >= 1) {
          headerRowIndex = r;
          break;
        }
      }
    }
  }

  return XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: null });
}

const b64 = "__B64__";
const binStr = atob(b64);
const bytes = new Uint8Array(binStr.length);
for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
const wb = XLSX.read(bytes, { type: 'array', cellDates: true });

const results = {};
for (const sName of wb.SheetNames) {
    const json = sheetToJsonAuto(wb.Sheets[sName], ['title', 'product', 'supplier', 'author', 'item', 'creditor', 'عنوان', 'مورد']);
    results[sName] = {
        rowCount: json.length,
        keys: json.length > 0 ? Object.keys(json[0]) : [],
        sampleFirstRow: json.length > 0 ? json[0] : null
    };
}
document.getElementById('output').textContent = JSON.stringify(results, null, 2);
"""

import base64
with open(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

test_script = test_script.replace('__B64__', b64_data)

full_html = f"""<!DOCTYPE html>
<html>
<head><script src="/public/manager/vendor/xlsx.full.min.js"></script></head>
<body><pre id="output"></pre><script>{test_script}</script></body>
</html>"""

with open('scratch/test_sheet_to_json.html', 'w', encoding='utf-8') as f:
    f.write(full_html)
print("Created scratch/test_sheet_to_json.html")
