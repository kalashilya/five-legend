// Verify final mobile lobby spacing and all core redesigned screens.
// Browser smoke coverage for the approved four-screen arena redesign.
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
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const app = document.querySelector('#app');
      return app && app.dataset.ok === '1' && app.innerText.trim().length > 20;
    }, null, { timeout: 15000 });
    /* заставка и всплывающие окна при первом входе (вход в аккаунт, награда дня) перекрывают экран — закрываем */
    await page.waitForFunction(() => !document.querySelector('#intro'), null, { timeout: 20000 });
    for (let i = 0; i < 4; i++) { const closed = await page.evaluate(() => { const b = document.querySelector('#sheet:not([hidden]) [data-act="close"]'); if (b) b.click(); return !!b; }); if (!closed) break; await page.waitForTimeout(250); }

    const layouts = [];
    const shotDir = path.join(__dirname, 'artifacts');
    fs.mkdirSync(shotDir, { recursive: true });
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      const metrics = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        appReady: document.querySelector('#app')?.dataset.ok === '1',
        hero: (() => { const r = document.querySelector('.hm-league')?.getBoundingClientRect(); return !!r && r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= innerWidth + 1; })(),
        arena: !!document.querySelector('.arena-art'),
        lineup: !!document.querySelector('.lobby-lineup'),
        nav: document.querySelectorAll('#tabs button').length,
        overflow: [...document.querySelectorAll('body *')].map(el => { const r=el.getBoundingClientRect(); return { tag:el.tagName, id:el.id, cls:typeof el.className==='string'?el.className.slice(0,100):'', left:Math.round(r.left), right:Math.round(r.right), width:Math.round(r.width), scrollWidth:el.scrollWidth }; }).filter(x => x.width > 0 && (x.left < -1 || x.right > innerWidth + 1)).slice(0,18)
      }));
      if (!metrics.appReady || !metrics.hero || !metrics.arena || !metrics.lineup || metrics.nav !== 5) {
        throw new Error('Главный экран не прошёл проверку при ширине ' + viewport.width + ': ' + JSON.stringify(metrics));
      }
      if (metrics.scrollWidth > viewport.width + 1) {
        await page.screenshot({ path: path.join(shotDir, 'overflow-' + viewport.width + '.png'), fullPage: true });
        throw new Error('Горизонтальное переполнение главной при ширине ' + viewport.width + ': ' + JSON.stringify(metrics.overflow));
      }
      await page.screenshot({ path: path.join(shotDir, 'home-' + viewport.width + '.png'), fullPage: true });
      layouts.push(viewport.width + 'px');
    }

    const sections = [
      { tab: 'col', selector: '.collection-hero', label: 'Коллекция' },
      { tab: 'play', selector: '.match-hero', label: 'Матчи' },
      { tab: 'prof', selector: '.pf-hero', label: 'Профиль' },
      { tab: 'fr', selector: '.fr-tabs', label: 'Друзья' },
      { tab: 'packs', selector: '.pk', label: 'Кейсы' }
    ];
    for (const section of sections) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator(section.tab === 'prof' ? '#hud button.who' : '#tabs button[data-v="' + section.tab + '"]').click();
      await page.waitForFunction(tab => document.querySelector('#app')?.dataset.tab === tab, section.tab);
      await page.waitForFunction(selector => !!document.querySelector('#app ' + selector), section.selector);
      const state = await page.evaluate(() => ({
        text: document.querySelector('#app')?.innerText?.trim() || '',
        scrollWidth: document.documentElement.scrollWidth,
        width: innerWidth,
        mastWidth: document.querySelector('#app .section-mast')?.getBoundingClientRect().width || 0,
        strayCss: document.body.innerText.includes('/* ===== FINAL ART PASS')
      }));
      if (state.text.length < 20) throw new Error(section.label + ': экран пустой');
      if (state.scrollWidth > state.width + 1) throw new Error(section.label + ': горизонтальное переполнение');
      if (state.mastWidth < state.width * .85) throw new Error(section.label + ': шапка раздела слишком узкая: ' + state.mastWidth + ' / ' + state.width);
      if (state.strayCss) throw new Error(section.label + ': CSS-стили попали в видимую разметку');
      if (errors.length) throw new Error('JavaScript errors: ' + errors.join(' | '));
      await page.screenshot({ path: path.join(shotDir, section.tab + '-390.png'), fullPage: true });
    }
    if (errors.length) throw new Error('JavaScript errors: ' + errors.join(' | '));
    console.log('Browser smoke OK: home responsive at 390/768/1440; collection, matches, profile, friends and cases rendered at 390; no horizontal overflow or uncaught page errors.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exit(1); });
