const fs = require('fs');

(async () => {
  // Mock window & document
  global.window = {};
  const elements = {};
  global.document = {
    addEventListener: () => {},
    getElementById: (id) => {
      if (!elements[id]) {
        elements[id] = { textContent: '', innerHTML: '', style: {}, className: '' };
      }
      return elements[id];
    }
  };
  global.escapeHtml = (str) => String(str || '');

  // Fetch real orders
  const res = await fetch('https://fsximdllrhglabxbqvay.supabase.co/rest/v1/orders?select=*', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'
    }
  });
  const orders = await res.json();

  // Load Excel inventory
  const XLSX = require('../public/manager/vendor/xlsx.full.min.js');
  const wb = XLSX.read(fs.readFileSync('C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx'), { type: 'buffer' });
  const nb = XLSX.utils.sheet_to_json(wb.Sheets['NEW BATCH']);
  const os = XLSX.utils.sheet_to_json(wb.Sheets['OLD STOCK']);

  const inventory = [];
  nb.forEach((r, idx) => {
    const t = String(r.Title || r['عنوان'] || '').trim();
    if (!t) return;
    inventory.push({
      id: `nb_${idx}`,
      title: t,
      author: String(r.Author || r['مؤلف'] || '-').trim(),
      stock_group: 'NEW_STOCK',
      quantity_received: Number(r['Quantity received']) || 0,
      quantity_sold: 0,
      quantity_reserved: 0,
      quantity_damaged: 0,
      unit_purchase_cost_da: r['Unit purchase cost (DA)'] !== null && r['Unit purchase cost (DA)'] !== undefined ? Number(r['Unit purchase cost (DA)']) : null,
      selling_price_da: Number(r['Selling price (DA)']) || 0
    });
  });

  os.forEach((r, idx) => {
    const t = String(r.Title || r['عنوان'] || '').trim();
    if (!t) return;
    inventory.push({
      id: `os_${idx}`,
      title: t,
      author: String(r.Author || r['مؤلف'] || '-').trim(),
      stock_group: 'OLD_STOCK',
      quantity_received: Number(r['Quantity counted today']) || 0,
      quantity_sold: 0,
      quantity_reserved: 0,
      quantity_damaged: 0,
      unit_purchase_cost_da: r['Original purchase cost per copy (DA)'] !== null && r['Original purchase cost per copy (DA)'] !== undefined ? Number(r['Original purchase cost per copy (DA)']) : null,
      selling_price_da: Number(r['Selling price (DA)']) || 0
    });
  });

  // Evaluate code from manager.js
  const managerCode = fs.readFileSync('public/manager/manager.js', 'utf8');

  // Extract calculateFinancialMetrics and renderFinanceSection
  const fnCalcStart = managerCode.indexOf('function calculateFinancialMetrics() {');
  const fnCalcEnd = managerCode.indexOf('function updateDashboardMetrics() {');
  const calcFnCode = managerCode.slice(fnCalcStart, fnCalcEnd);

  const fnRenderStart = managerCode.indexOf('function renderFinanceSection() {');
  const fnRenderEnd = managerCode.indexOf('function renderCatalogView() {');
  const renderFnCode = managerCode.slice(fnRenderStart, fnRenderEnd);

  global.state = {
    inventory,
    orders,
    orderMeta: [],
    expenses: [],
    batches: [{ amount_paid_da: 90000 }],
    debts: [{ id: '1', original_amount_da: 12000, amount_repaid_da: 0 }],
    debtRepayments: [],
    profitFilter: 'all',
    searchQuery: ''
  };

  eval(calcFnCode);
  eval(renderFnCode);

  const fin = calculateFinancialMetrics();
  console.log('--- CALCULATION OUTPUT ---');
  console.log('isProfitReconciled:', fin.isProfitReconciled);
  console.log('totalSalesRevenue:', fin.totalSalesRevenue);
  console.log('totalCogs:', fin.totalCogs);
  console.log('totalGrossProfit:', fin.totalGrossProfit);
  console.log('netProfit:', fin.netProfit);
  console.log('oldStock:', fin.oldStock);
  console.log('newStock:', fin.newStock);

  renderFinanceSection();
  console.log('\n--- DOM RENDER OUTPUT ---');
  console.log('finance-gross-profit:', elements['finance-gross-profit'].textContent);
  console.log('finance-gross-subtext:', elements['finance-gross-subtext'].innerHTML);
  console.log('finance-net-profit:', elements['finance-net-profit'].textContent);
  console.log('finance-net-subtext:', elements['finance-net-subtext'].innerHTML);
  console.log('finance-old-sold-qty:', elements['finance-old-sold-qty'].textContent);
  console.log('finance-old-revenue:', elements['finance-old-revenue'].textContent);
  console.log('finance-old-cogs:', elements['finance-old-cogs'].textContent);
  console.log('finance-old-profit:', elements['finance-old-profit'].textContent);
  console.log('finance-new-sold-qty:', elements['finance-new-sold-qty'].textContent);
  console.log('finance-new-revenue:', elements['finance-new-revenue'].textContent);
  console.log('finance-new-cogs:', elements['finance-new-cogs'].textContent);
  console.log('finance-new-profit:', elements['finance-new-profit'].textContent);
  console.log('Sample rows in titlesTbody (length):', elements['finance-profit-titles-tbody'].innerHTML.length);
})();
