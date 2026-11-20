'use strict';

/* Validate startup/deferred resource behavior in the Shopee editor.
 * node tools/verify-startup-optimization.js
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require('C:/Users/jimmy.wu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ttfBaseline = process.argv.includes('--ttf-baseline');
const gitHtmlCache = new Map();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

function safeFile(urlPath) {
  let relative;
  try { relative = decodeURIComponent(urlPath).replace(/^\/+/, ''); } catch (_) { return null; }
  const file = path.resolve(root, relative || 'index.html');
  return file.startsWith(root + path.sep) ? file : null;
}

async function main() {
  const requests = [], served = [], external = [], errors = [], serverErrors = [];
  const server = http.createServer((request, response) => {
    const file = safeFile(new URL(request.url, 'http://localhost').pathname);
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      serverErrors.push({ path: request.url, status: 404 }); response.writeHead(404).end('Not found'); return;
    }
    let body = fs.readFileSync(file);
    const relative = path.relative(root, file).replace(/\\/g, '/');
    if (ttfBaseline && /^html\/[^/]+\.html$/i.test(relative)) {
      if (!gitHtmlCache.has(relative)) gitHtmlCache.set(relative, execFileSync('git', ['show', 'HEAD:' + relative], { cwd: root, maxBuffer: 8 * 1024 * 1024 }));
      body = gitHtmlCache.get(relative);
    }
    served.push({ relative, bytes: body.length });
    response.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'public, max-age=3600' });
    response.end(body);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: chromePath, args: ['--disable-background-networking', '--disable-component-update'] });
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    page.on('request', request => requests.push({ url: request.url(), local: request.url().startsWith(origin + '/') }));
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:\/\//, route => {
      if (route.request().url().startsWith(origin + '/')) return route.continue();
      external.push(route.request().url()); return route.abort();
    });
    await page.goto(origin + '/index.html', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof window._bnPendingPreviewCount === 'function' && document.querySelectorAll('.preview-block').length > 0, null, { timeout: 60000 });
    await page.waitForTimeout(2200);
    const initialRequestCount = requests.length;
    const initialServed = served.slice();
    const initial = await page.evaluate(() => {
      const frames = Array.from(document.querySelectorAll('.preview-block iframe'));
      return {
        layouts: document.querySelectorAll('.preview-block').length,
        loadedFrames: frames.filter(frame => frame.hasAttribute('src') && !frame.hasAttribute('data-bn-src')).length,
        deferredFrames: frames.filter(frame => frame.hasAttribute('data-bn-src')).length,
        pendingPreviewCount: typeof window._bnPendingPreviewCount === 'function' ? window._bnPendingPreviewCount() : null,
        optionalGlobals: { shadow: typeof window.BNShadow, logoTrim: typeof window.BNLogoTrim, xlsx: typeof window.XLSX, banwordRules: window.banwordEngine ? window.banwordEngine.getRules().length : null },
        backgroundLibrary: typeof window.BNBgLibrary
      };
    });
    const initialUrls = requests.map(item => item.url);
    const banwordBehavior = await page.evaluate(() => window.banwordEngine.transformText('購物金', 'name', {}).text);
    const eagerDeferredFiles = initialUrls.filter(url => /\/(?:bn-shadow-plugin|shadow-plugin|logo-autotrim-plugin)\.js(?:[?#]|$)/.test(url));
    const eagerXlsx = initialUrls.filter(url => /(?:xlsx\.full\.min\.js|banwords\.xlsx)(?:[?#]|$)/i.test(url));
    const eagerBgManifests = initialUrls.filter(url => /\/bgimg\/(?:index|brand)\.json(?:[?#]|$)/i.test(url));
    const initialFonts = initialServed.filter(item => /^fonts\//i.test(item.relative));
    const initialWoff2 = initialFonts.filter(item => /\.woff2$/i.test(item.relative));
    const initialTtf = initialFonts.filter(item => /\.ttf$/i.test(item.relative));

    const fontMetrics = await page.evaluate(async () => {
      const faces = [
        { weight: '300', name: 'Regular' }, { weight: '400', name: 'Medium' }, { weight: '700', name: 'Bold' }
      ];
      const samples = ['SHOPEE BODA 2026', '繁體中文推薦字色，圓標 CTA！123'];
      const output = [];
      for (const item of faces) {
        const ttfFamily = 'Probe TTF ' + item.weight, woffFamily = 'Probe WOFF2 ' + item.weight;
        const ttf = new FontFace(ttfFamily, 'url("/fonts/ShopeeNotoSans(content)-' + item.name + '.ttf")', { weight: item.weight });
        const woff = new FontFace(woffFamily, 'url("/fonts/ShopeeNotoSans(content)-' + item.name + '.woff2")', { weight: item.weight });
        await Promise.all([ttf.load(), woff.load()]); document.fonts.add(ttf); document.fonts.add(woff);
        const widths = samples.map(sample => {
          const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
          ctx.font = item.weight + ' 32px "' + ttfFamily + '"'; const ttfWidth = ctx.measureText(sample).width;
          ctx.font = item.weight + ' 32px "' + woffFamily + '"'; const woffWidth = ctx.measureText(sample).width;
          return { sample, ttfWidth, woffWidth, difference: Math.abs(ttfWidth - woffWidth) };
        });
        output.push({ weight: item.weight, widths });
      }
      return output;
    });

    await page.evaluate(() => window.BNBgLibrary.open());
    await page.waitForFunction(() => document.querySelector('#bn-bg-library-modal, .bn-bg-library-modal, #bn-bg-modal') !== null || window.BNBgLibrary, null, { timeout: 10000 });
    await page.waitForTimeout(1000);
    const afterOpenUrls = requests.map(item => item.url);
    const onDemandBgManifests = afterOpenUrls.filter(url => /\/bgimg\/(?:index|brand)\.json(?:[?#]|$)/i.test(url));
    const optional404Patterns = [/\/img\/ig-shopee-logo-card\.png(?:[?#]|$)/i, /\/bgimg\/brand\.json(?:[?#]|$)/i];
    const optionalMissingFiles = serverErrors.filter(item => optional404Patterns.some(pattern => pattern.test(item.path)));
    const unexpectedServerErrors = serverErrors.filter(item => !optional404Patterns.some(pattern => pattern.test(item.path)));
    await page.goto(origin + '/floating.html', { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => {
      const status = document.getElementById('bw-status');
      return status && /68\s*條/.test(status.textContent || '');
    }, null, { timeout: 30000 });
    const floating = await page.evaluate(() => ({
      status: document.getElementById('bw-status') && document.getElementById('bw-status').textContent,
      rules: window.banwordEngine ? window.banwordEngine.getRules().length : null,
      xlsx: typeof window.XLSX
    }));
    const result = {
      generatedAt: new Date().toISOString(), origin, fontSourceMode: ttfBaseline ? 'git HEAD TTF references' : 'current WOFF2-first references',
      initial: { requestCount: initialRequestCount, localResponseBytes: initialServed.reduce((sum, item) => sum + item.bytes, 0), fontWoff2Bytes: initialWoff2.reduce((sum, item) => sum + item.bytes, 0), fontWoff2Requests: initialWoff2.length, fontTtfBytes: initialTtf.reduce((sum, item) => sum + item.bytes, 0), fontTtfRequests: initialTtf.length, loaded: initial, deferredFilesLoaded: eagerDeferredFiles, xlsxOrRulesWorkbookLoaded: eagerXlsx, backgroundManifestsLoaded: eagerBgManifests },
      banwordBehavior, floating,
      fontMetrics,
      afterOpeningBackgroundLibrary: { manifestRequests: onDemandBgManifests },
      externalRequests: external, runtimeErrors: errors, optionalMissingFiles, unexpectedServerErrors, requests, served: initialServed,
      valid: initial.layouts > 0 && initial.deferredFrames > 0 && initial.loadedFrames > 0 && initial.loadedFrames < initial.layouts && initial.optionalGlobals.shadow === 'undefined' && initial.optionalGlobals.logoTrim === 'undefined' && initial.optionalGlobals.xlsx === 'undefined' && initial.optionalGlobals.banwordRules === 68 && banwordBehavior === '優惠券' && floating.rules === 68 && floating.xlsx === 'undefined' && (ttfBaseline ? initialTtf.length > 0 && initialWoff2.length === 0 : initialWoff2.length > 0 && initialTtf.length === 0) && fontMetrics.every(item => item.widths.every(width => width.difference < 0.01)) && eagerDeferredFiles.length === 0 && eagerXlsx.length === 0 && eagerBgManifests.length === 0 && onDemandBgManifests.length >= 1 && external.length === 0 && errors.length === 0 && unexpectedServerErrors.length === 0
    };
    const outputDirectory = path.join(root, 'output', 'performance'); fs.mkdirSync(outputDirectory, { recursive: true });
    const outputPath = path.join(outputDirectory, ttfBaseline ? 'startup-ttf-baseline.json' : 'startup-verification.json'); fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ valid: result.valid, output: outputPath, initial: result.initial, banwordBehavior, floating, fontMetrics, afterOpeningBackgroundLibrary: result.afterOpeningBackgroundLibrary, externalRequests: external, runtimeErrors: errors, optionalMissingFiles, unexpectedServerErrors }, null, 2));
    if (!result.valid) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
