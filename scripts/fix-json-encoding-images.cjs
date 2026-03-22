const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'src', 'data', 'books');

const searchHtmlBuffer = execSync('git show HEAD:public/search.html', { encoding: 'buffer' });
const searchHtml = searchHtmlBuffer.toString('utf8');

const indexHtmlBuffer = execSync('git show HEAD:public/index.html', { encoding: 'buffer' });
const indexHtml = indexHtmlBuffer.toString('utf8');

const match = searchHtml.match(/const books = (\{[\s\S]*?\n    \});/);

if (!match) {
  console.error("Could not find books object in search.html");
  process.exit(1);
}

const booksStr = match[1];

let booksObj;
try {
  booksObj = eval('(' + booksStr + ')');
} catch (e) {
  console.error("Error evaluating books object", e);
  process.exit(1);
}

let count = 0;
const entries = fs.readdirSync(SRC_DIR, { withFileTypes: true });

for (const ent of entries) {
  if (!ent.isFile() || !ent.name.endsWith('.json') || ent.name === 'index.json') continue;
  
  const fp = path.join(SRC_DIR, ent.name);
  try {
    let raw = fs.readFileSync(fp, 'utf8');
    if (raw.trim().endsWith('\\n')) {
      raw = raw.replace(/\\n\s*$/, '');
    }
    const data = JSON.parse(raw);
    
    let sourceBook = null;
    const shortSlug = ent.name.replace('.json', '');
    
    for (const [key, b] of Object.entries(booksObj)) {
      const bSlug = key.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (bSlug === shortSlug || b.title === data.title) {
        sourceBook = b;
        break;
      }
    }
    
    if (sourceBook) {
      data.title = sourceBook.title;
      data.author = sourceBook.author;
      data.image = sourceBook.cover || '';
      
      let bestDesc = sourceBook.description_ar;
      if (!bestDesc && sourceBook.description && /[\u0600-\u06FF]/.test(sourceBook.description)) {
        bestDesc = sourceBook.description; 
      }
      if (!bestDesc) {
        const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const titleRegex = new RegExp(`<p class="book-title">\\s*${escapeRegex(sourceBook.title)}\\s*</p>[\\s\\S]*?<p class="summary-text"[^>]*>([\\s\\S]*?)</p>`);
        const idxMatch = indexHtml.match(titleRegex);
        if (idxMatch && idxMatch[1]) {
           bestDesc = idxMatch[1].trim();
        }
      }
      
      if (!bestDesc) {
        bestDesc = sourceBook.description || '';
      }
      
      bestDesc = bestDesc.replace(/\s+/g, ' ').trim();
      
      data.description = bestDesc;
      
      fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
      count++;
    }
  } catch(err) {
    console.error(`Error processing ${ent.name}:`, err);
  }
}

console.log(`Fixed ${count} books.`);
