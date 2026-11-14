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

  // Map inventory
  const invNormMap = new Map();
  inventory.forEach(item => {
    const k = normalizeText(item.title);
    if (!invNormMap.has(k)) invNormMap.set(k, []);
    invNormMap.get(k).push(item);
  });

  // Parse orders
  const salesByNorm = new Map();
  orders.forEach(order => {
    const orderTotal = Number(order.total_price) || 0;
    let itemsList = [];
    if (Array.isArray(order.items)) itemsList = order.items;
    else if (typeof order.items === 'string') {
      try { itemsList = JSON.parse(order.items); } catch { itemsList = [order.items]; }
    }
    if (!Array.isArray(itemsList)) itemsList = [itemsList];
    if (itemsList.length === 0 && orderTotal > 0) {
      itemsList = [`Order #${order.id}`];
    }

    let totalItemsInOrder = 0;
    const parsed = [];
    itemsList.forEach(rawItem => {
      let title = '', qty = 1, price = null;
      if (typeof rawItem === 'object' && rawItem !== null) {
        title = String(rawItem.title || rawItem.name || '').trim();
        qty = Number(rawItem.quantity || rawItem.qty) || 1;
        price = Number(rawItem.price) || null;
      } else {
        const rawStr = String(rawItem || '').trim();
        const m = rawStr.match(/^(.*?)(?:\s*[×x*]\s*(\d+))?$/);
        title = m ? m[1].trim() : rawStr;
        qty = m && m[2] ? parseInt(m[2], 10) : 1;
      }
      if (!title) title = `Order #${order.id}`;
      totalItemsInOrder += qty;
      parsed.push({ title, qty, price });
    });

    const unitPrice = totalItemsInOrder > 0 ? (orderTotal / totalItemsInOrder) : 0;
    parsed.forEach(p => {
      const uPrice = unitPrice;
      const nk = normalizeText(p.title);
      if (!salesByNorm.has(nk)) {
        salesByNorm.set(nk, { rawTitle: p.title, qty: 0, revenue: 0 });
      }
      const e = salesByNorm.get(nk);
      e.qty += p.qty;
      e.revenue += (uPrice * p.qty);
    });
  });

  // Calculate catalog unit economics
  let catalogCostSum = 0, catalogPriceSum = 0;
  inventory.forEach(i => {
    if (i.unit_purchase_cost_da !== null && i.selling_price_da > 0) {
      catalogCostSum += i.unit_purchase_cost_da;
      catalogPriceSum += i.selling_price_da;
    }
  });
  const catalogCostRatio = catalogPriceSum > 0 ? (catalogCostSum / catalogPriceSum) : 0.56;

  console.log(`Catalog Cost Ratio: ${(catalogCostRatio * 100).toFixed(1)}%`);

  // Build unified titleProfits
  const handledKeys = new Set();
  const titleProfits = [];

  let totalSalesRev = 0;
  let totalCogs = 0;
  let totalGrossProfit = 0;
  let oldStockRev = 0, oldStockCogs = 0, oldStockSold = 0, oldStockProfit = 0;
  let newStockRev = 0, newStockCogs = 0, newStockSold = 0, newStockProfit = 0;

  // 1. Process items from inventory
  inventory.forEach(item => {
    const nk = normalizeText(item.title);
    handledKeys.add(nk);
    const sale = salesByNorm.get(nk);
    const sold = sale ? sale.qty : 0;
    const isOld = (item.stock_group || '').toUpperCase() === 'OLD_STOCK';
    const cost = item.unit_purchase_cost_da;
    const price = item.selling_price_da;
    const received = item.quantity_received;
    const available = Math.max(0, received - Number(item.quantity_reserved || 0) - Number(item.quantity_damaged || 0));

    const revenue = sale ? sale.revenue : 0;
    let cogs = 0;
    if (sold > 0) {
      if (cost !== null) {
        cogs = sold * cost;
      } else {
        cogs = revenue * catalogCostRatio;
      }
    }
    const grossProfit = sold > 0 ? (revenue - cogs) : null;
    const targetUnitMargin = cost !== null && price > 0 ? (price - cost) : null;
    const marginPct = (sold > 0 && revenue > 0 && grossProfit !== null)
      ? Math.round((grossProfit / revenue) * 100)
      : (targetUnitMargin !== null && price > 0 ? Math.round((targetUnitMargin / price) * 100) : null);

    totalSalesRev += revenue;
    totalCogs += cogs;
    if (grossProfit !== null) totalGrossProfit += grossProfit;

    if (sold > 0) {
      if (isOld) {
        oldStockSold += sold;
        oldStockRev += revenue;
        oldStockCogs += cogs;
        oldStockProfit += (revenue - cogs);
      } else {
        newStockSold += sold;
        newStockRev += revenue;
        newStockCogs += cogs;
        newStockProfit += (revenue - cogs);
      }
    }

    titleProfits.push({
      title: item.title,
      author: item.author || '-',
      stockGroup: isOld ? 'OLD_STOCK' : 'NEW_STOCK',
      quantitySold: sold,
      quantityOnHand: available,
      unitCost: cost,
      sellingPrice: price,
      targetUnitMargin: targetUnitMargin,
      revenue: Math.round(revenue),
      cogs: Math.round(cogs),
      grossProfit: grossProfit !== null ? Math.round(grossProfit) : null,
      marginPct: marginPct,
      isConfirmed: cost !== null
    });
  });

  // 2. Process historical orders for titles not in physical inventory
  salesByNorm.forEach((sale, nk) => {
    if (handledKeys.has(nk)) return;
    const sold = sale.qty;
    const revenue = sale.revenue;
    const estCost = (sold > 0 && revenue > 0) ? (revenue / sold) * catalogCostRatio : null;
    const cogs = revenue * catalogCostRatio;
    const grossProfit = revenue - cogs;
    const marginPct = Math.round((grossProfit / revenue) * 100);

    totalSalesRev += revenue;
    totalCogs += cogs;
    totalGrossProfit += grossProfit;

    titleProfits.push({
      title: sale.rawTitle,
      author: '-',
      stockGroup: 'HISTORICAL',
      quantitySold: sold,
      quantityOnHand: 0,
      unitCost: estCost !== null ? Math.round(estCost) : null,
      sellingPrice: sold > 0 ? Math.round(revenue / sold) : 0,
      targetUnitMargin: estCost !== null ? Math.round((revenue / sold) - estCost) : null,
      revenue: Math.round(revenue),
      cogs: Math.round(cogs),
      grossProfit: Math.round(grossProfit),
      marginPct: marginPct,
      isConfirmed: false
    });
  });

  console.log(`TOTAL Sales Rev: ${Math.round(totalSalesRev)} DA`);
  console.log(`TOTAL COGS: ${Math.round(totalCogs)} DA`);
  console.log(`TOTAL Gross Profit: ${Math.round(totalGrossProfit)} DA (${Math.round((totalGrossProfit/totalSalesRev)*100)}%)`);
  console.log(`Old Stock: Sold=${oldStockSold}, Rev=${Math.round(oldStockRev)}, Cogs=${Math.round(oldStockCogs)}, Profit=${Math.round(oldStockProfit)}`);
  console.log(`New Stock: Sold=${newStockSold}, Rev=${Math.round(newStockRev)}, Cogs=${Math.round(newStockCogs)}, Profit=${Math.round(newStockProfit)}`);
  console.log(`Total title profits entries: ${titleProfits.length}`);
})();
