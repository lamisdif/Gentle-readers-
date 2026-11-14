const fs = require('fs');
const XLSX = require('../public/manager/vendor/xlsx.full.min.js');

const filePath = 'C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx';
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

console.log('Sheet Names:', wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const raw2D = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n================ Sheet: "${sheetName}" ================`);
  console.log('Total 2D rows:', raw2D.length);
  console.log('First 15 rows:');
  raw2D.slice(0, 15).forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`, JSON.stringify(row.slice(0, 8)));
  });
});
