const fs = require('fs');
(async () => {
  const token = fs.readFileSync('scratch/owner_jwt.txt', 'utf8').trim();
  const res = await fetch('https://fsximdllrhglabxbqvay.supabase.co/rest/v1/inventory_items?select=*', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzeGltZGxscmhnbGFieGJxdmF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTg0NzgsImV4cCI6MjA3MjMzNDQ3OH0.KiRJdFoW4DtDAPMLqH9Im3-37GhIFmD269iDsY7ih2Q',
      'Authorization': 'Bearer ' + token
    }
  });
  const items = await res.json();
  console.log('Total items:', items.length);
  let soldSum = 0;
  items.forEach(i => { soldSum += (Number(i.quantity_sold) || 0); });
  console.log('Total quantity_sold across all inventory items:', soldSum);
  const withSold = items.filter(i => (Number(i.quantity_sold) || 0) > 0);
  console.log('Items with quantity_sold > 0:', withSold);
})();
