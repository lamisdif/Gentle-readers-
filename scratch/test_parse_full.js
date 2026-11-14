const fs = require('fs');
const XLSX = require('../public/manager/vendor/xlsx.full.min.js');

const filePath = 'C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

const newBatchSheet = wb.Sheets['NEW BATCH'];
const newBatchRows = XLSX.utils.sheet_to_json(newBatchSheet, { defval: null });

console.log('NEW BATCH raw sheet_to_json length:', newBatchRows.length);
console.log('NEW BATCH row 0 keys:', Object.keys(newBatchRows[0] || {}));
console.log('Sample row with 1984:', newBatchRows.find(r => r.Title == 1984));

const oldStockSheet = wb.Sheets['OLD STOCK'];
const oldStockRows = XLSX.utils.sheet_to_json(oldStockSheet, { defval: null });
console.log('\nOLD STOCK raw sheet_to_json length:', oldStockRows.length);
console.log('OLD STOCK row 0 keys:', Object.keys(oldStockRows[0] || {}));

const debtsSheet = wb.Sheets['DEBTS'];
const debtsRows = XLSX.utils.sheet_to_json(debtsSheet, { defval: null });
console.log('\nDEBTS raw sheet_to_json length:', debtsRows.length);
console.log('DEBTS row 0 keys:', Object.keys(debtsRows[0] || {}));

const openingSheet = wb.Sheets['OPENING POSITION'];
const openingRows = XLSX.utils.sheet_to_json(openingSheet, { defval: null });
console.log('\nOPENING POSITION raw sheet_to_json length:', openingRows.length);
console.log('OPENING POSITION row 0 keys:', Object.keys(openingRows[0] || {}));
