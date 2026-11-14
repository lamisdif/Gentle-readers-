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

function sheetToJsonAuto(ws, headerKeywords = []) {
  if (!ws) return [];
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

// 1. Locate sheets with case-insensitive matching
const newBatchSheetName = wb.SheetNames.find(s => /new\s*batch/i.test(s));
const oldStockSheetName = wb.SheetNames.find(s => /old\s*stock/i.test(s));
const debtsSheetName = wb.SheetNames.find(s => /debt/i.test(s));
const openingSheetName = wb.SheetNames.find(s => /opening/i.test(s));

const parsed = {
  newBatch: newBatchSheetName ? sheetToJsonAuto(wb.Sheets[newBatchSheetName], ['title', 'supplier']) : [],
  oldStock: oldStockSheetName ? sheetToJsonAuto(wb.Sheets[oldStockSheetName], ['title', 'author']) : [],
  debts: debtsSheetName ? sheetToJsonAuto(wb.Sheets[debtsSheetName], ['creditor', 'amount']) : [],
  opening: openingSheetName ? sheetToJsonAuto(wb.Sheets[openingSheetName], ['item', 'amount']) : []
};

// 2. Simulate complete execution of executeExcelImport
const itemsToSave = [];
const debtsToSave = [];
let skippedTemplateCount = 0;
let skippedDuplicateCount = 0;
let nullCostsCount = 0;
let newStockCount = 0;
let oldStockCount = 0;
let debtsCount = 0;
const existingMap = new Map();

// Process NEW BATCH
parsed.newBatch.forEach(r => {
  const title = safeCellString(getRowColumn(r, ['Title', 'اسم الكتاب', 'book_title', 'book']));
  if (!title) {
    skippedTemplateCount++;
    return;
  }

  const batchId = safeCellString(getRowColumn(r, ['Batch ID', 'Batch', 'batch_id'])) || 'batch-nov-2026';
  const lotKey = `${title.toLowerCase()}::NEW_STOCK::${batchId}`;
  if (existingMap.has(lotKey)) {
    skippedDuplicateCount++;
    return;
  }

  const cost = safeCellNumber(getRowColumn(r, ['Unit purchase cost (DA)', 'Unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء']));
  if (cost === null) nullCostsCount++;

  const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'selling', 'سعر البيع']));
  const qtyRec = Math.max(1, parseInt(getRowColumn(r, ['Quantity received', 'quantity', 'qty', 'الكمية'])) || 1);
  const qtySold = Math.max(0, parseInt(getRowColumn(r, ['Quantity sold', 'sold'])) || 0);
  const qtyDamaged = Math.max(0, parseInt(getRowColumn(r, ['Quantity damaged', 'damaged'])) || 0);

  const item = {
    id: 'item_test_' + (newStockCount + 1),
    title: title,
    author: safeCellString(getRowColumn(r, ['Author', 'المؤلف', 'auteur'])) || null,
    isbn: safeCellString(getRowColumn(r, ['ISBN', 'الرقم الدولي', 'barcode'])) || null,
    category: safeCellString(getRowColumn(r, ['Category', 'التصنيف', 'genre'])).toLowerCase() || 'book',
    item_type: 'book',
    stock_group: 'NEW_STOCK',
    batch_id: batchId,
    quantity_received: qtyRec,
    quantity_sold: qtySold,
    quantity_damaged: qtyDamaged,
    quantity_reserved: 0,
    unit_purchase_cost_da: cost !== null ? Math.round(cost) : null,
    selling_price_da: price !== null ? Math.round(price) : null,
    supplier_name: safeCellString(getRowColumn(r, ['Supplier', 'المورد', 'fournisseur', 'exhibitor'])) || 'Book Fair Exhibitors',
    acquisition_date: getRowColumn(r, ['Date received', 'Date', 'Purchase Date']) || new Date().toISOString().slice(0, 10),
    notes: safeCellString(getRowColumn(r, ['Notes', 'ملاحظات', 'remarques'])) || null
  };

  itemsToSave.push(item);
  existingMap.set(lotKey, item);
  newStockCount++;
});

