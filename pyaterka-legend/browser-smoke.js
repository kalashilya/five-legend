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
    page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource: net::ERR_BLOCKED_BY_RESPONSE\.NotSameOrigin/.test(message.text())) errors.push(message.text()); });
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const app = document.querySelector('#app');
      return app && app.dataset.ok === '1' && app.innerText.trim().length > 20;
    }, null, { timeout: 15000 });
    const text = await page.locator('#app').innerText();
    if (!text || text.length < 20) throw new Error('Главный экран пустой');
    const layouts = [];
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(80);
      const metrics = await page.evaluate(() => {
        const app = document.querySelector('#app');
        const hero = document.querySelector('.home-hero');
        const lineup = document.querySelector('.lineup');
        const cards = lineup ? [...lineup.children].map(el => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width, center: r.left + r.width / 2, transform: getComputedStyle(el).transform };
        }) : [];
        const hr = hero?.getBoundingClientRect();
        const hud = document.querySelector('#hud > .wrap')?.getBoundingClientRect();
        const headerCenterError = hud ? Math.abs((hud.left + hud.right) / 2 - innerWidth / 2) : Infinity;
        return {
          width: innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          appReady: app?.dataset.ok === '1',
          arenaSvg: !!document.querySelector('.arena-art'),
          heroVisible: !!hr && hr.width > 0 && hr.height > 0,
          heroInside: !!hr && hr.left >= -1 && hr.right <= innerWidth + 1,
          headerCentered: headerCenterError <= 1,
          headerCenterError,
          heroArt: !!document.querySelector('.home-hero__art'),
          lineupCards: cards,
          scenePosition: getComputedStyle(document.querySelector('#scene')).position
        };
      });
      if (!metrics.appReady || !metrics.arenaSvg || !metrics.heroVisible || !metrics.heroInside || !metrics.headerCentered || !metrics.heroArt) throw new Error('Некорректная сцена/главная при ширине ' + viewport.width + ': ' + JSON.stringify(metrics));
      if (metrics.scrollWidth > viewport.width + 1) throw new Error('Горизонтальный выезд страницы при ширине ' + viewport.width + ': ' + JSON.stringify(metrics));
      if (metrics.scenePosition !== 'fixed') throw new Error('Фон арены должен быть закреплён независимо от прокрутки');
      for (let i = 0; i < metrics.lineupCards.length; i++) {
        const card = metrics.lineupCards[i];
        if (card.width <= 0 || card.transform !== 'none') throw new Error('Нестабильная геометрия карточки состава при ширине ' + viewport.width);
        if (i && metrics.lineupCards[i - 1].center >= card.center) throw new Error('Нарушен порядок карточек состава при ширине ' + viewport.width);
      }
      layouts.push(viewport.width + 'px');
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#tabs button[data-v="col"]').click();
    await page.waitForFunction(() => document.querySelector('#app')?.dataset.tab === 'col');
    const card = page.locator('#col-grid button').first();
    const before = await card.boundingBox();
    if (!before) throw new Error('Не найдена карточка для проверки 3D hover');
    await card.hover();
    await page.waitForTimeout(240);
    const after = await card.boundingBox();
    const depth = await card.evaluate(el => ({
      outer: getComputedStyle(el).transform,
      card: getComputedStyle(el.querySelector('.pc')).transform,
      layer: getComputedStyle(el.querySelector('.pc .hd')).transform
    }));
    if (!after || Math.abs(before.x - after.x) > 0.5 || Math.abs(before.y - after.y) > 0.5 ||
        Math.abs(before.width - after.width) > 0.5 || Math.abs(before.height - after.height) > 0.5 ||
        depth.outer !== 'none' || depth.card !== 'none' || depth.layer === 'none') {
      throw new Error('3D hover должен поднимать только внутренний слой карточки, не сдвигая её контейнер: ' + JSON.stringify({ before, after, depth }));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const sections = [
      { tab: 'col', selector: '.grid', label: 'Коллекция' },
      { tab: 'packs', selector: '.pk', label: 'Кейсы' },
      { tab: 'play', selector: '.sqtab, .btn.go', label: 'Матчи' },
      { tab: 'prof', selector: '.stats, .prow, .pn', label: 'Профиль' }
    ];
    for (const section of sections) {
      await page.locator('#tabs button[data-v="' + section.tab + '"]').click();
      await page.waitForFunction(tab => document.querySelector('#app')?.dataset.tab === tab, section.tab);
      const sectionState = await page.evaluate(selector => ({
        text: document.querySelector('#app')?.innerText?.trim() || '',
        content: !!document.querySelector('#app ' + selector),
        scrollWidth: document.documentElement.scrollWidth,
        width: innerWidth
      }), section.selector);
      if (sectionState.text.length < 20 || !sectionState.content) throw new Error(section.label + ': раздел не отрисовался корректно');
      if (sectionState.scrollWidth > sectionState.width + 1) throw new Error(section.label + ': горизонтальное переполнение на мобильном экране');
    }
    if (errors.length) throw new Error('Ошибки браузера: ' + errors.join(' | '));
    console.log('Browser smoke OK: responsive layouts ' + layouts.join(', ') + '; home, collection, cases, matches and profile rendered; no overflow or layout displacement; 3D hover lifts only an inner card layer; no page errors.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exit(1); });
