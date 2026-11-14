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

console.log('=== DETAILED WORKBOOK ANALYSIS ===\n');

// 1. Analyze NEW BATCH
const newBatchSheet = wb.Sheets['NEW BATCH'];
const newBatchRows = XLSX.utils.sheet_to_json(newBatchSheet, { defval: null });

console.log(`NEW BATCH: Total raw rows = ${newBatchRows.length}`);
let nbValid = 0;
let nbEmptyTemplate = 0;
let nbRowsWithData = [];
let nbInvalid = [];

newBatchRows.forEach((r, idx) => {
  const rowNum = idx + 2; // 1-based row index in Excel (row 1 is header)
  const title = safeStr(safeGetCol(r, ['Title', 'عنوان', 'book_title']));
  const author = safeStr(safeGetCol(r, ['Author', 'مؤلف', 'auteur']));
  const supplier = safeStr(safeGetCol(r, ['Supplier', 'مورد', 'fournisseur']));
  const qtyRec = safeNum(safeGetCol(r, ['Quantity received', 'كمية', 'qty']));
  const unitCost = safeNum(safeGetCol(r, ['Unit purchase cost (DA)', 'سعر الشراء', 'cost']));
  const sellPrice = safeNum(safeGetCol(r, ['Selling price (DA)', 'سعر البيع', 'price']));
  const notes = safeStr(safeGetCol(r, ['Notes', 'ملاحظات']));

  if (!title) {
    nbEmptyTemplate++;
  } else {
    nbValid++;
    nbRowsWithData.push({
      rowNum,
      title,
      titleType: typeof r['Title'],
      author,
      supplier,
      qtyRec,
      unitCost,
      sellPrice,
      notes
    });
  }
});

console.log(`NEW BATCH: Valid titled records = ${nbValid}, Empty/Template rows = ${nbEmptyTemplate}`);
console.log('First 5 valid NEW BATCH records:');
console.log(nbRowsWithData.slice(0, 5));
console.log('Sample record 1984:');
console.log(nbRowsWithData.find(r => r.title === '1984'));
console.log(`Last valid NEW BATCH record (Row ${nbRowsWithData[nbRowsWithData.length - 1]?.rowNum}):`, nbRowsWithData[nbRowsWithData.length - 1]);

// 2. Analyze OLD STOCK
const oldStockSheet = wb.Sheets['OLD STOCK'];
const oldStockRows = XLSX.utils.sheet_to_json(oldStockSheet, { defval: null });

console.log(`\nOLD STOCK: Total raw rows = ${oldStockRows.length}`);
let osValid = 0;
let osEmptyTemplate = 0;
let osRowsWithData = [];

oldStockRows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const title = safeStr(safeGetCol(r, ['Title', 'عنوان', 'book_title']));
  const author = safeStr(safeGetCol(r, ['Author', 'مؤلف', 'auteur']));
  const qty = safeNum(safeGetCol(r, ['Quantity counted today', 'كمية', 'qty']));
  const cost = safeNum(safeGetCol(r, ['Original purchase cost per copy (DA)', 'سعر الشراء', 'cost']));
  const sellPrice = safeNum(safeGetCol(r, ['Selling price (DA)', 'سعر البيع', 'price']));
  const condition = safeStr(safeGetCol(r, ['Condition', 'حالة']));
  const notes = safeStr(safeGetCol(r, ['Notes', 'ملاحظات']));

  if (!title) {
    osEmptyTemplate++;
  } else {
    osValid++;
    osRowsWithData.push({
      rowNum,
      title,
      author,
      qty,
      cost,
      sellPrice,
      condition,
      notes
    });
  }
});

console.log(`OLD STOCK: Valid titled records = ${osValid}, Empty/Template rows = ${osEmptyTemplate}`);
console.log('First 5 valid OLD STOCK records:');
console.log(osRowsWithData.slice(0, 5));
console.log(`Last valid OLD STOCK record (Row ${osRowsWithData[osRowsWithData.length - 1]?.rowNum}):`, osRowsWithData[osRowsWithData.length - 1]);

// 3. Analyze DEBTS
const debtsSheet = wb.Sheets['DEBTS'];
const debtsRows = XLSX.utils.sheet_to_json(debtsSheet, { defval: null });

console.log(`\nDEBTS: Total raw rows = ${debtsRows.length}`);
let debtsValid = 0;
let debtsEmpty = 0;
let debtsWithData = [];

debtsRows.forEach((r, idx) => {
  const rowNum = idx + 2;
  const creditor = safeStr(safeGetCol(r, ['Creditor / person', 'creditor', 'دائن']));
  const origAmt = safeNum(safeGetCol(r, ['Original amount (DA)', 'original_amount', 'مبلغ']));
  const repaidAmt = safeNum(safeGetCol(r, ['Amount repaid (DA)', 'repaid', 'مسدد'])) || 0;
  const remaining = safeNum(safeGetCol(r, ['Remaining (DA)', 'remaining', 'متبقي']));
  const notes = safeStr(safeGetCol(r, ['Evidence / notes', 'notes', 'ملاحظات']));

  if (!creditor || !origAmt || origAmt <= 0) {
    debtsEmpty++;
  } else {
    debtsValid++;
    debtsWithData.push({
      rowNum,
      creditor,
      origAmt,
      repaidAmt,
      remaining,
      notes
    });
  }
});

console.log(`DEBTS: Valid debt records = ${debtsValid}, Empty/Template rows = ${debtsEmpty}`);
console.log('Valid debt records:', debtsWithData);

// 4. Analyze OPENING POSITION
const openingSheet = wb.Sheets['OPENING POSITION'];
const openingRows = XLSX.utils.sheet_to_json(openingSheet, { defval: null });
console.log(`\nOPENING POSITION: Total raw rows = ${openingRows.length}`);
openingRows.forEach((r, idx) => {
  console.log(`Row ${idx + 2}: Item="${safeStr(r.Item)}", Amount="${safeStr(r['Amount (DA)'])}", Status="${safeStr(r['Status (confirmed / estimate / unknown)'])}", Notes="${safeStr(r.Notes)}"`);
});
