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

function parseDiscount(data) {
  if (!data) return null;

  let disc = null;
  if (Array.isArray(data.discount) && data.discount.length > 0) {
    disc = data.discount[0];
  } else if (data.discount && typeof data.discount === 'object' && !Array.isArray(data.discount)) {
    disc = data.discount;
  }

  // If enabled/active flag is explicitly set to false, no discount
  if (disc && (disc.active === false || disc.enabled === false)) {
    return null;
  }

  // Direct top-level fields support
  if (!disc && (data.discount_price != null || data.sale_price != null)) {
    disc = {
      original_price: data.original_price ?? data.price,
      discount_price: data.discount_price ?? data.sale_price,
      percentage: data.discount_percentage,
      label: data.discount_label
    };
  }

  if (!disc) return null;

  const rawDiscountPrice = disc.discount_price ?? disc.sale_price;
  if (rawDiscountPrice === undefined || rawDiscountPrice === null || rawDiscountPrice === '') {
    return null;
  }

  const discountPrice = Number(rawDiscountPrice);
  if (isNaN(discountPrice) || discountPrice <= 0) {
    return null;
  }

  const basePrice = Number(data.price) || 0;
  const rawOriginalPrice = (disc.original_price !== undefined && disc.original_price !== null && disc.original_price !== '')
    ? Number(disc.original_price)
    : basePrice;
  const originalPrice = (!isNaN(rawOriginalPrice) && rawOriginalPrice > 0) ? rawOriginalPrice : basePrice;

  // Auto-calculate percentage if missing or 0
  let percentage = Number(disc.percentage);
  if ((isNaN(percentage) || percentage <= 0) && originalPrice > discountPrice && originalPrice > 0) {
    percentage = Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
  } else if (isNaN(percentage)) {
    percentage = 0;
  }

  // Auto-format label: e.g. "خصم 20%" or "-20%"
  let label = disc.label != null ? String(disc.label).trim() : '';
  if (!label && percentage > 0) {
    label = `-${percentage}%`;
  }

  return {
    original_price: originalPrice > 0 ? originalPrice : discountPrice,
    discount_price: discountPrice,
    percentage: percentage,
    label: label
  };
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

    const discountInfo = parseDiscount(data);

    books.push({
      slug,
      title: data.title || '',
      author: data.author || 'Unknown Author',
      // Effective price charged & displayed
      price: discountInfo ? discountInfo.discount_price : (data.price ?? ''),
      original_price: discountInfo ? discountInfo.original_price : (data.price ?? ''),
      discount_price: discountInfo ? discountInfo.discount_price : null,
      discount_percentage: discountInfo ? discountInfo.percentage : null,
      discount_label: discountInfo ? discountInfo.label : '',
      has_discount: Boolean(discountInfo),
      discount: discountInfo,
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
