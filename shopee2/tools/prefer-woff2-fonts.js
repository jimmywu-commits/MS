'use strict';

/* Put existing WOFF2 files first while retaining the TTF fallback.
 * node tools/prefer-woff2-fonts.js
 * node tools/prefer-woff2-fonts.js --check
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const htmlDirectory = path.join(root, 'html');
const targets = fs.readdirSync(htmlDirectory, { withFileTypes: true })
  .filter(item => item.isFile() && /\.html$/i.test(item.name))
  .map(item => path.join(htmlDirectory, item.name));
targets.push(path.join(root, 'floating.html'), path.join(root, 'color', 'color-tool.html'));

const sourcePattern = /url\(\s*(['"])([^'"]*ShopeeNotoSans\(content\)-(?:Regular|Medium|Bold))\.ttf\1\s*\)\s*format\(\s*(['"])truetype\3\s*\)/gi;
const directFontFacePattern = /url\(\s*(fonts\/ShopeeNotoSans\(content\)-(?:Regular|Medium|Bold))\.ttf\s*\)/gi;
let changed = 0, converted = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const original = fs.readFileSync(file, 'utf8');
  let content = original.replace(/@font-face\s*\{[^}]*\}/gi, face => {
    if (/ShopeeNotoSans\(content\)-(?:Regular|Medium|Bold)\.woff2/i.test(face)) return face;
    return face.replace(sourcePattern, (_, quote, stem, formatQuote) => {
      converted++;
      return 'url(' + quote + stem + '.woff2' + quote + ') format(' + formatQuote + 'woff2' + formatQuote + '),' +
        'url(' + quote + stem + '.ttf' + quote + ') format(' + formatQuote + 'truetype' + formatQuote + ')';
    });
  });
  content = content.replace(directFontFacePattern, (_, stem) => {
    converted++;
    return 'url(' + stem + '.woff2)';
  });
  if (content !== original) {
    if (process.argv.includes('--check')) {
      console.error('Unconverted font source: ' + path.relative(root, file));
      process.exitCode = 1;
    } else {
      fs.writeFileSync(file, content, 'utf8');
      changed++;
    }
  }
}
if (!process.argv.includes('--check')) console.log('Updated ' + changed + ' HTML files; WOFF2 sources enabled: ' + converted);
