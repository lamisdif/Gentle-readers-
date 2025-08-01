const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// الاتصال بقاعدة PostgreSQL
const pool = new Pool({
  user: 'gentle_readers_user',
  host: 'dpg-d26ehb6uk2gs73c1gclg-a.oregon-postgres.render.com',
  database: 'gentle_readers',
  password: 'IZQv7r0LQaFAdMYmGCaAMgOh39GbqHZ6',
  port: 5432,
  ssl: { rejectUnauthorized: false } // مهم جدًا لـ Render
});

// إعداد CORS و JSON
app.use(cors());
app.use(express.json());

// تقديم الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// إنشاء جدول الطلبات لو مش موجود
pool.query(`
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    firstName TEXT,
    familyName TEXT,
    phoneNumber TEXT,
    deliveryMethod TEXT,
    items JSON
  )
`).then(() => {
  console.log("✅ Table 'orders' is ready");
}).catch((err) => {
  console.error("❌ Failed to create table:", err);
});

// استقبال الطلبات
app.post('/checkout', async (req, res) => {
  const { firstName, familyName, phoneNumber, deliveryMethod, items } = req.body;

  if (!firstName || !phoneNumber || !items || !items.length) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO orders (firstName, familyName, phoneNumber, deliveryMethod, items)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [firstName, familyName, phoneNumber, deliveryMethod, JSON.stringify(items)]
    );

    res.status(200).json({
      success: true,
      message: 'Order saved successfully!',
      orderId: result.rows[0].id
    });
  } catch (err) {
    console.error("❌ Error saving order:", err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
