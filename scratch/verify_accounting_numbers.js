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

// 1. Parse NEW BATCH
const newBatchRows = XLSX.utils.sheet_to_json(wb.Sheets['NEW BATCH'], { defval: null });
let nbUnits = 0;
let nbValuation = 0;
let nbPriced = 0;
let nbUnpriced = 0;

newBatchRows.forEach(r => {
  const title = safeStr(safeGetCol(r, ['Title', 'عنوان']));
  if (!title) return;
  const qty = safeNum(safeGetCol(r, ['Quantity received', 'qty'])) || 0;
  const cost = safeNum(safeGetCol(r, ['Unit purchase cost (DA)', 'cost']));
  nbUnits += qty;
  if (cost !== null) {
    nbValuation += qty * cost;
    nbPriced++;
  } else {
    nbUnpriced++;
  }
});

// 2. Parse OLD STOCK
const oldStockRows = XLSX.utils.sheet_to_json(wb.Sheets['OLD STOCK'], { defval: null });
let osUnits = 0;
let osValuation = 0;
let osPriced = 0;
let osUnpriced = 0;

oldStockRows.forEach(r => {
  const title = safeStr(safeGetCol(r, ['Title', 'عنوان']));
  if (!title) return;
  const qty = safeNum(safeGetCol(r, ['Quantity counted today', 'qty'])) || 0;
  const cost = safeNum(safeGetCol(r, ['Original purchase cost per copy (DA)', 'cost']));
  osUnits += qty;
  if (cost !== null) {
    osValuation += qty * cost;
    osPriced++;
  } else {
    osUnpriced++;
  }
});

// 3. Parse DEBTS
const debtsRows = XLSX.utils.sheet_to_json(wb.Sheets['DEBTS'], { defval: null });
let totalDebts = 0;
debtsRows.forEach(r => {
  const creditor = safeStr(safeGetCol(r, ['Creditor / person']));
  const amt = safeNum(safeGetCol(r, ['Original amount (DA)'])) || 0;
  const repaid = safeNum(safeGetCol(r, ['Amount repaid (DA)'])) || 0;
  if (creditor && amt > 0) {
    totalDebts += (amt - repaid);
  }
});

console.log('=== EXACT RECONCILED METRICS FROM EXCEL ===');
console.log('NEW BATCH: titles =', nbPriced + nbUnpriced, 'units =', nbUnits, 'valuation =', nbValuation, 'DA');
console.log('OLD STOCK: titles =', osPriced + osUnpriced, 'units =', osUnits, 'valuation =', osValuation, 'DA (unpriced =', osUnpriced, ')');
console.log('TOTAL INVENTORY ASSET VALUE =', nbValuation + osValuation, 'DA (total units =', nbUnits + osUnits, ')');
console.log('TOTAL OUTSTANDING DEBTS =', totalDebts, 'DA');
console.log('HISTORICAL ORDERS (SUPABASE) = 139 orders, Total gross = 443,630 DA');
console.log('HISTORICAL COGS = Not reconciled');
console.log('GROSS PROFIT = Not reconciled / غير محسوبة بعد');
console.log('NET PROFIT = Not reconciled / غير محسوبة بعد');
console.log('AVAILABLE CASH = Not reconciled / غير محسوبة بعد');
