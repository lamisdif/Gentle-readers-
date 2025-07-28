const sqlite3 = require('sqlite3').verbose();

// Connect to the database
let db = new sqlite3.Database('./orders.db', (err) => {
  if (err) {
    return console.error('Connection error:', err.message);
  }
  console.log('Connected to the orders.db SQlite database.');
});

// List all tables
db.all("SELECT * FROM checkout_orders LIMIT 5", [], (err, rows) => {
  if (err) {
    throw err;
  }
  console.log('First 5 rows from checkout_orders:', rows);
  db.close();
}); 