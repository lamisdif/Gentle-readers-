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
    books.push({
      slug,
      title: data.title || '',
      price: data.price ?? '',
      status: data.status || 'available',
      description: data.description || '',
      image: data.image || '',
      draft: Boolean(data.draft),
    });
  }

  // Remove drafts
  const published = books.filter((b) => !b.draft);

  // Sort: newest first (best effort by filename), otherwise by title
  published.sort((a, b) => {
    const aKey = String(a.slug || '');
    const bKey = String(b.slug || '');
    if (aKey !== bKey) return bKey.localeCompare(aKey);
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify(published, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${published.length} CMS books to ${path.relative(ROOT, OUT_FILE)}`);
}

main();

