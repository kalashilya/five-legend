// Снимки 3D-кейсов для значков в игре: node tools/case-icons.js && python3 tools/case-matte.py
// Каждый кейс снимается в reveal-lab.html (#shot=…) на чёрном и белом фоне; case-matte.py делает из пары картинку с прозрачным фоном в vendor/case-*.webp
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'); const lab = path.join(__dirname, '..', 'reveal-lab.html'), out = path.join(__dirname, 'shots'); fs.mkdirSync(out, { recursive: true });
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const k of ['elite', 'pro', 'basic']) for (const bg of ['b', 'w']) { const p = await b.newPage({ viewport: { width: 1100, height: 880 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(`file://${lab}#shot=${k}&bg=${bg}`); await p.waitForFunction(() => window.__shot, null, { timeout: 120000 }); await p.waitForTimeout(500);
    await p.locator('#gl').screenshot({ path: `${out}/case_${k}_${bg}.png` }); console.log(k, bg, errs); await p.close(); }
  await b.close(); })();
