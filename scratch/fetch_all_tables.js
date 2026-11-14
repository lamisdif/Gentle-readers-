const fs = require('fs');

(async () => {
  const token = fs.readFileSync('scratch/owner_jwt.txt', 'utf8').trim();
  const SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q";

  const tables = [
    'suppliers',
    'purchase_batches',
    'inventory_items',
    'order_meta',
    'order_returns',
    'operating_expenses',
    'debts',
    'debt_repayments',
    'order_stock_allocations',
    'opening_position'
  ];

  for (const t of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`Table ${t}: HTTP ${res.status}, rows = ${data.length}`);
      if (data.length > 0 && data.length <= 5) {
        console.log(`  Data:`, data);
      } else if (data.length > 5) {
        console.log(`  Sample 1st row:`, data[0]);
      }
    } else {
      console.log(`Table ${t}: HTTP ${res.status} - ${await res.text()}`);
    }
  }
})();
