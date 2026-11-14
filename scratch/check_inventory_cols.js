const fs = require('fs');
const XLSX = require('../public/manager/vendor/xlsx.full.min.js');
const wb = XLSX.read(fs.readFileSync('C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx'), { type: 'buffer' });
const nb = XLSX.utils.sheet_to_json(wb.Sheets['NEW BATCH']);
const os = XLSX.utils.sheet_to_json(wb.Sheets['OLD STOCK']);
console.log('NEW BATCH row 0:', nb[0]);
console.log('OLD STOCK row 0:', os[0]);
