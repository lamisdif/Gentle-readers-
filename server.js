const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ إعدادات CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// ✅ إعدادات قراءة JSON
app.use(express.json());

// ✅ دعم الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// ✅ صفحة البداية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ✅ فتح قاعدة البيانات
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('❌ Failed to open database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database.');
  }
});

// ✅ إنشاء الجدول إذا لم يكن موجودًا
db.run(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firstName TEXT,
  familyName TEXT,
  phoneNumber TEXT,
  deliveryMethod TEXT,
  items TEXT
)`);

// ✅ نقطة استقبال الطلبات (المفقودة سابقًا!)
app.post('/checkout', (req, res) => {
  const { firstName, familyName, phoneNumber, deliveryMethod, items } = req.body;

  if (!firstName || !phoneNumber || !items || !items.length) {
    return res.status(400).json({
      success: false,
      message: '❌ Invalid request: Missing required fields'
    });
  }

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

// ✅ بدء تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://127.0.0.1:${PORT}`);
});
