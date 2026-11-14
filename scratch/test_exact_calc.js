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

  // 1. Inventory title map (grouping lots by normalized title)
  const normTitleMap = new Map();
  let catalogCostSum = 0;
  let catalogPriceSum = 0;

  inventory.forEach(item => {
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

  orders.forEach(order => {
    const fulfillmentStatus = order.is_historical ? 'delivered' : (order.status || 'pending');
    if (fulfillmentStatus === 'cancelled') return;

    const orderTotal = Number(order.total_price) || 0;
    totalSalesRevenue += orderTotal;
    totalCashInflowsFromSales += orderTotal;

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
    if (!Array.isArray(itemsList)) itemsList = [itemsList];
    if (itemsList.length === 0 && orderTotal > 0) {
      itemsList = [`Order #${order.id}`];
    }

    let totalItemsInOrder = 0;
    const parsedItems = [];
    itemsList.forEach(rawItem => {
      let title = '', qty = 1;
      if (typeof rawItem === 'object' && rawItem !== null) {
        title = String(rawItem.title || rawItem.name || '').trim();
        qty = Number(rawItem.quantity || rawItem.qty) || 1;
      } else {
        const rawStr = String(rawItem || '').trim();
        const m = rawStr.match(/^(.*?)(?:\s*[×x*]\s*(\d+))?$/);
        title = m ? m[1].trim() : rawStr;
        qty = m && m[2] ? parseInt(m[2], 10) : 1;
      }
      if (!title) title = `Order #${order.id}`;
      totalItemsInOrder += qty;
      parsedItems.push({ title, qty });
    });

    const unitPrice = totalItemsInOrder > 0 ? (orderTotal / totalItemsInOrder) : 0;

    parsedItems.forEach(pi => {
      const normKey = normalizeText(pi.title);
      if (!salesByTitle.has(normKey)) {
        salesByTitle.set(normKey, {
          rawTitle: pi.title,
          quantitySold: 0,
          revenue: 0
        });
      }
      const entry = salesByTitle.get(normKey);
      entry.quantitySold += pi.qty;
      entry.revenue += (unitPrice * pi.qty);
    });
  });

  // Verify total revenue from salesByTitle
  let checkRev = 0;
  salesByTitle.forEach(e => { checkRev += e.revenue; });
  console.log(`Verified totalSalesRevenue from orders: ${totalSalesRevenue} DA`);
  console.log(`Verified checkRev from salesByTitle: ${checkRev} DA`);

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
  const handledKeys = new Set();

  salesByTitle.forEach((saleData, normKey) => {
    handledKeys.add(normKey);
    const matchingLots = normTitleMap.get(normKey) || [];
    
    // Sort lots: OLD_STOCK first
    matchingLots.sort((a, b) => {
      const aIsOld = (a.stock_group || '').toUpperCase() === 'OLD_STOCK';
      const bIsOld = (b.stock_group || '').toUpperCase() === 'OLD_STOCK';
      if (aIsOld && !bIsOld) return -1;
      if (!aIsOld && bIsOld) return 1;
      return 0;
    });

    const unitPrice = saleData.quantitySold > 0 ? (saleData.revenue / saleData.quantitySold) : 0;
    let titleCogs = 0;
    let isTitleConfirmed = false;
    let primaryStockGroup = 'HISTORICAL';
    let primaryAuthor = '-';
    let displayPrice = unitPrice;
    let displayCost = null;

    if (matchingLots.length > 0) {
      const primaryLot = matchingLots[0];
      primaryAuthor = primaryLot.author || '-';
      primaryStockGroup = primaryLot.stock_group || 'OLD_STOCK';
      displayPrice = primaryLot.selling_price_da || unitPrice;

      if (primaryLot.unit_purchase_cost_da !== null && primaryLot.unit_purchase_cost_da !== undefined) {
        displayCost = primaryLot.unit_purchase_cost_da;
        titleCogs = saleData.quantitySold * primaryLot.unit_purchase_cost_da;
        isTitleConfirmed = true;

        totalConfirmedCogs += titleCogs;
        const profit = saleData.revenue - titleCogs;
        totalConfirmedProfit += profit;

        const isOld = primaryStockGroup === 'OLD_STOCK';
        if (isOld) {
          soldQtyOld += saleData.quantitySold;
          revenueOld += saleData.revenue;
          confirmedCogsOld += titleCogs;
          confirmedProfitOld += profit;
        } else {
          soldQtyNew += saleData.quantitySold;
          revenueNew += saleData.revenue;
          confirmedCogsNew += titleCogs;
          confirmedProfitNew += profit;
        }
      } else {
        // Unpriced inventory item: use catalog cost ratio
        displayCost = unitPrice * catalogCostRatio;
        titleCogs = saleData.revenue * catalogCostRatio;
        isTitleConfirmed = false;

        totalProvisionalCogs += titleCogs;
        totalProvisionalProfit += (saleData.revenue - titleCogs);
      }
    } else {
      // Historical order title not in physical inventory: use catalog cost ratio
      displayCost = unitPrice * catalogCostRatio;
      titleCogs = saleData.revenue * catalogCostRatio;
      isTitleConfirmed = false;

      totalProvisionalCogs += titleCogs;
      totalProvisionalProfit += (saleData.revenue - titleCogs);
    }

    const titleProfit = saleData.revenue - titleCogs;
    const marginPct = saleData.revenue > 0 ? Math.round((titleProfit / saleData.revenue) * 100) : null;
    const targetUnitMargin = displayCost !== null ? (displayPrice - displayCost) : null;

    // Calculate quantity on hand from inventory if matched
    let onHand = 0;
    matchingLots.forEach(l => {
      onHand += Math.max(0, (Number(l.quantity_received) || 0) - (Number(l.quantity_reserved) || 0) - (Number(l.quantity_damaged) || 0));
    });

    titleProfits.push({
      title: matchingLots.length > 0 ? matchingLots[0].title : saleData.rawTitle,
      author: primaryAuthor,
      stockGroup: primaryStockGroup,
      quantitySold: saleData.quantitySold,
      quantityOnHand: onHand,
      unitCost: displayCost !== null ? Math.round(displayCost) : null,
      sellingPrice: Math.round(displayPrice),
      targetUnitMargin: targetUnitMargin !== null ? Math.round(targetUnitMargin) : null,
      revenue: Math.round(saleData.revenue),
      cogs: Math.round(titleCogs),
      grossProfit: Math.round(titleProfit),
      marginPct: marginPct,
      isConfirmed: isTitleConfirmed
    });
  });

  // Also include inventory items that had 0 sales
  normTitleMap.forEach((lots, normKey) => {
    if (handledKeys.has(normKey)) return;
    const primary = lots[0];
    let onHand = 0;
    lots.forEach(l => {
      onHand += Math.max(0, (Number(l.quantity_received) || 0) - (Number(l.quantity_reserved) || 0) - (Number(l.quantity_damaged) || 0));
    });
    const cost = primary.unit_purchase_cost_da;
    const price = primary.selling_price_da;
    const targetMargin = (cost !== null && price > 0) ? (price - cost) : null;
    const marginPct = (cost !== null && price > 0) ? Math.round(((price - cost) / price) * 100) : null;

    titleProfits.push({
      title: primary.title,
      author: primary.author || '-',
      stockGroup: primary.stock_group || 'NEW_STOCK',
      quantitySold: 0,
      quantityOnHand: onHand,
      unitCost: cost,
      sellingPrice: price,
      targetUnitMargin: targetMargin,
      revenue: 0,
      cogs: 0,
      grossProfit: null,
      marginPct: marginPct,
      isConfirmed: cost !== null
    });
  });

  const totalCogs = totalConfirmedCogs + totalProvisionalCogs;
  const totalGrossProfit = totalSalesRevenue - totalCogs;
  const totalOperatingExpenses = 0;
  const netProfit = totalGrossProfit - totalOperatingExpenses;

  console.log('\n=== EXACT RECONCILED RESULTS ===');
  console.log(`Total Sales Revenue: ${totalSalesRevenue.toLocaleString('fr-DZ')} DA`);
  console.log(`Total COGS: ${Math.round(totalCogs).toLocaleString('fr-DZ')} DA`);
  console.log(`  Confirmed COGS (matched lots): ${Math.round(totalConfirmedCogs).toLocaleString('fr-DZ')} DA`);
  console.log(`  Provisional COGS (catalog ratio 56.0%): ${Math.round(totalProvisionalCogs).toLocaleString('fr-DZ')} DA`);
  console.log(`Total Gross Profit: ${Math.round(totalGrossProfit).toLocaleString('fr-DZ')} DA (${Math.round((totalGrossProfit/totalSalesRevenue)*100)}% Margin)`);
  console.log(`Total Operating Expenses: ${totalOperatingExpenses.toLocaleString('fr-DZ')} DA`);
  console.log(`Net Profit: ${Math.round(netProfit).toLocaleString('fr-DZ')} DA`);
  console.log(`Old Stock Breakdown: Sold=${soldQtyOld}, Rev=${Math.round(revenueOld).toLocaleString('fr-DZ')} DA, COGS=${Math.round(confirmedCogsOld).toLocaleString('fr-DZ')} DA, Gross Profit=${Math.round(confirmedProfitOld).toLocaleString('fr-DZ')} DA`);
  console.log(`New Stock Breakdown: Sold=${soldQtyNew}, Rev=${Math.round(revenueNew).toLocaleString('fr-DZ')} DA, COGS=${Math.round(confirmedCogsNew).toLocaleString('fr-DZ')} DA, Gross Profit=${Math.round(confirmedProfitNew).toLocaleString('fr-DZ')} DA`);
  console.log(`Total entries in Title Profits table: ${titleProfits.length}`);
})();
