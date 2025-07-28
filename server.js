const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// ✅ تمكين CORS
app.use(cors({
  origin: 'http://127.0.0.1:8080', // عدّلي هذا إذا فتحتي checkout.html من منفذ مختلف
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// ✅ تمكين قراءة JSON
app.use(express.json());

// ✅ فتح قاعدة البيانات أو إنشاؤها
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Failed to open database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database.');
  }
});

// ✅ إنشاء جدول الطلبات إن لم يكن موجودًا
db.run(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT,
  familyName TEXT,
  phoneNumber TEXT,
  deliveryMethod TEXT,
  items TEXT
)`);

// ✅ استلام الطلب وتخزينه في قاعدة البيانات
app.post('/checkout', (req, res) => {
  const { firstName, familyName, phoneNumber, deliveryMethod, items } = req.body;

  if (!firstName || !phoneNumber || !items || !items.length) {
    return res.status(400).json({
      success: false,
      message: '❌ Invalid request: Missing required fields'
    });
  }

  // نلف الكود اللي يتعامل مع القاعدة بداخل serialize
  db.serialize(() => {
    db.run(
      `INSERT INTO orders (firstName, familyName, phoneNumber, deliveryMethod, items)
       VALUES (?, ?, ?, ?, ?)`,
      [firstName, familyName, phoneNumber, deliveryMethod, JSON.stringify(items)],
      function(err) {
        if (err) {
          console.error('❌ Error inserting order:', err.message);
          return res.status(500).json({ success: false, message: 'Failed to save order.' });
        }

        console.log('✔️ Order saved with ID:', this.lastID);
        res.status(200).json({
          success: true,
          message: '✅ Order saved successfully!',
          orderId: this.lastID
        });
      }
    );
  });
});


// ✅ تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://127.0.0.1:${PORT}`);
});
