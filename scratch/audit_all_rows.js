const fs = require('fs');
const XLSX = require('../public/manager/vendor/xlsx.full.min.js');

const workbookPath = 'C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx';
const buf = fs.readFileSync(workbookPath);
const wb = XLSX.read(buf, { type: 'buffer' });

function safeCellString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function safeCellNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  const cleaned = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

const newBatchSheet = wb.Sheets['NEW BATCH'];
const newBatchRows = XLSX.utils.sheet_to_json(newBatchSheet, { defval: null });

console.log('--- ALL 40 TITLES IN NEW BATCH ---');
let totalRec = 0;
let totalCost = 0;
let rowNum = 1;

newBatchRows.forEach((r, idx) => {
  const title = safeCellString(r['Title'] || r['اسم الكتاب'] || r['book_title']);
  if (!title) return;

  const author = safeCellString(r['Author'] || r['المؤلف']);
  const supplier = safeCellString(r['Supplier'] || r['المورد']);
  const qtyRec = Math.max(1, parseInt(r['Quantity received'] || r['quantity'] || r['qty']) || 1);
  const cost = safeCellNumber(r['Unit purchase cost (DA)'] || r['Unit purchase cost'] || r['purchase cost'] || r['cost']);
  const price = safeCellNumber(r['Selling price (DA)'] || r['Selling price'] || r['price']);

  const rowCost = (cost !== null) ? (qtyRec * cost) : 0;
  totalRec += qtyRec;
  totalCost += rowCost;

  console.log(`${rowNum}. [${supplier}] "${title}" by ${author || '-'} | Qty: ${qtyRec} | Unit Cost: ${cost} DA | Selling Price: ${price} DA | Total: ${rowCost} DA`);
  rowNum++;
});

console.log(`\nTOTAL NEW BATCH: ${rowNum - 1} titles, ${totalRec} copies, Total Cost: ${totalCost} DA`);

console.log('\n--- AUDITING OLD STOCK SHEET ---');
const oldStockSheet = wb.Sheets['OLD STOCK'];
const oldStockRows = XLSX.utils.sheet_to_json(oldStockSheet, { defval: null });

let oldTitles = 0;
let oldRec = 0;
let oldCost = 0;
let oldUnpriced = [];

oldStockRows.forEach((r, idx) => {
  const title = safeCellString(r['Title'] || r['اسم الكتاب'] || r['book_title']);
  if (!title) return;

  oldTitles++;
  const qtyRec = Math.max(1, parseInt(r['Quantity counted today'] || r['quantity'] || r['qty']) || 1);
  const cost = safeCellNumber(r['Original purchase cost per copy (DA)'] || r['Unit purchase cost'] || r['cost']);
  const price = safeCellNumber(r['Selling price (DA)'] || r['Selling price'] || r['price']);

  oldRec += qtyRec;
  if (cost !== null) {
    oldCost += (qtyRec * cost);
  } else {
    oldUnpriced.push({ title, row: idx + 2, price, qty: qtyRec });
  }
});

console.log(`TOTAL OLD STOCK: ${oldTitles} titles, ${oldRec} copies, Priced Valuation: ${oldCost} DA`);
console.log('Unpriced Old Stock titles:', oldUnpriced);
