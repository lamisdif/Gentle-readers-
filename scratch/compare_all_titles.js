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

  console.log('--- SAMPLE OF ALL UNIQUE TITLES IN ORDERS ---');
  const orderTitles = new Map();
  orders.forEach(o => {
    let items = o.items;
    if (typeof items === 'string') {
      try { items = JSON.parse(items); } catch(e) { items = [items]; }
    }
    if (!Array.isArray(items)) items = [items];
    items.forEach(it => {
      let t = '';
      let q = 1;
      if (typeof it === 'string') {
        const m = it.match(/^(.*?)(?:\s*[×x*]\s*(\d+))?$/);
        t = m ? m[1].trim() : it.trim();
        q = m && m[2] ? parseInt(m[2], 10) : 1;
      } else if (typeof it === 'object' && it) {
        t = (it.title || it.name || '').trim();
        q = Number(it.quantity || it.qty || 1);
      }
      if (t) {
        orderTitles.set(t, (orderTitles.get(t) || 0) + q);
      }
    });
  });

  console.log('Total unique ordered title strings:', orderTitles.size);
  const sorted = Array.from(orderTitles.entries()).sort((a,b) => b[1] - a[1]);
  console.log('Top 20 most ordered titles:');
  sorted.slice(0, 20).forEach(([t, q]) => console.log(`  ${t}: ${q} copies`));

  console.log('\n--- INVENTORY TITLES (OLD STOCK) ---');
  os.forEach(r => {
    const t = r.Title || r['عنوان'];
    if (t) console.log(`  ${t} (cost: ${r['Original purchase cost per copy (DA)']}, sell: ${r['Selling price (DA)']})`);
  });

  console.log('\n--- INVENTORY TITLES (NEW BATCH) ---');
  nb.forEach(r => {
    const t = r.Title || r['عنوان'];
    if (t) console.log(`  ${t} (cost: ${r['Unit purchase cost (DA)']}, sell: ${r['Selling price (DA)']})`);
  });
})();
