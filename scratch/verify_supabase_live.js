const SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q";

async function testRpcCalls() {
  console.log('Testing RPC calls with proper parameter signatures as anon (should be 401 permission denied or 403)...');

  const tests = [
    { name: 'reserve_order_stock', body: { p_order_id: 1, p_items: [] } },
    { name: 'confirm_order_delivery', body: { p_order_id: 1 } },
    { name: 'cancel_order', body: { p_order_id: 1 } },
    { name: 'record_order_return', body: { p_order_id: 1, p_items: [], p_condition: 'sellable' } },
    { name: 'transition_order_fulfillment_status', body: { p_order_id: 1, p_new_status: 'processing' } },
    { name: 'update_order_operational_meta', body: { p_order_id: 1 } }
  ];

  for (const t of tests) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${t.name}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(t.body)
    });
    const txt = await res.text();
    console.log(`RPC ${t.name}: HTTP ${res.status} -> ${txt.substring(0, 120)}`);
  }
}

testRpcCalls().catch(console.error);
