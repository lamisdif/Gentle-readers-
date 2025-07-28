const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path'); // <--- أضيفي هذا السطر

const app = express();
const PORT = process.env.PORT || 3000;  // استخدمي هذا لتوافق البيئة

app.use(cors({
  origin: '*', // لو تريدي تسمحي لأي مكان يطلب (غير محصور 127.0.0.1)
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ===== إضافة دعم الملفات الثابتة =====
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// قاعدة البيانات والكود اللي عندك بعدها

// ...

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://127.0.0.1:${PORT}`);
});
