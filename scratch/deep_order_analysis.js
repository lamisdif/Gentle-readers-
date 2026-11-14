(async () => {
  const res = await fetch('https://fsximdllrhglabxbqvay.supabase.co/rest/v1/orders?select=*', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q'
    }
  });
  const orders = await res.json();
  console.log('Total orders:', orders.length);

  // Load inventory from Excel
  const fs = require('fs');
  const XLSX = require('../public/manager/vendor/xlsx.full.min.js');
  const wb = XLSX.read(fs.readFileSync('C:\\Users\\DELL PRO\\Desktop\\Gentle_Readers_Inventory_Starterhereeeee.xlsx'), { type: 'buffer' });
  const nb = XLSX.utils.sheet_to_json(wb.Sheets['NEW BATCH']);
  const os = XLSX.utils.sheet_to_json(wb.Sheets['OLD STOCK']);

  const invTitles = new Map();
  nb.forEach(r => {
    const t = String(r.Title || r['عنوان'] || '').trim().toLowerCase();
    if (t) invTitles.set(t, { cost: Number(r['Unit purchase cost (DA)']), price: Number(r['Selling price (DA)']), group: 'NEW_BATCH' });
  });
  os.forEach(r => {
    const t = String(r.Title || r['عنوان'] || '').trim().toLowerCase();
    if (t) invTitles.set(t, { cost: Number(r['Original purchase cost per copy (DA)']), price: Number(r['Selling price (DA)']), group: 'OLD_STOCK' });
  });
  console.log('Total unique inventory titles in Excel:', invTitles.size);

  let allOrderedItems = [];
  orders.forEach(o => {
    let items = o.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch(e) { items = [items]; }
    }
    if (!Array.isArray(items)) items = [items];

    items.forEach(it => {
      let rawTitle = '';
      let qty = 1;
      let price = null;
      if (typeof it === 'string') {
        const m = it.match(/^(.*?)(?:\s*[×x*]\s*(\d+))?$/);
        if (m) {
          rawTitle = m[1].trim();
          qty = m[2] ? parseInt(m[2], 10) : 1;
        } else {
          rawTitle = it.trim();
        }
      } else if (typeof it === 'object' && it !== null) {
        rawTitle = (it.title || it.name || '').trim();
        qty = Number(it.quantity || it.qty || 1);
        price = Number(it.price || it.unit_price) || null;
      }
      allOrderedItems.push({ rawTitle, qty, price, orderId: o.id, orderTotal: o.total_price });
    });
  });

  console.log('Total ordered item occurrences:', allOrderedItems.length);
  
  // Calculate average profit margin in old stock
  let totalOsCost = 0, totalOsPrice = 0, countOs = 0;
  for (const [t, data] of invTitles.entries()) {
    if (data.cost && data.price) {
      totalOsCost += data.cost;
      totalOsPrice += data.price;
      countOs++;
    }
  }
  const avgMargin = (totalOsPrice - totalOsCost) / totalOsPrice;
  const avgCostRatio = totalOsCost / totalOsPrice;
  console.log(`Inventory Unit Economics: ${countOs} priced titles. Total Cost: ${totalOsCost}, Total Price: ${totalOsPrice}, Avg Margin: ${(avgMargin*100).toFixed(1)}%, Cost Ratio: ${(avgCostRatio*100).toFixed(1)}%`);

  function norm(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\w\s\u0600-\u06FF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const normInvTitles = new Map();
  for (const [k, v] of invTitles.entries()) {
    normInvTitles.set(norm(k), v);
  }

  let fuzzyMatchedCount = 0;
  let fuzzyMatchedRevenue = 0;
  let fuzzyMatchedCogs = 0;
  let unmatched = [];

  allOrderedItems.forEach(it => {
    const key = norm(it.rawTitle);
    const inv = normInvTitles.get(key) || invTitles.get(it.rawTitle.toLowerCase());
    if (inv && inv.cost) {
      fuzzyMatchedCount += it.qty;
      fuzzyMatchedRevenue += ((it.price || inv.price) * it.qty);
      fuzzyMatchedCogs += (inv.cost * it.qty);
    } else {
      unmatched.push(it);
    }
  });

  console.log(`Matched with norm: ${fuzzyMatchedCount} units, revenue: ${fuzzyMatchedRevenue} DA, COGS: ${fuzzyMatchedCogs.toFixed(2)} DA`);
  console.log('Unmatched count:', unmatched.length);
  console.log('Sample unmatched (first 10):', unmatched.slice(0, 10).map(u => u.rawTitle));


})();
