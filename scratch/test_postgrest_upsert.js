const SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q";

async function testUpsert() {
  const item = {
    id: "test_item_1",
    title: "Test Book",
    stock_group: "NEW_STOCK",
    quantity_received: 1
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/inventory_items`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(item)
  });

  console.log('Status without on_conflict:', res.status);
  console.log('Body:', await res.text());

  const res2 = await fetch(`${SUPABASE_URL}/rest/v1/inventory_items?on_conflict=id`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation'
    },
    body: JSON.stringify(item)
  });

  console.log('Status with on_conflict=id:', res2.status);
  console.log('Body:', await res2.text());
}

testUpsert();
