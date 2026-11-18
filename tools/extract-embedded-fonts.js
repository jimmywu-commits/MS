'use strict';

/* Extract the exact 400/500/700 WOFF2 payloads already embedded in fonts-embed.js. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'JS', 'fonts-embed.js'), 'utf8');
const prefix = 'data:font/woff2;base64,';
const suffix = ') format("woff2");}';
const payloads = source.split(prefix).slice(1).map(value => {
  const end = value.indexOf(suffix);
  if (end < 0) throw new Error('Embedded WOFF2 face is incomplete');
  return Buffer.from(value.slice(0, end), 'base64');
});
if (payloads.length !== 3 || payloads.some(font => !font.length)) {
  throw new Error('Expected exactly three complete embedded WOFF2 faces');
}
const digest = crypto.createHash('sha256').update(Buffer.concat(payloads)).digest('hex');
const expected = 'faa1382de070dab7a3480786f8885f7bd179bc76f08e69ce984650805dcb69b7';
if (digest !== expected) throw new Error('Font source changed; review and update export subset assets before extraction');
const output = path.join(root, 'fonts', 'woff2');
fs.mkdirSync(output, { recursive: true });
['400', '500', '700'].forEach((weight, index) => {
  const filename = path.join(output, 'ShopeeNotoSans-' + weight + '.woff2');
  fs.writeFileSync(filename, payloads[index]);
  console.log(weight + ': ' + payloads[index].length + ' bytes -> ' + path.relative(root, filename));
});
console.log('Source SHA-256: ' + digest);
