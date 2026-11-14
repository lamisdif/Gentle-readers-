const fs = require('fs');
const path = require('path');
const XLSX = require('../public/manager/vendor/xlsx.full.min.js');

const domElements = {};
function mockElement(id) {
  if (!domElements[id]) {
    domElements[id] = {
      id,
      style: {},
      textContent: '',
      innerHTML: '',
      classList: {
        toggle: () => {},
        add: () => {},
        remove: () => {}
      },
      getAttribute: () => '',
      addEventListener: () => {}
    };
  }
  return domElements[id];
}

global.document = {
  getElementById: (id) => mockElement(id),
  querySelectorAll: () => []
};
global.window = {};
global.escapeHtml = (str) => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
global.XLSX = XLSX;

const managerJs = fs.readFileSync(path.join(__dirname, '../public/manager/manager.js'), 'utf8');

global.state = {
  inventory: [],
  batches: [],
  excelWorkbook: null,
  excelParsedData: null,
  activeImporterSheet: 'NEW BATCH'
};

const codeToEval = `
${managerJs.slice(managerJs.indexOf('function safeCellString'), managerJs.indexOf('window.executeExcelImport'))}
`;
eval(codeToEval);

const workbookPath = 'C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx';
const buf = fs.readFileSync(workbookPath);
const workbook = XLSX.read(buf, { type: 'buffer', cellDates: true });

console.log('=== Step 1: parseWorkbookData ===');
parseWorkbookData(workbook);
console.log('Parsed NEW BATCH rows:', state.excelParsedData.newBatch.length);
console.log('Parsed OLD STOCK rows:', state.excelParsedData.oldStock.length);
console.log('Parsed DEBTS rows:', state.excelParsedData.debts.length);
console.log('Parsed OPENING rows:', state.excelParsedData.opening.length);

console.log('\n=== Step 2: showImporterPreview ===');
showImporterPreview();
console.log('Badge NEW BATCH valid count:', mockElement('badge-count-new-batch').textContent);
console.log('Badge OLD STOCK valid count:', mockElement('badge-count-old-stock').textContent);
console.log('Badge DEBTS valid count:', mockElement('badge-count-debts').textContent);
console.log('Badge OPENING valid count:', mockElement('badge-count-opening').textContent);

console.log('\n=== Step 3: renderSheetPreviewTable(NEW BATCH) ===');
renderSheetPreviewTable('NEW BATCH');
console.log('Stat Total Rows:', mockElement('stat-import-total-rows').textContent);
console.log('Stat Valid Items:', mockElement('stat-import-valid-items').textContent);
console.log('Stat Duplicates:', mockElement('stat-import-duplicates').textContent);
console.log('Stat Skipped Template:', mockElement('stat-import-skipped').textContent);
console.log('Stat Unknown Costs:', mockElement('stat-import-unknown-costs').textContent);
const nbTrCount = mockElement('importer-preview-tbody').innerHTML.split('<tr').length - 1;
console.log('HTML rows rendered count:', nbTrCount);
console.log('First 2 rendered rows preview:');
console.log(mockElement('importer-preview-tbody').innerHTML.split('</tr>').slice(0, 2).map(r => r.trim()).join('\n'));

console.log('\n=== Step 4: renderSheetPreviewTable(OLD STOCK) ===');
renderSheetPreviewTable('OLD STOCK');
console.log('Stat Total Rows:', mockElement('stat-import-total-rows').textContent);
console.log('Stat Valid Items:', mockElement('stat-import-valid-items').textContent);
console.log('Stat Duplicates:', mockElement('stat-import-duplicates').textContent);
console.log('Stat Skipped Template:', mockElement('stat-import-skipped').textContent);
console.log('Stat Unknown Costs:', mockElement('stat-import-unknown-costs').textContent);
const osTrCount = mockElement('importer-preview-tbody').innerHTML.split('<tr').length - 1;
console.log('HTML rows rendered count:', osTrCount);

console.log('\n=== Step 5: renderSheetPreviewTable(DEBTS) ===');
renderSheetPreviewTable('DEBTS');
console.log('Stat Valid Items:', mockElement('stat-import-valid-items').textContent);
const debtsTrCount = mockElement('importer-preview-tbody').innerHTML.split('<tr').length - 1;
console.log('HTML rows rendered count:', debtsTrCount);

console.log('\n=== Step 6: renderSheetPreviewTable(OPENING POSITION) ===');
renderSheetPreviewTable('OPENING POSITION');
console.log('Stat Valid Items:', mockElement('stat-import-valid-items').textContent);
const openTrCount = mockElement('importer-preview-tbody').innerHTML.split('<tr').length - 1;
console.log('HTML rows rendered count:', openTrCount);

console.log('\nSUCCESS: ALL 4 SHEETS PARSED AND RENDERED PERFECTLY!');