// Process OLD STOCK
parsed.oldStock.forEach(r => {
  const title = safeCellString(getRowColumn(r, ['Title', 'اسم الكتاب', 'book_title', 'book']));
  if (!title) {
    skippedTemplateCount++;
    return;
  }

  const lotKey = `${title.toLowerCase()}::OLD_STOCK`;
  if (existingMap.has(lotKey)) {
    skippedDuplicateCount++;
    return;
  }

  const cost = safeCellNumber(getRowColumn(r, ['Original purchase cost per copy (DA)', 'Unit purchase cost', 'purchase cost', 'cost', 'سعر الشراء']));
  if (cost === null) nullCostsCount++;

  const price = safeCellNumber(getRowColumn(r, ['Selling price (DA)', 'Selling price', 'price', 'selling', 'سعر البيع']));
  const qtyCounted = Math.max(1, parseInt(getRowColumn(r, ['Quantity counted today', 'quantity', 'qty', 'الكمية'])) || 1);

  const item = {
    id: 'item_test_' + (newStockCount + oldStockCount + 1),
    title: title,
    author: safeCellString(getRowColumn(r, ['Author', 'المؤلف', 'auteur'])) || null,
    isbn: safeCellString(getRowColumn(r, ['ISBN', 'الرقم الدولي', 'barcode'])) || null,
    category: safeCellString(getRowColumn(r, ['Category', 'التصنيف', 'genre'])).toLowerCase() || 'book',
    item_type: 'book',
    stock_group: 'OLD_STOCK',
    batch_id: null,
    quantity_received: qtyCounted,
    quantity_sold: 0,
    quantity_damaged: 0,
    quantity_reserved: 0,
    unit_purchase_cost_da: cost !== null ? Math.round(cost) : null,
    selling_price_da: price !== null ? Math.round(price) : null,
    condition: safeCellString(getRowColumn(r, ['Condition', 'الحالة', 'etat'])) || 'Good',
    acquisition_date: new Date().toISOString().slice(0, 10),
    notes: safeCellString(getRowColumn(r, ['Notes', 'ملاحظات', 'remarques'])) || null
  };

  itemsToSave.push(item);
  existingMap.set(lotKey, item);
  oldStockCount++;
});

// Process DEBTS
parsed.debts.forEach(r => {
  const creditor = safeCellString(getRowColumn(r, ['Creditor / person', 'creditor', 'دائن']));
  const origAmt = safeCellNumber(getRowColumn(r, ['Original amount (DA)', 'original_amount', 'مبلغ'])) || 0;
  if (!creditor || origAmt <= 0) {
    skippedTemplateCount++;
    return;
  }

  const repaidAmt = safeCellNumber(getRowColumn(r, ['Amount repaid (DA)', 'repaid', 'مسدد'])) || 0;
  debtsToSave.push({
    id: 'debt_test_' + (debtsCount + 1),
    creditor_name: creditor,
    debt_type: safeCellString(getRowColumn(r, ['Type (supplier/family/friend/other)', 'type'])).toLowerCase() || 'supplier',
    original_amount_da: Math.round(origAmt),
    amount_repaid_da: Math.round(repaidAmt),
    remaining_balance_da: Math.max(0, Math.round(origAmt - repaidAmt)),
    incurred_date: getRowColumn(r, ['Date borrowed / incurred']) || null,
    due_date: getRowColumn(r, ['Due date']) || null,
    notes: safeCellString(getRowColumn(r, ['Evidence / notes', 'notes'])) || null
  });
  debtsCount++;
});

console.log('=== EXECUTION SIMULATION RESULTS ===');
console.log('Total itemsToSave:', itemsToSave.length);
console.log('  - NEW_STOCK items:', newStockCount);
console.log('  - OLD_STOCK items:', oldStockCount);
console.log('Debts to save:', debtsToSave.length);
console.log('Skipped empty template rows:', skippedTemplateCount);
console.log('Skipped duplicate titles:', skippedDuplicateCount);
console.log('Null cost titles (provisional):', nullCostsCount);
console.log('\nSample NEW_STOCK "1984":', itemsToSave.find(i => i.title === '1984'));
console.log('Sample OLD_STOCK "كل شيء عن الحب":', itemsToSave.find(i => i.title === 'كل شيء عن الحب'));
console.log('Sample Debt record:', debtsToSave[0]);
