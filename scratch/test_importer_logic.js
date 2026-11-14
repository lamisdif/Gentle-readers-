const fs = require('fs');
const XLSX = require('../public/manager/vendor/xlsx.full.min.js');

const filePath = 'C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

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

// Helper to convert sheet to JSON with auto header detection
function sheetToJsonAuto(ws, headerKeywords = []) {
  if (!ws) return [];
  // First, check raw 2D array
  const raw2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (raw2D.length === 0) return [];

  let headerRowIndex = 0;
  if (headerKeywords.length > 0) {
    for (let r = 0; r < Math.min(raw2D.length, 20); r++) {
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

// Test parsing
const parsed = {
  newBatch: sheetToJsonAuto(wb.Sheets['NEW BATCH'], ['title', 'supplier']),
  oldStock: sheetToJsonAuto(wb.Sheets['OLD STOCK'], ['title', 'author']),
  debts: sheetToJsonAuto(wb.Sheets['DEBTS'], ['creditor', 'amount']),
  opening: sheetToJsonAuto(wb.Sheets['OPENING POSITION'], ['item', 'amount'])
};

console.log('NEW BATCH parsed rows:', parsed.newBatch.length);
console.log('OLD STOCK parsed rows:', parsed.oldStock.length);
console.log('DEBTS parsed rows:', parsed.debts.length);
console.log('OPENING POSITION parsed rows:', parsed.opening.length);

// Test Preview Table Rendering logic
function simulatePreview(sheetName, rows) {
  let validCount = 0;
  let emptyTemplateCount = 0;
  let nullCostsCount = 0;
  const items = [];

  rows.forEach((r, idx) => {
    let title = '';
    let author = '';
    let qty = 0;
    let cost = null;
    let price = null;
    let supplier = '';

    if (sheetName === 'NEW BATCH') {
      title = safeCellString(getRowColumn(r, ['Title', 'اسم الكتاب', 'book_title', 'book']));
      author = safeCellString(getRowColumn(r, ['Author', 'المؤلف', 'مؤلف', 'auteur']));
      qty = safeCellNumber(getRowColumn(r, ['Quantity received', 'كمية مستلمة', 'quantity', 'qty', 'الكمية'])) || 0;
      cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'Unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء']));
      price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'selling', 'سعر البيع']));
      supplier = safeCellString(getRowColumn(r, ['Supplier', 'المورد', 'fournisseur', 'exhibitor']));
    } else if (sheetName === 'OLD STOCK') {
      title = safeCellString(getRowColumn(r, ['Title', 'اسم الكتاب', 'book_title', 'book']));
      author = safeCellString(getRowColumn(r, ['Author', 'المؤلف', 'مؤلف', 'auteur']));
      qty = safeCellNumber(getRowColumn(r, ['Quantity counted today', 'الكمية المحصية', 'quantity', 'qty', 'الكمية'])) || 0;
      cost = safeCellNumber(getRowColumn(r, ['Original purchase cost per copy (DA)', 'purchase cost', 'cost', 'سعر الشراء']));
      price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'selling', 'سعر البيع']));
      supplier = 'OLD_STOCK';
    }

    if (!title) {
      emptyTemplateCount++;
    } else {
      validCount++;
      if (cost === null) nullCostsCount++;
      items.push({ idx: idx + 2, title, author, qty, cost, price, supplier });
    }
  });

  return { validCount, emptyTemplateCount, nullCostsCount, items };
}

const nbResult = simulatePreview('NEW BATCH', parsed.newBatch);
console.log('\n--- NEW BATCH PREVIEW SIMULATION ---');
console.log(`Valid: ${nbResult.validCount}, Empty Template: ${nbResult.emptyTemplateCount}, Null Costs: ${nbResult.nullCostsCount}`);
console.log('Sample Row 6 (1984):', nbResult.items.find(i => i.title === '1984'));

const osResult = simulatePreview('OLD STOCK', parsed.oldStock);
console.log('\n--- OLD STOCK PREVIEW SIMULATION ---');
console.log(`Valid: ${osResult.validCount}, Empty Template: ${osResult.emptyTemplateCount}, Null Costs: ${osResult.nullCostsCount}`);
console.log('Sample with Null Cost:', osResult.items.find(i => i.cost === null));
