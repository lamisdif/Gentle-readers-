const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'data', 'books');
const OUT_FILE = path.join(ROOT, 'public', 'cms-books.json');

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function main() {
  // Process settings.json
  const settingsSrc = path.join(ROOT, 'src', 'data', 'settings.json');
  const settingsOut = path.join(ROOT, 'public', 'settings.json');
  if (fs.existsSync(settingsSrc)) {
    try {
      fs.copyFileSync(settingsSrc, settingsOut);
      console.log('Copied settings.json to public/settings.json');
    } catch (e) {
      console.error('Failed to copy settings.json:', e);
    }
  } else {
    fs.writeFileSync(settingsOut, JSON.stringify({ show_newest_slider: true, newest_books_count: 10 }, null, 2) + '\n', 'utf8');
    console.log('Created default settings.json in public/settings.json');
  }

  if (!fs.existsSync(SRC_DIR)) {
    fs.writeFileSync(OUT_FILE, '[]\n', 'utf8');
    return;
  }

  const entries = fs.readdirSync(SRC_DIR, { withFileTypes: true });
  const books = [];

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!ent.name.toLowerCase().endsWith('.json')) continue;
    if (ent.name.toLowerCase() === 'index.json') continue;

    const fp = path.join(SRC_DIR, ent.name);
    const data = safeReadJson(fp);
    if (!data) continue;

    const slug = path.basename(ent.name, '.json');
    
    // Automatically set out of stock if stock is 0
    let status = data.status || 'available';
    let stock = data.stock !== undefined ? Number(data.stock) : 10;
    if (stock <= 0) {
      status = 'out of stock';
    }

    books.push({
      slug,
      title: data.title || '',
      author: data.author || 'Unknown Author',
      price: data.price ?? '',
      status: status,
      stock: stock,
      description: data.description || '',
      image: data.image || '',
      draft: Boolean(data.draft),
    });
  }

  // Remove drafts
  const published = books.filter((b) => !b.draft);

  // Sort: available books first, then out of stock
  // Within each group: newest first (reverse slug/filename order)
  published.sort((a, b) => {
    const aAvailable = (a.status || 'available').toLowerCase() !== 'out of stock' ? 0 : 1;
    const bAvailable = (b.status || 'available').toLowerCase() !== 'out of stock' ? 0 : 1;
    if (aAvailable !== bAvailable) return aAvailable - bAvailable;
    // Within same status group: reverse slug order (newest files last in alphabet = first here)
    const aKey = String(a.slug || '');
    const bKey = String(b.slug || '');
    if (aKey !== bKey) return bKey.localeCompare(aKey);
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify(published, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${published.length} CMS books to ${path.relative(ROOT, OUT_FILE)}`);
}

main();

