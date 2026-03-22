const fs = require('fs');
const path = require('path');

const files = [
  'public/book.js',
  'public/cart.js',
  'public/checkout.js',
  'public/book.html'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Replace const books = { ... }; with let books = {};
    const regex = /const books = \{[\s\S]*?\n\s*\};\n?/g;
    if (regex.test(content)) {
      content = content.replace(regex, "let books = {};\n");
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Replaced hardcoded books in ${file}`);
    } else {
      console.log(`Regex did not match in ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
