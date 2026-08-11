const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'data', 'books');
const OUT_FILE = path.join(ROOT, 'public', 'cms-books.json');
const SETTINGS_SRC = path.join(ROOT, 'src', 'data', 'settings.json');
const SETTINGS_OUT = path.join(ROOT, 'public', 'settings.json');

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Bulk fetch git commit timestamps for all book files in ONE single git call
function getGitTimestampsMap() {
  const map = {};
  try {
    const output = execSync('git log --format="COMMIT:%ct" --name-only -- "src/data/books/*.json"', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    
    let currentTs = 0;
    const lines = output.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('COMMIT:')) {
        currentTs = parseInt(trimmed.substring(7), 10) * 1000 || 0;
      } else if (currentTs > 0 && trimmed.endsWith('.json')) {
        const basename = path.basename(trimmed);
        if (!map[basename]) {
          map[basename] = currentTs; // First time seen = latest commit time
        }
      }
    }
  } catch (e) {
    console.warn('Git timestamps map warning:', e.message);
  }
  return map;
}

function main() {
  // Sync settings.json to public/
  if (fs.existsSync(SETTINGS_SRC)) {
    try {
      fs.copyFileSync(SETTINGS_SRC, SETTINGS_OUT);
      console.log('Copied settings.json to public/settings.json');
    } catch (e) {
      console.error('Failed to copy settings.json:', e);
    }
  }

  if (!fs.existsSync(SRC_DIR)) {
    fs.writeFileSync(OUT_FILE, '[]\n', 'utf8');
    return;
  }

  const gitMap = getGitTimestampsMap();
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
    const stat = fs.statSync(fp);
    
    // Determine timestamp: 1) data.date, 2) git commit timestamp, 3) file mtime
    let createdTime = 0;
    if (data.date) {
      const d = new Date(data.date).getTime();
      if (!isNaN(d) && d > 0) createdTime = d;
    }
    if (!createdTime) {
      createdTime = gitMap[ent.name] || 0;
    }
    if (!createdTime) {
      createdTime = stat.mtimeMs || 0;
    }

    let img = data.image || '';
    if (img.startsWith('/')) {
      img = img.substring(1);
    }

    books.push({
      slug,
      title: data.title || '',
      author: data.author || 'Unknown Author',
      price: data.price ?? '',
      status: data.status || 'available',
      stock: data.stock !== undefined ? Number(data.stock) : 10,
      featured: Boolean(data.featured),
      description: data.description || '',
      image: img,
      draft: Boolean(data.draft),
      createdTime: createdTime
    });
  }

  // Remove drafts
  const published = books.filter((b) => !b.draft);

  // Sort strictly by createdTime DESCENDING (Newest added/modified books FIRST on Page 1)
  published.sort((a, b) => {
    if (b.createdTime !== a.createdTime) {
      return b.createdTime - a.createdTime;
    }
    return String(a.title || '').localeCompare(String(b.title || ''));
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify(published, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${published.length} CMS books (newest-first) to ${path.relative(ROOT, OUT_FILE)}`);
}

main();
