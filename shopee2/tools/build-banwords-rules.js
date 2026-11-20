'use strict';

/* Compile banwords.xlsx with the same SheetJS version and rule converter used
 * by the browser. The deployed editor then fetches a small JSON file instead
 * of downloading SheetJS and parsing XLSX during page startup.
 * Usage: node tools/build-banwords-rules.js
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'banwords.xlsx');
const enginePath = path.join(root, 'js', 'banwords-engine-hbn.js');
const parserPath = path.join(root, 'js', 'vendor', 'xlsx-0.18.5.full.min.js');
const outputPath = path.join(root, 'banwords.rules.json');
const infoPath = path.join(root, 'banwords.rules.build-info.json');
const XLSX = require(parserPath);
const browserGlobal = { XLSX, console };
browserGlobal.window = browserGlobal;
vm.runInNewContext(fs.readFileSync(enginePath, 'utf8'), browserGlobal, { filename: enginePath });

const source = fs.readFileSync(sourcePath);
const arrayBuffer = source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
const rules = browserGlobal.banwordEngine.loadRulesFromExcelArrayBuffer(arrayBuffer);
const json = JSON.stringify(rules, null, 2) + '\n';
fs.writeFileSync(outputPath, json);
const info = {
  source: 'banwords.xlsx',
  sourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
  parser: 'SheetJS ' + XLSX.version,
  converter: 'js/banwords-engine-hbn.js',
  rules: rules.length,
  outputBytes: Buffer.byteLength(json),
  outputSha256: crypto.createHash('sha256').update(json).digest('hex')
};
const infoJson = JSON.stringify(info, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== json ||
      !fs.existsSync(infoPath) || fs.readFileSync(infoPath, 'utf8') !== infoJson) {
    console.error('Generated banword rules are stale; run node tools/build-banwords-rules.js');
    process.exitCode = 1;
  } else console.log('PASS: ' + rules.length + ' rules match banwords.xlsx / SheetJS ' + XLSX.version);
} else {
  fs.writeFileSync(outputPath, json);
  fs.writeFileSync(infoPath, infoJson);
  console.log('Built ' + rules.length + ' rules / ' + Buffer.byteLength(json) + ' bytes / SheetJS ' + XLSX.version);
}
