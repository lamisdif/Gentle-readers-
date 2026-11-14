const SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q";

async function check() {
  const tables = [
    'orders',
    'inventory_items',
    'purchase_batches',
    'debts',
    'debt_repayments',
    'operating_expenses',
    'opening_position',
    'order_meta',
    'order_returns',
    'order_stock_allocations'
  ];

  for (const t of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&limit=1`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY
        }
      });
      const text = await res.text();
      console.log(`Table ${t}: HTTP ${res.status} - ${text.slice(0, 100)}`);
    } catch (e) {
      console.error(`Table ${t}: error ${e.message}`);
    }
  }
}

check();
