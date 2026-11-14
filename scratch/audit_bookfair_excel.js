const fs = require('fs');
const XLSX = require('../public/manager/vendor/xlsx.full.min.js');

const workbookPath = 'C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx';
const buf = fs.readFileSync(workbookPath);
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('Sheet Names:', wb.SheetNames);

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

// 1. Audit NEW BATCH
console.log('\n======================================================');
console.log('1. AUDIT OF NEW BATCH SHEET');
console.log('======================================================');
const newBatchSheet = wb.Sheets['NEW BATCH'];
const newBatchRows = XLSX.utils.sheet_to_json(newBatchSheet, { defval: null });

let newBatchTitleCount = 0;
let newBatchTotalUnitsReceived = 0;
let newBatchTotalUnitsSold = 0;
let newBatchTotalUnitsDamaged = 0;
let newBatchTotalPurchaseCost = 0;
let newBatchRemainingUnits = 0;
let newBatchRemainingValue = 0;
let newBatchUnpricedCount = 0;
const newBatchBySupplier = {};

newBatchRows.forEach((r, idx) => {
  const title = safeCellString(r['Title'] || r['اسم الكتاب'] || r['book_title']);
  if (!title) return; // Template or empty row

  newBatchTitleCount++;
  const qtyRec = Math.max(1, parseInt(r['Quantity received'] || r['quantity'] || r['qty']) || 1);
  const qtySold = Math.max(0, parseInt(r['Quantity sold'] || r['sold']) || 0);
  const qtyDamaged = Math.max(0, parseInt(r['Quantity damaged'] || r['damaged']) || 0);
  const cost = safeCellNumber(r['Unit purchase cost (DA)'] || r['Unit purchase cost'] || r['purchase cost'] || r['cost']);
  const price = safeCellNumber(r['Selling price (DA)'] || r['Selling price'] || r['price']);
  const supplier = safeCellString(r['Supplier'] || r['المورد'] || 'Book Fair Exhibitors') || 'Book Fair Exhibitors';

  newBatchTotalUnitsReceived += qtyRec;
  newBatchTotalUnitsSold += qtySold;
  newBatchTotalUnitsDamaged += qtyDamaged;

  const remaining = Math.max(0, qtyRec - qtySold - qtyDamaged);
  newBatchRemainingUnits += remaining;

  if (cost !== null) {
    const totalRowCost = qtyRec * cost;
    const remainingRowVal = remaining * cost;
    newBatchTotalPurchaseCost += totalRowCost;
    newBatchRemainingValue += remainingRowVal;

    if (!newBatchBySupplier[supplier]) {
      newBatchBySupplier[supplier] = { titles: 0, unitsReceived: 0, totalCost: 0 };
    }
    newBatchBySupplier[supplier].titles++;
    newBatchBySupplier[supplier].unitsReceived += qtyRec;
    newBatchBySupplier[supplier].totalCost += totalRowCost;
  } else {
    newBatchUnpricedCount++;
    console.log(`Unpriced NEW BATCH title: "${title}" on row ${idx + 2}`);
  }
});

console.log(`Titles count: ${newBatchTitleCount}`);
console.log(`Total units received: ${newBatchTotalUnitsReceived}`);
console.log(`Total units sold: ${newBatchTotalUnitsSold}`);
console.log(`Total units damaged: ${newBatchTotalUnitsDamaged}`);
console.log(`Remaining physical units: ${newBatchRemainingUnits}`);
console.log(`Total purchase cost of ALL books bought: ${newBatchTotalPurchaseCost} DA`);
console.log(`Inventory value of REMAINING books at cost: ${newBatchRemainingValue} DA`);
console.log(`Unpriced titles: ${newBatchUnpricedCount}`);
console.log('\nBreakdown by Supplier:');
console.table(newBatchBySupplier);

// 2. Audit DEBTS Sheet
console.log('\n======================================================');
console.log('2. AUDIT OF DEBTS SHEET');
console.log('======================================================');
const debtsSheet = wb.Sheets['DEBTS'];
const debtsRows = XLSX.utils.sheet_to_json(debtsSheet, { defval: null });
console.table(debtsRows.filter(r => safeCellString(r['Creditor / person'] || r['creditor'])));

// 3. Audit OPENING POSITION Sheet
console.log('\n======================================================');
console.log('3. AUDIT OF OPENING POSITION SHEET');
console.log('======================================================');
const openingSheet = wb.Sheets['OPENING POSITION'];
const openingRows = XLSX.utils.sheet_to_json(openingSheet, { defval: null });
console.table(openingRows);

// 4. Audit READ ME Sheet
console.log('\n======================================================');
console.log('4. AUDIT OF READ ME / INSTRUCTIONS SHEET');
console.log('======================================================');
if (wb.Sheets['READ ME']) {
  const readMeRows = XLSX.utils.sheet_to_json(wb.Sheets['READ ME'], { defval: null });
  console.log('READ ME lines sample:');
  console.log(readMeRows.slice(0, 15));
}
