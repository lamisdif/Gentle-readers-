const SUPABASE_URL = "https://fsximdllrhglabxbqvay.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q";

async function run() {
  console.log('Querying public.orders from Supabase...');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=*`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  console.log(`Orders HTTP status: ${res.status} ${res.statusText}`);
  if (res.ok) {
    const orders = await res.json();
    console.log(`Total orders returned: ${orders.length}`);

    let totalRevenue = 0;
    let nonCancelledRevenue = 0;
    let cancelledCount = 0;
    let cancelledRevenue = 0;

    for (const o of orders) {
      const price = Number(o.total_price) || 0;
      totalRevenue += price;
      if (o.status === 'cancelled') {
        cancelledCount++;
        cancelledRevenue += price;
      } else {
        nonCancelledRevenue += price;
      }
    }

    console.log(`Gross sum of all total_price across ${orders.length} orders: ${totalRevenue.toLocaleString('fr-DZ')} DA`);
    console.log(`Cancelled orders: ${cancelledCount} orders totaling ${cancelledRevenue.toLocaleString('fr-DZ')} DA`);
    console.log(`Non-cancelled orders revenue: ${nonCancelledRevenue.toLocaleString('fr-DZ')} DA`);
  } else {
    console.log('Error:', await res.text());
  }
}

run().catch(console.error);
