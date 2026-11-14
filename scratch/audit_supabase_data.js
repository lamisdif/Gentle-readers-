const https = require('https');

const SUPABASE_URL = 'https://fsximdllrhglabxbqvay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q';

function fetchTable(table) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?select=*`);
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data, count: res.headers['content-range'] });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const orders = await fetchTable('orders');
  console.log('Orders status:', orders.status, 'Content-Range:', orders.count);
  if (orders.status === 200) {
    const parsed = JSON.parse(orders.data);
    console.log('Orders count:', parsed.length);
    let totalRevenue = 0;
    const statusCounts = {};
    parsed.forEach(o => {
      totalRevenue += Number(o.total_price) || 0;
      statusCounts[o.status || 'null'] = (statusCounts[o.status || 'null'] || 0) + 1;
    });
    console.log('Total sales order revenue sum:', totalRevenue);
    console.log('Orders status distribution:', statusCounts);
    console.log('Sample order structure:', Object.keys(parsed[0] || {}));
  }

  // Check management tables as anon (management tables have RLS for owner)
  const tables = ['inventory_items', 'purchase_batches', 'suppliers', 'expenses', 'debts', 'debt_repayments', 'opening_position', 'order_meta', 'order_stock_allocations', 'order_returns'];
  for (const t of tables) {
    const r = await fetchTable(t);
    console.log(`Table ${t}: status ${r.status}, content-range: ${r.count}, data: ${r.data.slice(0, 100)}`);
  }
}

main().catch(console.error);
