const fs = require('fs');
const { execSync } = require('child_process');

const indexHtmlBuffer = execSync('git show HEAD:public/index.html', { encoding: 'buffer' });
const indexHtml = indexHtmlBuffer.toString('utf8');

const title = 'المريض';
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const titleRegex = new RegExp(`<p class="book-title">\\s*${escapeRegex(title)}\\s*</p>[\\s\\S]*?<p class="summary-text"[^>]*>([\\s\\S]*?)</p>`);
const match = indexHtml.match(titleRegex);

console.log(match ? match[1].trim() : 'NO MATCH');
