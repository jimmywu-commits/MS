'use strict';

/* Browser evidence for the NEW BODA loading changes.
 * node tools/verify-slimming-runtime.js
 * Requires the bundled Playwright runtime and installed Chrome on this workstation.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('C:/Users/jimmy.wu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' };

function safeFile(urlPath) {
  let relative;
  try { relative = decodeURIComponent(urlPath).replace(/^\/+/, ''); } catch (_) { return null; }
  const file = path.resolve(root, relative || 'index.html');
  return file.startsWith(root + path.sep) ? file : null;
}

async function main() {
  if (!fs.existsSync(chromePath)) throw new Error('Chrome executable not found: ' + chromePath);
  const requests = [], external = [], serverErrors = [];
  const server = http.createServer((request, response) => {
    const file = safeFile(new URL(request.url, 'http://localhost').pathname);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      serverErrors.push({ path: request.url, status: 404 }); response.writeHead(404).end('Not found'); return;
    }
    const body = fs.readFileSync(file);
    response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'public, max-age=3600' });
    response.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: chromePath, args: ['--disable-background-networking', '--disable-component-update'] });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on('request', request => requests.push(request.url()));
    await page.route(/^https?:\/\//, route => {
      if (route.request().url().startsWith(origin + '/')) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    const runtimeErrors = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.goto(origin + '/index.html#upload', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.blocksLoadedForImport === true && window.BNCore && BNCore.getBlocks().length === 107 && (!window.APP_LOADING || !APP_LOADING.active), null, { timeout: 60000 });
    const startup = await page.evaluate(() => ({
      blocks: BNCore.getBlocks().length,
      optionalGlobals: { ExcelJS: typeof window.ExcelJS, htmlToImage: typeof window.htmlToImage, JSZip: typeof window.JSZip, legacyFontCss: typeof window.BN_FONTS_EMBED_CSS },
      activeView: document.querySelector('#views > .view.active') && document.querySelector('#views > .view.active').id
    }));
    const initialRequests = requests.slice();
    const eagerOptionalRequests = initialRequests.filter(url => /(?:exceljs|html-to-image|jszip|fonts-embed\.js|export-fonts\/)/i.test(url));
    const schemaSourceRequests = initialRequests.filter(url => /\/blocks\/[^/]+\/block\.json(?:[?#]|$)/.test(url));
    const catalogueRequests = initialRequests.filter(url => /\/blocks\/catalogue\.bundle\.js(?:[?#]|$)/.test(url));

    const operations = await page.evaluate(async () => {
      const optional = {};
      optional.excel = await window.BodaDependencies.ensure('excel');
      optional.capture = await window.BodaDependencies.ensure('capture');
      optional.zip = await window.BodaDependencies.ensure('zip');
      optional.fontSubset = await window.BodaDependencies.ensure('fontSubset');
      const workbookReady = typeof optional.excel.Workbook === 'function';
      const captureReady = typeof optional.capture.toPng === 'function';
      const zipReady = typeof optional.zip === 'function';
      const subsetLoaderReady = typeof optional.fontSubset.forNode === 'function';
      const node = document.createElement('div');
      node.textContent = 'BODA 繁體中文 Shopee 123';
      node.style.cssText = 'position:fixed;left:0;top:0;width:340px;height:80px;padding:8px;background:#f7f7f7;color:#222;font:500 20px/1.4 "ShopeeNotoSans (content)",sans-serif;';
      document.body.appendChild(node);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const fontCss = await optional.fontSubset.forNode(node);
      const png = await optional.capture.toPng(node, { pixelRatio: 1, fontEmbedCSS: fontCss || undefined });
      const zip = new optional.zip(); zip.file('verify.txt', 'ok');
      const zipBytes = await zip.generateAsync({ type: 'uint8array' });
      const workbook = new optional.excel.Workbook();
      const result = { workbookReady, captureReady, zipReady, subsetLoaderReady, fontCssBytes: new Blob([fontCss]).size,
        pngDataUrlLength: png.length, pngHeader: png.slice(0, 30), zipBytes: zipBytes.byteLength, workbookReadyInstance: !!workbook.xlsx };
      node.remove();
      return result;
    });
    const result = {
      generatedAt: new Date().toISOString(), origin, startup, initial: { requestCount: initialRequests.length, eagerOptionalRequests, sourceBlockJsonRequests: schemaSourceRequests.length, catalogueRequests: catalogueRequests.length },
      operations, runtimeErrors, externalRequests: external, serverErrors,
      requests: requests.map(url => ({ url, bytes: (() => { try { const pathname = new URL(url).pathname; const file = safeFile(pathname); return file && fs.existsSync(file) ? fs.statSync(file).size : null; } catch (_) { return null; } })() }))
    };
    result.valid = startup.blocks === 107 && startup.optionalGlobals.ExcelJS === 'undefined' && startup.optionalGlobals.htmlToImage === 'undefined' && startup.optionalGlobals.JSZip === 'undefined' && startup.optionalGlobals.legacyFontCss === 'undefined' && eagerOptionalRequests.length === 0 && schemaSourceRequests.length === 0 && catalogueRequests.length === 1 && external.length === 0 && serverErrors.length === 0 && runtimeErrors.length === 0 && Object.values(operations).every(value => value === true || (typeof value === 'number' && value > 0) || (typeof value === 'string' && value.startsWith('data:image/png;base64,')));
    const outDir = path.join(root, 'output', 'performance'); fs.mkdirSync(outDir, { recursive: true });
    const output = path.join(outDir, 'runtime-verification.json'); fs.writeFileSync(output, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ valid: result.valid, output, startup: result.startup, initial: result.initial, operations: result.operations, runtimeErrors, externalRequests: external, serverErrors }, null, 2));
    if (!result.valid) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
