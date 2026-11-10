'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const html = path.join(__dirname, 'pyaterka-legend-offline.html');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    fs.createReadStream(html).pipe(res);
  });
  await new Promise(resolve => server.listen(4173, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const app = document.querySelector('#app');
      return app && app.dataset.ok === '1' && app.innerText.trim().length > 20;
    }, { timeout: 15000 });
    const text = await page.locator('#app').innerText();
    if (!text || text.length < 20) throw new Error('Главный экран пустой');
    if (errors.length) throw new Error('Ошибки браузера: ' + errors.join(' | '));
    console.log('Browser smoke OK: app started at 390x844; rendered', text.length, 'characters; no page errors.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exit(1); });
