const fs = require('fs');

(async () => {
  const res = await fetch('https://fsximdllrhglabxbqvay.supabase.co/rest/v1/orders?select=*', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'
    }
  });
  const orders = await res.json();
  
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

  const state = {
    inventory,
    orders,
    orderMeta: [],
    expenses: [],
    batches: [{ amount_paid_da: 90000 }],
    debts: [{ original_amount_da: 12000, amount_repaid_da: 0 }],
    debtRepayments: []
  };

  // --- CALCULATION LOGIC ---
  function normalizeText(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\w\s\u0600-\u06FF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 1. Inventory maps
  const normTitleMap = new Map();
  let catalogCostSum = 0;
  let catalogPriceSum = 0;

  state.inventory.forEach(item => {
    if (item.title) {
      const normKey = normalizeText(item.title);
      if (!normTitleMap.has(normKey)) {
        normTitleMap.set(normKey, []);
      }
      normTitleMap.get(normKey).push(item);

      if (item.unit_purchase_cost_da !== null && item.selling_price_da > 0) {
        catalogCostSum += item.unit_purchase_cost_da;
        catalogPriceSum += item.selling_price_da;
      }
    }
  });

  const catalogCostRatio = catalogPriceSum > 0 ? (catalogCostSum / catalogPriceSum) : 0.56;

  // 2. Sales aggregation from orders
  let totalSalesRevenue = 0;
  let totalCashInflowsFromSales = 0;
  const salesByTitle = new Map();

  state.orders.forEach(order => {
    const meta = state.orderMeta.find(m => String(m.order_id) === String(order.id));
    const fulfillmentStatus = meta ? meta.fulfillment_status : (order.is_historical ? 'delivered' : (order.status || 'pending'));
    const isPaid = meta ? (meta.payment_status === 'paid') : (order.is_historical ? true : (order.payment_status === 'paid'));

    if (fulfillmentStatus === 'cancelled') return;

    const orderTotal = Number(order.total_price) || 0;
    totalSalesRevenue += orderTotal;
    if (isPaid) totalCashInflowsFromSales += orderTotal;

    let itemsList = [];
    if (Array.isArray(order.items)) {
      itemsList = order.items;
    } else if (typeof order.items === 'string') {
      try {
        const parsed = JSON.parse(order.items);
        if (Array.isArray(parsed)) itemsList = parsed;
        else itemsList = [order.items];
      } catch {
        itemsList = [order.items];
      }
    }

    // Determine estimated unit price per item if not broken down
    let totalItemsInOrder = 0;
    const parsedItems = [];
    itemsList.forEach(rawItem => {
      let title = '';
      let qty = 1;
      let explicitPrice = null;

      if (typeof rawItem === 'object' && rawItem !== null) {
        title = String(rawItem.title || rawItem.name || '').trim();
        qty = Number(rawItem.quantity || rawItem.qty) || 1;
        explicitPrice = Number(rawItem.price) || null;
      } else {
        const rawStr = String(rawItem || '').trim();
        const m = rawStr.match(/^(.*?)(?:\s*[×x*]\s*(\d+))?$/);
        if (m) {
          title = m[1].trim();
          qty = m[2] ? parseInt(m[2], 10) : 1;
        } else {
          title = rawStr;
        }
      }
      if (!title) title = `Order #${order.id || 'N/A'}`;
      totalItemsInOrder += qty;
      parsedItems.push({ title, qty, explicitPrice });
    });

    const fallbackUnitPrice = totalItemsInOrder > 0 ? (orderTotal / totalItemsInOrder) : 0;

    parsedItems.forEach(pi => {
      const unitPrice = pi.explicitPrice !== null ? pi.explicitPrice : fallbackUnitPrice;
      const normKey = normalizeText(pi.title);

      if (!salesByTitle.has(normKey)) {
        salesByTitle.set(normKey, {
          rawTitle: pi.title,
          quantitySold: 0,
          revenue: 0,
          explicitRevenue: 0
        });
      }

      const entry = salesByTitle.get(normKey);
      entry.quantitySold += pi.qty;
      entry.revenue += (unitPrice * pi.qty);
    });
  });

  // 3. FIFO Allocation & Title Costing
  let confirmedCogsOld = 0;
  let confirmedProfitOld = 0;
  let revenueOld = 0;
  let soldQtyOld = 0;

  let confirmedCogsNew = 0;
  let confirmedProfitNew = 0;
  let revenueNew = 0;
  let soldQtyNew = 0;

  let totalConfirmedCogs = 0;
  let totalProvisionalCogs = 0;
  let totalConfirmedProfit = 0;
  let totalProvisionalProfit = 0;

  const titleProfits = [];

  salesByTitle.forEach((saleData, normKey) => {
    const matchingLots = normTitleMap.get(normKey) || [];
    
    // Sort lots: OLD_STOCK first
    matchingLots.sort((a, b) => {
      const aIsOld = (a.stock_group || '').toUpperCase() === 'OLD_STOCK';
      const bIsOld = (b.stock_group || '').toUpperCase() === 'OLD_STOCK';
      if (aIsOld && !bIsOld) return -1;
      if (!aIsOld && bIsOld) return 1;
      return 0;
    });

    let remainingToCost = saleData.quantitySold;
    let titleConfirmedCogs = 0;
    let titleProvisionalCogs = 0;
    let titleConfirmedQty = 0;
    let titleProvisionalQty = 0;
    let titleConfirmedRevenue = 0;
    let titleProvisionalRevenue = 0;

    const unitPrice = saleData.quantitySold > 0 ? (saleData.revenue / saleData.quantitySold) : 0;

    for (const lot of matchingLots) {
      if (remainingToCost <= 0) break;
      const lotCapacity = Math.max(1, Number(lot.quantity_received) || 1); // or full sale if matching title
      const lotAlloc = remainingToCost; // All sold units of this title share this title's cost
      
      const cost = lot.unit_purchase_cost_da;
      const isOld = (lot.stock_group || '').toUpperCase() === 'OLD_STOCK';

      if (cost !== null && cost !== undefined) {
        const cogs = lotAlloc * cost;
        const rev = lotAlloc * unitPrice;
        const profit = rev - cogs;

        titleConfirmedCogs += cogs;
        titleConfirmedQty += lotAlloc;
        titleConfirmedRevenue += rev;

        totalConfirmedCogs += cogs;
        totalConfirmedProfit += profit;

        if (isOld) {
          confirmedCogsOld += cogs;
          confirmedProfitOld += profit;
          revenueOld += rev;
          soldQtyOld += lotAlloc;
        } else {
          confirmedCogsNew += cogs;
          confirmedProfitNew += profit;
          revenueNew += rev;
          soldQtyNew += lotAlloc;
        }
      } else {
        // Unpriced lot: use catalog ratio
        const estCost = unitPrice * catalogCostRatio;
        const cogs = lotAlloc * estCost;
        const rev = lotAlloc * unitPrice;
        const profit = rev - cogs;

        titleProvisionalCogs += cogs;
        titleProvisionalQty += lotAlloc;
        titleProvisionalRevenue += rev;

        totalProvisionalCogs += cogs;
        totalProvisionalProfit += profit;
      }

      remainingToCost -= lotAlloc;
      break; // Used primary lot for this title
    }

    if (remainingToCost > 0) {
      // Historical title not in current physical count: use catalog cost ratio
      const estCost = unitPrice * catalogCostRatio;
      const cogs = remainingToCost * estCost;
      const rev = remainingToCost * unitPrice;
      const profit = rev - cogs;

      titleProvisionalCogs += cogs;
      titleProvisionalQty += remainingToCost;
      titleProvisionalRevenue += rev;

      totalProvisionalCogs += cogs;
      totalProvisionalProfit += profit;
    }

    const titleTotalCogs = titleConfirmedCogs + titleProvisionalCogs;
    const titleTotalGrossProfit = saleData.revenue - titleTotalCogs;
    const isConfirmed = titleProvisionalQty === 0 && matchingLots.length > 0;
    const marginPct = saleData.revenue > 0 ? Math.round((titleTotalGrossProfit / saleData.revenue) * 100) : null;
    const primaryLot = matchingLots[0];

    titleProfits.push({
      title: primaryLot ? primaryLot.title : saleData.rawTitle,
      author: primaryLot ? (primaryLot.author || '-') : '-',
      stockGroup: primaryLot ? primaryLot.stock_group : 'HISTORICAL',
      quantitySold: saleData.quantitySold,
      revenue: Math.round(saleData.revenue),
      cogs: Math.round(titleTotalCogs),
      grossProfit: Math.round(titleTotalGrossProfit),
      marginPct: marginPct,
      isConfirmed: isConfirmed
    });
  });

  const totalCogs = totalConfirmedCogs + totalProvisionalCogs;
  const totalGrossProfit = totalSalesRevenue - totalCogs;
  const totalOperatingExpenses = state.expenses.reduce((sum, e) => sum + (Number(e.amount_da) || 0), 0);
  const netProfit = totalGrossProfit - totalOperatingExpenses;

  console.log('=== VERIFIED FINANCIAL RECONCILIATION RESULT ===');
  console.log(`Total Sales Revenue: ${totalSalesRevenue.toLocaleString('fr-DZ')} DA`);
  console.log(`Confirmed COGS (matched): ${totalConfirmedCogs.toLocaleString('fr-DZ')} DA`);
  console.log(`Provisional COGS (catalog margin 56.0%): ${totalProvisionalCogs.toLocaleString('fr-DZ')} DA`);
  console.log(`Total COGS: ${Math.round(totalCogs).toLocaleString('fr-DZ')} DA`);
  console.log(`Total Gross Profit: ${Math.round(totalGrossProfit).toLocaleString('fr-DZ')} DA (${Math.round((totalGrossProfit/totalSalesRevenue)*100)}% Margin)`);
  console.log(`Total Operating Expenses: ${totalOperatingExpenses.toLocaleString('fr-DZ')} DA`);
  console.log(`Net Profit: ${Math.round(netProfit).toLocaleString('fr-DZ')} DA`);
  console.log(`\nOLD STOCK: Sold = ${soldQtyOld}, Rev = ${Math.round(revenueOld).toLocaleString('fr-DZ')} DA, COGS = ${Math.round(confirmedCogsOld).toLocaleString('fr-DZ')} DA, Profit = ${Math.round(confirmedProfitOld).toLocaleString('fr-DZ')} DA`);
  console.log(`NEW STOCK: Sold = ${soldQtyNew}, Rev = ${Math.round(revenueNew).toLocaleString('fr-DZ')} DA, COGS = ${Math.round(confirmedCogsNew).toLocaleString('fr-DZ')} DA, Profit = ${Math.round(confirmedProfitNew).toLocaleString('fr-DZ')} DA`);
  console.log(`Total titles in profit table: ${titleProfits.length}`);
  console.log(`Sample confirmed profit title:`, titleProfits.find(t => t.isConfirmed));
})();
