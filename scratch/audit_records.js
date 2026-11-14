const fs = require('fs');
const XLSX = require('../public/manager/vendor/xlsx.full.min.js');

const filePath = 'C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

function safeStr(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function safeNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

const safeGetCol = (row, candidates) => {
  for (const c of candidates) {
    for (const k of Object.keys(row)) {
      const cleanK = String(k ?? '').trim().toLowerCase();
      const cleanC = String(c ?? '').trim().toLowerCase();
      if (cleanK === cleanC || cleanK.includes(cleanC)) {
        if (row[k] !== null && row[k] !== undefined && row[k] !== '') {
          return row[k];
        }
      }
    }
  }
  return null;
};

// Check all 40 NEW BATCH records
const newBatchRows = XLSX.utils.sheet_to_json(wb.Sheets['NEW BATCH'], { defval: null });
console.log('=== AUDIT OF ALL 40 NEW BATCH RECORDS ===');
const nbTitles = new Map();
let nbIssues = [];

newBatchRows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const rawTitle = safeGetCol(r, ['Title', 'عنوان', 'book_title']);
  const title = safeStr(rawTitle);
  if (!title) return;

  const author = safeStr(safeGetCol(r, ['Author', 'مؤلف', 'auteur']));
  const supplier = safeStr(safeGetCol(r, ['Supplier', 'مورد', 'fournisseur']));
  const qty = safeNum(safeGetCol(r, ['Quantity received', 'كمية', 'qty']));
  const unitCost = safeNum(safeGetCol(r, ['Unit purchase cost (DA)', 'سعر الشراء', 'cost']));
  const totalCost = safeNum(safeGetCol(r, ['Total batch cost (DA)']));
  const sellPrice = safeNum(safeGetCol(r, ['Selling price (DA)', 'سعر البيع', 'price']));

  if (nbTitles.has(title.toLowerCase())) {
    nbIssues.push(`Row ${rowNum}: Duplicate title in NEW BATCH: "${title}" (first seen row ${nbTitles.get(title.toLowerCase())})`);
  } else {
    nbTitles.set(title.toLowerCase(), rowNum);
  }

  if (qty === null || qty <= 0) {
    nbIssues.push(`Row ${rowNum}: "${title}" has invalid quantity: ${qty}`);
  }
  if (unitCost === null && totalCost === null) {
    nbIssues.push(`Row ${rowNum}: "${title}" has NULL unit and total cost`);
  }
});

console.log(`NEW BATCH issues found: ${nbIssues.length}`);
nbIssues.forEach(iss => console.log(' - ' + iss));

// Check all 47 OLD STOCK records
const oldStockRows = XLSX.utils.sheet_to_json(wb.Sheets['OLD STOCK'], { defval: null });
console.log('\n=== AUDIT OF ALL 47 OLD STOCK RECORDS ===');
const osTitles = new Map();
let osIssues = [];

oldStockRows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const rawTitle = safeGetCol(r, ['Title', 'عنوان', 'book_title']);
  const title = safeStr(rawTitle);
  if (!title) return;

  const author = safeStr(safeGetCol(r, ['Author', 'مؤلف', 'auteur']));
  const qty = safeNum(safeGetCol(r, ['Quantity counted today', 'كمية', 'qty']));
  const cost = safeNum(safeGetCol(r, ['Original purchase cost per copy (DA)', 'سعر الشراء', 'cost']));
  const sellPrice = safeNum(safeGetCol(r, ['Selling price (DA)', 'سعر البيع', 'price']));

  if (osTitles.has(title.toLowerCase())) {
    osIssues.push(`Row ${rowNum}: Duplicate title in OLD STOCK: "${title}" (first seen row ${osTitles.get(title.toLowerCase())})`);
  } else {
    osTitles.set(title.toLowerCase(), rowNum);
  }

  if (qty === null || qty <= 0) {
    osIssues.push(`Row ${rowNum}: "${title}" has invalid quantity: ${qty}`);
  }
  if (cost === null) {
    osIssues.push(`Row ${rowNum}: "${title}" has NULL purchase cost (Provisional margin)`);
  }
});

console.log(`OLD STOCK issues found: ${osIssues.length}`);
osIssues.forEach(iss => console.log(' - ' + iss));

// Cross-sheet duplicate titles
console.log('\n=== CROSS-SHEET OVERLAP (Titles in both NEW BATCH and OLD STOCK) ===');
let overlaps = [];
nbTitles.forEach((rowNb, tLower) => {
  if (osTitles.has(tLower)) {
    overlaps.push(`Title "${tLower}": in NEW BATCH (row ${rowNb}) and in OLD STOCK (row ${osTitles.get(tLower)})`);
  }
});
console.log(`Overlap count: ${overlaps.length}`);
overlaps.forEach(o => console.log(' - ' + o));
