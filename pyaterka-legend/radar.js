/* ---------- Радар карты: схема проходов, расстановки, маршруты и постановка раунда ----------
   Mirage и Dust II — подробные схемы по реальным картам CS2: те же зоны и проходы (callouts), ширина проходов,
   респауны на 5 мест, расстановки защиты, маршруты атаки, гранаты, места после закладки. Остальные карты — упрощённые.
   Постановка раунда строится из результата движка (L): кто кого и в каком порядке убил, закладка, исход —
   поэтому видно на карте всегда то же, что в счёте. Сам баланс матча здесь не меняется.
   Координаты 0–100, x вправо, y вниз. e: [узел, узел, ширина прохода, 'v' — только обзор (окно), ходить нельзя]. */
const RADAR = {
  Mirage: {
    n: { TS: [86, 46], tMid: [72, 45], mid: [59, 44], midW: [47, 43], win: [35, 41], con: [42, 53], jung: [35, 60], stairs: [44, 63], A: [40, 73], tet: [52, 70], ramp: [63, 65], tRamp: [76, 57], pAlley: [82, 68], pal: [67, 81], palx: [52, 80], tick: [28, 74], ctp: [22, 68], CTS: [14, 60], ctB1: [15, 48], kit: [23, 38], mkt: [16, 29], B: [20, 20], short: [32, 28], cat: [43, 35], tApp: [82, 31], App1: [69, 19], App2: [53, 14], Bapps: [36, 15], side: [61, 27], under: [52, 31] },
    r: { TS: 7, A: 9, B: 8, CTS: 6, mid: 5.5, win: 3.2 },
    tz: ['TS', 'tMid', 'mid', 'tRamp', 'ramp', 'pAlley', 'pal', 'tApp', 'App1', 'App2', 'side', 'under'], ctz: ['CTS', 'ctB1', 'kit', 'mkt', 'ctp', 'tick', 'win', 'jung', 'stairs'],
    e: [['TS', 'tMid', 9], ['tMid', 'mid', 9], ['mid', 'midW', 9], ['midW', 'win', 3.5, 'v'], ['win', 'kit', 5], ['kit', 'ctB1', 6], ['ctB1', 'CTS', 7], ['kit', 'mkt', 6], ['mkt', 'B', 6],
      ['midW', 'con', 6], ['con', 'jung', 6], ['con', 'stairs', 5], ['jung', 'A', 7], ['stairs', 'A', 6], ['TS', 'tRamp', 8], ['tRamp', 'ramp', 7], ['ramp', 'tet', 7], ['tet', 'A', 8],
      ['TS', 'pAlley', 7], ['pAlley', 'pal', 7], ['pal', 'palx', 6], ['palx', 'A', 7], ['A', 'tick', 7], ['tick', 'ctp', 7], ['ctp', 'CTS', 7], ['TS', 'tApp', 7], ['tApp', 'App1', 6],
      ['App1', 'App2', 6], ['App2', 'Bapps', 6], ['Bapps', 'B', 6], ['midW', 'cat', 5], ['cat', 'short', 5], ['short', 'B', 6], ['App1', 'side', 5], ['side', 'under', 5], ['under', 'cat', 5]],
    tr: { A: [['TS', 'tRamp', 'ramp', 'tet', 'A'], ['TS', 'pAlley', 'pal', 'palx', 'A']], B: [['TS', 'tApp', 'App1', 'App2', 'Bapps', 'B'], ['TS', 'tMid', 'mid', 'midW', 'cat', 'short', 'B']], M: ['TS', 'tMid', 'mid'] },
    ct: { A: ['CTS', 'ctp', 'tick', 'A'], B: ['CTS', 'ctB1', 'kit', 'mkt', 'B'], M: ['CTS', 'ctB1', 'kit', 'win'] },
    lb: [['tMid', 'Топ-мид'], ['midW', 'Мид'], ['win', 'Окно'], ['con', 'Коннектор'], ['jung', 'Джангл'], ['tet', 'Тетрис'], ['ramp', 'Рампа'], ['pal', 'Палас'], ['tick', 'Будка'], ['ctp', 'КТ'], ['kit', 'Кухня'], ['mkt', 'Маркет'], ['Bapps', 'Апсы'], ['App2', 'Апартаменты'], ['short', 'Шорт'], ['under', 'Андерпасс'], ['cat', 'Кэт']],
    props: [[42, 77, 1.4, 1.4, 1.2], [26.5, 77.5, 3, 2, 2.6], [37.5, 81, 2.2, 2.2, 1.6], [54, 73.5, 2.4, 1.6, 1.4], [23, 14, 4, 1.8, 2.1], [14, 12, 3, .8, .7], [45.5, 66.5, 1.6, 1.6, 1.3]],
    plan: {
      spT: [[88, 42], [84, 45], [88, 50], [83, 41], [85, 49]], spCT: [[12, 58], [16, 61], [13, 63], [17, 57], [11, 61]],
      /* защита: 0 — снайпер, 1–4 — винтовки; s — какую зону держит */
      ct: (() => { const P = { win: { p: [35, 41], look: [72, 45], s: 'M' }, con: { p: [42, 51], look: [59, 44], s: 'M' }, tick: { p: [30, 75], look: [53, 70], s: 'A' }, jung: { p: [36, 61], look: [48, 77], s: 'A' }, stairs: { p: [43, 64], look: [52, 79], s: 'A' }, triple: { p: [35, 78], look: [56, 69], s: 'A' },
        van: { p: [25, 17], look: [37, 15], s: 'B' }, bench: { p: [15, 15], look: [34, 16], s: 'B' }, plat: { p: [26, 24], look: [34, 29], s: 'B' }, shortc: { p: [31, 27], look: [43, 35], s: 'B' } };
        return { S: [P.win, P.tick, P.jung, P.van, P.plat], A: [P.triple, P.stairs, P.jung, P.con, P.van], B: [P.win, P.tick, P.shortc, P.van, P.bench] }; })(),
      /* атака: r — маршрут по узлам, s — где ждать начала выхода, lurk — люркер (отвлекает, заходит поздно) */
      t: {
        A: [{ r: ['tMid', 'mid', 'midW', 'con', 'stairs', 'A'], s: 2 }, { r: ['tRamp', 'ramp', 'tet', 'A'], s: 1 }, { r: ['tRamp', 'ramp', 'tet', 'A'], s: 1 }, { r: ['tApp', 'App1', 'App2'], s: 2, lurk: 1 }, { r: ['pAlley', 'pal', 'palx', 'A'], s: 1 }],
        B: [{ r: ['tMid', 'mid', 'midW', 'cat', 'short', 'B'], s: 2 }, { r: ['tApp', 'App1', 'App2', 'Bapps', 'B'], s: 2 }, { r: ['tApp', 'App1', 'App2', 'Bapps', 'B'], s: 2 }, { r: ['tRamp', 'ramp'], s: 1, lurk: 1 }, { r: ['tApp', 'App1', 'App2', 'Bapps', 'B'], s: 2 }],
        S: [{ r: ['tMid', 'mid'], s: 1 }, { r: ['tApp', 'App1', 'App2'], s: 2 }, { r: ['tApp', 'App1', 'side'], s: 2 }, { r: ['pAlley', 'pal'], s: 1, lurk: 1 }, { r: ['tRamp', 'ramp'], s: 1 }] },
      /* места после выхода на точку: [0] — закладка */
      fs: { A: [[40, 73], [47, 69], [45, 77], [34, 68], [42, 67]], B: [[21, 20], [22, 25], [18, 16], [28, 20], [15, 22]] },
      /* гранаты выхода: dt — секунды от захода на точку */
      ut: { A: [{ k: 'smoke', p: [23, 68], dt: -1 }, { k: 'smoke', p: [36, 60], dt: -.9 }, { k: 'smoke', p: [43, 63], dt: -.8 }, { k: 'flash', p: [47, 75], dt: -.25 }, { k: 'fire', p: [35, 78], dt: .1 }],
        B: [{ k: 'smoke', p: [32, 28], dt: -1 }, { k: 'smoke', p: [17, 27], dt: -.9 }, { k: 'flash', p: [30, 16], dt: -.25 }, { k: 'fire', p: [24, 17], dt: .1 }] },
      ut0: [{ k: 'smoke', p: [37, 42], t: 2.6 }]
    }
  },
  'Dust II': {
    n: { TS: [56, 88], oLong: [74, 84], lDoors: [84, 71], long: [86, 53], pit: [93, 40], acr: [83, 31], A: [75, 19], extA: [64, 23], CTS: [55, 24], ctMid: [44, 32], mDoors: [46, 41], xbox: [50, 50], mid: [48, 59], tMid: [50, 73], cat: [60, 43], short: [69, 33], bDoors: [32, 28], B: [19, 21], tunEx: [14, 36], upTun: [14, 56], oTun: [23, 77], tRamp: [38, 85], loTun: [33, 63] },
    r: { TS: 7, A: 9, B: 9, CTS: 5.5, oTun: 5, mid: 5 },
    tz: ['TS', 'oLong', 'lDoors', 'tMid', 'mid', 'tRamp', 'oTun', 'upTun', 'loTun'], ctz: ['CTS', 'ctMid', 'extA', 'bDoors'],
    e: [['TS', 'oLong', 8], ['oLong', 'lDoors', 5], ['lDoors', 'long', 8], ['long', 'acr', 9], ['long', 'pit', 5], ['acr', 'A', 9], ['A', 'extA', 8], ['extA', 'CTS', 7], ['CTS', 'ctMid', 7], ['ctMid', 'mDoors', 5],
      ['mDoors', 'xbox', 6], ['xbox', 'mid', 8], ['mid', 'tMid', 7], ['tMid', 'TS', 6], ['xbox', 'cat', 5], ['cat', 'short', 5], ['short', 'A', 6], ['ctMid', 'bDoors', 5], ['bDoors', 'B', 6],
      ['TS', 'tRamp', 7], ['tRamp', 'oTun', 8], ['oTun', 'upTun', 5], ['upTun', 'tunEx', 5], ['tunEx', 'B', 6], ['oTun', 'loTun', 5], ['loTun', 'mid', 5]],
    tr: { A: [['TS', 'oLong', 'lDoors', 'long', 'acr', 'A'], ['TS', 'tMid', 'mid', 'xbox', 'cat', 'short', 'A']], B: [['TS', 'tRamp', 'oTun', 'upTun', 'tunEx', 'B'], ['TS', 'tMid', 'mid', 'xbox', 'mDoors', 'ctMid', 'bDoors', 'B']], M: ['TS', 'tMid', 'mid'] },
    ct: { A: ['CTS', 'extA', 'A'], B: ['CTS', 'ctMid', 'bDoors', 'B'], M: ['CTS', 'ctMid'] },
    lb: [['oLong', 'Аутсайд лонг'], ['lDoors', 'Ворота'], ['long', 'Лонг'], ['pit', 'Пит'], ['acr', 'Крест'], ['tMid', 'Топ-мид'], ['xbox', 'Иксбокс'], ['mDoors', 'Мид-двери'], ['ctMid', 'КТ-мид'], ['cat', 'Шорт'], ['short', 'Ступеньки'], ['bDoors', 'Двери B'], ['upTun', 'Тоннели'], ['tunEx', 'Выход'], ['oTun', 'Аутсайд'], ['loTun', 'Нижние'], ['tRamp', 'Т-рампа'], ['extA', 'КТ']],
    props: [[86, 33, 1.8, 3.6, 1.4], [67.5, 14.5, 1.6, 1.6, 1.4], [53, 52, 1.8, 1.8, 1.6], [23, 16, 1.6, 1.6, 2.6], [21.5, 25.5, 2.2, 2.2, 1.8], [91, 46, 1.6, 1.6, 1.2]],
    plan: {
      spT: [[52, 87], [56, 91], [60, 87], [54, 84], [59, 84]], spCT: [[53, 22], [57, 26], [55, 27], [52, 25], [58, 22]],
      ct: (() => { const P = { doors: { p: [44, 33], look: [48, 60], s: 'M' }, longc: { p: [85, 47], look: [84, 70], s: 'A' }, acr: { p: [80, 26], look: [86, 50], s: 'A' }, goose: { p: [71, 15], look: [69, 33], s: 'A' },
        plat: { p: [14, 15], look: [14, 35], s: 'B' }, car: { p: [15, 27], look: [14, 40], s: 'B' }, bdoor: { p: [29, 26], look: [15, 34], s: 'B' } };
        return { S: [P.doors, P.longc, P.goose, P.plat, P.bdoor], A: [P.acr, P.longc, P.goose, P.doors, P.plat], B: [P.doors, P.longc, P.car, P.plat, P.bdoor] }; })(),
      t: {
        A: [{ r: ['tMid', 'mid', 'xbox', 'cat', 'short', 'A'], s: 2 }, { r: ['oLong', 'lDoors', 'long', 'acr', 'A'], s: 1 }, { r: ['oLong', 'lDoors', 'long', 'acr', 'A'], s: 1 }, { r: ['tRamp', 'oTun'], s: 1, lurk: 1 }, { r: ['tMid', 'mid', 'xbox', 'cat', 'short', 'A'], s: 2 }],
        B: [{ r: ['tMid', 'mid', 'xbox', 'mDoors', 'ctMid', 'bDoors', 'B'], s: 2 }, { r: ['tRamp', 'oTun', 'upTun', 'tunEx', 'B'], s: 2 }, { r: ['tRamp', 'oTun', 'upTun', 'tunEx', 'B'], s: 2 }, { r: ['oLong'], s: 0, lurk: 1 }, { r: ['tRamp', 'oTun', 'upTun', 'tunEx', 'B'], s: 2 }],
        S: [{ r: ['tMid', 'mid'], s: 1 }, { r: ['oLong', 'lDoors'], s: 1 }, { r: ['oLong'], s: 0 }, { r: ['tRamp', 'oTun', 'upTun'], s: 2, lurk: 1 }, { r: ['tRamp', 'oTun', 'loTun'], s: 2 }] },
      fs: { A: [[75, 20], [82, 30], [72, 25], [79, 14], [68, 19]], B: [[19, 21], [17, 14], [24, 17], [12, 21], [25, 24]] },
      ut: { A: [{ k: 'smoke', p: [64, 23], dt: -1 }, { k: 'smoke', p: [70, 31], dt: -.9 }, { k: 'flash', p: [82, 29], dt: -.25 }, { k: 'fire', p: [71, 15], dt: .1 }],
        B: [{ k: 'smoke', p: [31, 27], dt: -1 }, { k: 'smoke', p: [25, 22], dt: -.9 }, { k: 'flash', p: [16, 31], dt: -.25 }, { k: 'fire', p: [14, 16], dt: .1 }] },
      ut0: [{ k: 'smoke', p: [46, 41], t: 2.4 }]
    }
  },
  Inferno: {
    n: { TS: [12, 86], tM: [32, 76], ap: [42, 58], bal: [62, 56], A: [80, 58], m1: [52, 78], sh: [68, 72], bn1: [24, 58], bn2: [34, 34], B: [56, 14], CTS: [88, 28], ctA: [84, 44], ctB: [72, 18], arch: [70, 40] },
    e: [['TS', 'tM'], ['tM', 'ap'], ['ap', 'bal'], ['bal', 'A'], ['tM', 'm1'], ['m1', 'sh'], ['sh', 'A'], ['TS', 'bn1'], ['bn1', 'bn2'], ['bn2', 'B'], ['CTS', 'ctA'], ['ctA', 'A'], ['CTS', 'ctB'], ['ctB', 'B'], ['A', 'arch'], ['arch', 'ctB']],
    tr: { A: [['TS', 'tM', 'ap', 'bal', 'A'], ['TS', 'tM', 'm1', 'sh', 'A']], B: [['TS', 'bn1', 'bn2', 'B'], ['TS', 'bn1', 'bn2', 'B']], M: ['TS', 'tM', 'm1'] },
    ct: { A: ['CTS', 'ctA', 'A'], B: ['CTS', 'ctB', 'B'], M: ['CTS', 'ctA', 'arch'] },
    lb: [['ap', 'Апартаменты'], ['sh', 'Шорт'], ['bn1', 'Банан'], ['arch', 'Арка'], ['m1', 'Мид']]
  },
  Ancient: {
    n: { TS: [50, 90], aM: [30, 74], dn: [28, 50], A: [22, 28], M1: [50, 66], M2: [50, 46], cX: [50, 28], bM: [70, 74], bR: [78, 52], B: [76, 28], CTS: [50, 10], ctA: [30, 16], ctB: [68, 14] },
    e: [['TS', 'aM'], ['aM', 'dn'], ['dn', 'A'], ['TS', 'M1'], ['M1', 'M2'], ['M2', 'cX'], ['M2', 'dn'], ['TS', 'bM'], ['bM', 'bR'], ['bR', 'B'], ['CTS', 'ctA'], ['ctA', 'A'], ['CTS', 'ctB'], ['ctB', 'B'], ['CTS', 'cX'], ['cX', 'ctA'], ['cX', 'ctB']],
    tr: { A: [['TS', 'aM', 'dn', 'A'], ['TS', 'M1', 'M2', 'dn', 'A']], B: [['TS', 'bM', 'bR', 'B'], ['TS', 'M1', 'M2', 'cX', 'ctB', 'B']], M: ['TS', 'M1', 'M2'] },
    ct: { A: ['CTS', 'ctA', 'A'], B: ['CTS', 'ctB', 'B'], M: ['CTS', 'cX', 'M2'] },
    lb: [['aM', 'A-мейн'], ['dn', 'Донат'], ['M2', 'Мид'], ['bR', 'Рампа B'], ['cX', 'Пещера']]
  },
  Anubis: {
    n: { TS: [50, 90], bM: [26, 76], bC: [18, 52], B: [24, 26], aM: [74, 76], aC: [82, 52], A: [76, 24], M1: [50, 68], M2: [50, 46], CTS: [52, 10], ctA: [66, 14], ctB: [36, 14], hv: [64, 40] },
    e: [['TS', 'bM'], ['bM', 'bC'], ['bC', 'B'], ['TS', 'aM'], ['aM', 'aC'], ['aC', 'A'], ['TS', 'M1'], ['M1', 'M2'], ['M2', 'bC'], ['M2', 'hv'], ['hv', 'A'], ['CTS', 'ctA'], ['ctA', 'A'], ['CTS', 'ctB'], ['ctB', 'B'], ['hv', 'ctA']],
    tr: { A: [['TS', 'aM', 'aC', 'A'], ['TS', 'M1', 'M2', 'hv', 'A']], B: [['TS', 'bM', 'bC', 'B'], ['TS', 'M1', 'M2', 'bC', 'B']], M: ['TS', 'M1', 'M2'] },
    ct: { A: ['CTS', 'ctA', 'A'], B: ['CTS', 'ctB', 'B'], M: ['CTS', 'ctA', 'hv'] },
    lb: [['bM', 'B-мейн'], ['aM', 'A-мейн'], ['M2', 'Канал'], ['hv', 'Хевен'], ['bC', 'Коннектор']]
  }
};
const RD_POOL = ['Mirage', 'Dust II', 'Inferno', 'Ancient', 'Anubis'];
const rdMap = n => RADAR[n] || RADAR.Mirage;

/* ---------- Рисунок радара ---------- */
function rdSvg(mapN) {
  const M = rdMap(mapN), P = k => M.n[k];
  const edges = M.e.map(([a, b]) => `M${P(a)[0]} ${P(a)[1]}L${P(b)[0]} ${P(b)[1]}`).join('');
  const site = s => `<g class="rd-site"><circle cx="${P(s)[0]}" cy="${P(s)[1]}" r="10.5"/><text x="${P(s)[0]}" y="${P(s)[1] + 3.6}">${s}</text></g>`;
  const spawn = (k, cl, t) => `<g class="rd-spawn ${cl}"><rect x="${P(k)[0] - 7}" y="${P(k)[1] - 4.5}" width="14" height="9" rx="2.5"/><text x="${P(k)[0]}" y="${P(k)[1] + 1.8}">${t}</text></g>`;
  const lbl = (M.lb || []).map(([k, t]) => `<text class="rd-lbl" x="${P(k)[0]}" y="${P(k)[1] - 5.4}">${t}</text>`).join('');
  let grid = ''; for (let i = 10; i < 100; i += 10) grid += `M${i} 0V100M0 ${i}H100`;
  return `<svg class="rd" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Радар карты ${esc(mapN)}">
    <defs><radialGradient id="rdg" cx="50%" cy="50%" r="65%"><stop offset="0" stop-color="#13283a"/><stop offset="1" stop-color="#060d14"/></radialGradient></defs>
    <rect width="100" height="100" fill="url(#rdg)"/><path d="${grid}" class="rd-grid"/>
    <path d="${edges}" class="rd-w0"/><path d="${edges}" class="rd-w1"/><path d="${edges}" class="rd-w2"/>
    ${site('A')}${site('B')}${spawn('TS', 't', 'T')}${spawn('CTS', 'ct', 'CT')}${lbl}
    <g id="rd-plan"></g><g id="rd-fx"></g><g id="rd-dots"></g><g id="rd-top"></g></svg>`;
}

/* ---------- Геометрия карты: где можно ходить, кто кого видит ----------
   Проходимое — проходы (отрезки с шириной) и площадки вокруг узлов. Всё остальное — дома/стены:
   они и в 3D, и на картинке стоят ровно там, где проходить нельзя, поэтому «видит» = отрезок целиком в проходах. */
const RD_W = 8.6;
const rdEw = e => e[2] || RD_W;
const rdD = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function rdGeo(M) {
  if (M._g) return M._g;
  const segs = M.e.map(e => ({ a: M.n[e[0]], b: M.n[e[1]], h: rdEw(e) / 2, v: e[3] === 'v' })), nr = {};
  for (const k in M.n) nr[k] = (M.r && M.r[k]) || 0;
  for (const e of M.e) if (e[3] !== 'v') for (const k of [e[0], e[1]]) nr[k] = Math.max(nr[k], rdEw(e) / 2);
  const circ = Object.keys(M.n).map(k => ({ c: M.n[k], r: nr[k] }));
  const raw = (x, y) => { let f = -1e9;
    for (const s of segs) { const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (y - s.a[1]) * dy) / l)); f = Math.max(f, s.h - Math.hypot(x - s.a[0] - t * dx, y - s.a[1] - t * dy)); }
    for (const c of circ) f = Math.max(f, c.r - Math.hypot(x - c.c[0], y - c.c[1])); return f; };
  const N = 201, G = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) G[j * N + i] = raw(i / 2, j / 2);
  const adj = {}; for (const k in M.n) adj[k] = [];
  for (const e of M.e) if (e[3] !== 'v') { const l = rdD(M.n[e[0]], M.n[e[1]]); adj[e[0]].push([e[1], l]); adj[e[1]].push([e[0], l]); }
  return (M._g = { segs, circ, nr, raw, G, N, adj, sp: {} });
}
/* запас до стены: >0 — внутри прохода (на столько единиц), <0 — снаружи */
function rdFree(M, p) {
  const g = rdGeo(M), x = p[0] * 2, y = p[1] * 2;
  if (!(x >= 0 && y >= 0 && x < g.N - 1 && y < g.N - 1)) return g.raw(p[0], p[1]);
  const i = x | 0, j = y | 0, fx = x - i, fy = y - j, G = g.G, N = g.N;
  return (G[j * N + i] * (1 - fx) + G[j * N + i + 1] * fx) * (1 - fy) + (G[(j + 1) * N + i] * (1 - fx) + G[(j + 1) * N + i + 1] * fx) * fy;
}
/* прямая видимость: весь отрезок проходит по открытому месту (с запасом m от стен) */
function rdLos(M, a, b, m = .6) {
  const L = rdD(a, b), n = Math.ceil(L / .7);
  for (let s = 1; s < n; s++) { const k = s / n; if (rdFree(M, [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]) < m) return false; }
  return true;
}
/* точка внутрь прохода, если оказалась у стены */
function rdSnap(M, p, m = 1) {
  if (rdFree(M, p) >= m) return p.slice(); const g = rdGeo(M); let best = null, bd = 1e9;
  for (const s of g.segs) { if (s.v) continue; const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dy) / l)), c = [s.a[0] + t * dx, s.a[1] + t * dy], d = rdD(c, p), q = d > 1e-6 ? Math.max(0, s.h - m) / d : 0, r = d <= s.h - m ? p : [c[0] + (p[0] - c[0]) * q, c[1] + (p[1] - c[1]) * q]; const dd = rdD(r, p); if (dd < bd) { bd = dd; best = r; } }
  for (const c of g.circ) { const d = rdD(c.c, p), q = d > 1e-6 ? Math.max(0, c.r - m) / d : 0, r = d <= c.r - m ? p : [c.c[0] + (p[0] - c.c[0]) * q, c.c[1] + (p[1] - c.c[1]) * q]; const dd = rdD(r, p); if (dd < bd) { bd = dd; best = r; } }
  return best ? best.slice() : p.slice();
}
/* ближайший узел, до которого видно напрямую */
function rdNear(M, p) { let best = null, bd = 1e9; for (const k in M.n) { const d = rdD(M.n[k], p) + (rdLos(M, p, M.n[k], .3) ? 0 : 1000); if (d < bd) { bd = d; best = k; } } return best; }
/* side: 'T' избегает тыла защиты, 'CT' — территории атаки (стоимость прохода через чужую зону ×4) */
function rdRoute(M, a, b, side) {
  const g = rdGeo(M), key = a + '>' + b + (side || ''); if (g.sp[key]) return g.sp[key];
  const bad = new Set(side === 'T' ? M.ctz || [] : side === 'CT' ? M.tz || [] : []), w = k => bad.has(k) && k !== a && k !== b ? 4 : 1;
  const D = { [a]: 0 }, prev = {}, Q = new Set(Object.keys(M.n));
  while (Q.size) { let u = null; for (const k of Q) if (D[k] != null && (u == null || D[k] < D[u])) u = k; if (u == null || u === b) break; Q.delete(u);
    for (const [v, l] of g.adj[u]) if (Q.has(v) && (D[v] == null || D[u] + l * w(v) < D[v])) { D[v] = D[u] + l * w(v); prev[v] = u; } }
  const r = [b]; while (r[0] !== a && prev[r[0]]) r.unshift(prev[r[0]]); return (g.sp[key] = r[0] === a ? r : [a, b]);
}
/* сглаживание: срезаем углы, пока видно следующую точку */
function rdPull(M, P) {
  const out = [P[0]]; let i = 0;
  while (i < P.length - 1) { let j = P.length - 1; while (j > i + 1 && !rdLos(M, P[i], P[j], 1.1)) j--; out.push(P[j]); i = j; }
  return out;
}
/* путь между любыми точками по проходам */
function rdPath(M, p, q, side) { if (rdLos(M, p, q, 1.1)) return [p, q]; const r = rdRoute(M, rdNear(M, p), rdNear(M, q), side); return rdPull(M, [p, ...r.map(k => M.n[k]), q]); }
/* путь через заданные узлы */
function rdChain(M, p, nodes, q, side) { let P = [p], cur = p; for (const k of nodes) { const s = rdPath(M, cur, M.n[k], side); P = P.concat(s.slice(1)); cur = M.n[k]; } if (q) P = P.concat(rdPath(M, cur, q, side).slice(1)); return rdPull(M, P); }
const rdLen = P => { let l = 0; for (let i = 1; i < P.length; i++) l += rdD(P[i - 1], P[i]); return l; };
function rdAlong(P, k) {
  if (P.length < 2) return P[0].slice(); let d = clamp(k, 0, 1) * rdLen(P);
  for (let i = 1; i < P.length; i++) { const s = rdD(P[i - 1], P[i]); if (d <= s || i === P.length - 1) { const q = s ? Math.min(1, d / s) : 1; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * q, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * q]; } d -= s; }
  return P[P.length - 1].slice();
}
/* обрезать путь с конца на back единиц */
function rdTrim(P, back) { const L = rdLen(P); if (back <= 0 || L < .01) return P; const k = Math.max(0, L - back), out = [P[0]]; let d = 0;
  for (let i = 1; i < P.length; i++) { const s = rdD(P[i - 1], P[i]); if (d + s >= k) { const q = s ? (k - d) / s : 0; out.push([P[i - 1][0] + (P[i][0] - P[i - 1][0]) * q, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * q]); return out; } out.push(P[i]); d += s; } return out; }
const rdEase = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const rdPts = (M, names) => names.map(k => M.n[k]);

/* ---------- Позиция и взгляд игрока во время t ---------- */
function rdWp(d, t) {
  const w = d.wp; if (t <= w[0][0]) return [w[0][1], w[0][2]];
  for (let i = 1; i < w.length; i++) if (t < w[i][0]) { const a = w[i - 1], b = w[i], k = (t - a[0]) / ((b[0] - a[0]) || 1); return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  const z = w[w.length - 1]; return [z[1], z[2]];
}
function rdPos(d, t) { if (d.dt != null && t >= d.dt) return d.dp; return rdWp(d, t); }
/* куда смотрит: { p, f } — f: в момент выстрела разворачивается даже на ходу */
function rdLook(d, t) { const L = d.lk || []; for (let i = L.length - 1; i >= 0; i--) { const l = L[i]; if (t >= l[0] && t < l[1]) return { p: l[2], f: !!l[3] }; } return null; }

/* ---------- Расстановки и маршруты для карт без подробной схемы ---------- */
function rdPlanOf(M) {
  if (M._p) return M._p; if (M.plan) return (M._p = M.plan);
  const ring = (c, k, r) => rdSnap(M, k ? [c[0] + Math.cos(k * 2.4) * r, c[1] + Math.sin(k * 2.4) * r] : c, 1.2);
  const end = R => R[R.length - 1], ent = s => M.n[M.tr[s][0][M.tr[s][0].length - 2]];
  const post = (to, k) => ({ p: ring(M.n[end(M.ct[to])], k, 3), look: to === 'M' ? M.n[end(M.tr.M)] : ent(to), s: to });
  const ctDir = d => [0, 1, 2, 3, 4].map(i => d === 'A' ? (i === 0 ? 'M' : i === 3 ? 'B' : 'A') : d === 'B' ? (i === 0 ? 'M' : i === 3 ? 'A' : 'B') : (i === 0 ? 'M' : i < 3 ? 'A' : 'B'));
  const cts = d => { const n = {}; return ctDir(d).map(to => post(to, n[to] = (n[to] == null ? 0 : n[to] + 1))); };
  const rt = (R, lurk) => { const r = R.slice(1); return { r, s: lurk ? r.length - 1 : Math.max(0, r.length - 2), lurk: lurk ? 1 : 0 }; };
  const tDir = s => { const o = s === 'A' ? 'B' : 'A'; return [rt(M.tr[s][1]), rt(M.tr[s][0]), rt(M.tr[s][0]), rt(M.tr[o][0].slice(0, -1), 1), rt(M.tr[s][0])]; };
  const sDef = [rt(M.tr.M, 0), rt(M.tr.A[0].slice(0, -1), 0), rt(M.tr.B[0].slice(0, -1), 0), rt(M.tr.M, 1), rt(M.tr.A[1].slice(0, -1), 0)];
  sDef.forEach(x => { x.s = x.r.length - 1; });
  const fsOf = s => [0, 1, 2, 3, 4].map(k => ring(M.n[s], k, 4));
  const utOf = s => { const e = ent(s), c = M.n[s], lp = (k) => [e[0] + (c[0] - e[0]) * k, e[1] + (c[1] - e[1]) * k]; return [{ k: 'smoke', p: lp(.55), dt: -.8 }, { k: 'flash', p: lp(.4), dt: -.25 }, { k: 'fire', p: lp(.3), dt: .3 }]; };
  return (M._p = { spT: [0, 1, 2, 3, 4].map(k => ring(M.n.TS, k, 3)), spCT: [0, 1, 2, 3, 4].map(k => ring(M.n.CTS, k, 3)), ct: { S: cts('S'), A: cts('A'), B: cts('B') }, t: { A: tDir('A'), B: tDir('B'), S: sDef }, fs: { A: fsOf('A'), B: fsOf('B') }, ut: { A: utOf('A'), B: utOf('B') }, ut0: [] });
}

/* ---------- Постановка раунда ----------
   L — результат Match.play. Каждый игрок двигается по проходам: респаун → своя позиция (у защиты — точка с углом обзора,
   у атаки — место ожидания по плану) → выход на точку по сигналу → места после закладки. Защита ротируется на атакуемую точку.
   Убийства — в порядке движка, но только когда стрелок и жертва реально видят друг друга и на дистанции оружия:
   сначала ищется естественный контакт; если его нет — атакующий (до закладки) или ретейкер (после) идёт на соперника. */
const RD_V = { ct: 12, run: 11.5, ex: { fast: 12, norm: 10.2, slow: 8.6 }, pause: { fast: .1, norm: 1, slow: 2.2 }, hunt: 10.5, back: 9 };
const RD_MOVE = RD_V;
function rdScript(L, mapN) {
  const M = rdMap(mapN), P = rdPlanOf(M), g = rdGeo(M), aAtt = L.sideA === 'A', attPlan = (aAtt ? L.plan : L.planB) || { dir: 'S', tempo: 'norm' }, defPlan = (aAtt ? L.planB : L.plan) || { dir: 'S' };
  let sd = ((L.round || 1) * 2654435761) >>> 0; for (const ch of mapN) sd = (sd * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const dir = attPlan.dir === 'A' || attPlan.dir === 'B' ? attPlan.dir : 'S', site = dir !== 'S' ? dir : rnd() < .5 ? 'A' : 'B', oth = site === 'A' ? 'B' : 'A';
  const tempo = RD_V.ex[attPlan.tempo] ? attPlan.tempo : 'norm', kills = L.kills || [], timeR = L.end === 'time', plants = L.end === 'bomb' || L.end === 'defuse';
  const sc = M.n[site], sR = g.nr[site] || 8, F = 1;
  const dots = [];
  for (const team of ['a', 'b']) { const att = (team === 'a') === aAtt;
    for (let i = 0; i < 5; i++) { const s0 = (att ? P.spT : P.spCT)[i]; dots.push({ team, i, att, side: att ? 'T' : 'CT', wp: [[0, s0[0], s0[1]]], lk: [], dt: null, dp: null, ox: 0, oy: 0, sp: .94 + rnd() * .12, lurk: false, goal: s0 }); } }
  const T_ = dots.filter(d => d.att), C_ = dots.filter(d => !d.att), find = (team, i) => dots.find(d => d.team === team && d.i === i);
  const tEnd = d => d.wp[d.wp.length - 1][0], pEnd = d => { const z = d.wp[d.wp.length - 1]; return [z[1], z[2]]; };
  /* пройти по точкам P (P[0] — где стоит) начиная с t0 со скоростью v; вернуть время прибытия */
  const walk = (d, t0, Pp, v) => { const p = pEnd(d); t0 = Math.max(t0, tEnd(d)); if (t0 > tEnd(d)) d.wp.push([t0, p[0], p[1]]); let t = t0, last = p; for (let i = 1; i < Pp.length; i++) { const s = rdD(last, Pp[i]); if (s < .05) continue; t += s / v; d.wp.push([t, Pp[i][0], Pp[i][1]]); last = Pp[i]; } return t; };
  const go = (d, t0, q, v) => walk(d, t0, rdPath(M, pEnd(d), q, d.side), v);
  const cut = (d, t) => { const p = rdWp(d, t); d.wp = d.wp.filter(w => w[0] < t); if (!d.wp.length) d.wp.push([0, p[0], p[1]]); d.wp.push([t, p[0], p[1]]); d.lk = d.lk.filter(l => l[0] < t).map(l => l[1] > t ? [l[0], t, l[2], l[3]] : l); };
  const arrive = (d, q, from = 0, eps = .6) => { const w = d.wp; for (let i = 0; i < w.length; i++) if (w[i][0] >= from && rdD([w[i][1], w[i][2]], q) < eps) return w[i][0]; return null; };
  const enterT = (d, c, r, from = 0) => { for (let t = from; t <= tEnd(d) + .01; t += .1) if (rdD(rdWp(d, t), c) < r) return t; return null; };

  /* кто где стоит: роли внутри расстановки распределяются так, чтобы пары из движка (кто кого убьёт) оказались на одном участке.
     Снайпер и капитан по возможности остаются на своих местах */
  const posts = P.ct[defPlan.dir] || P.ct.S, tp0 = P.t[dir] || P.t.S;
  const zT = R => { if (!R.lurk) return site; const q = M.n[R.r[R.s]], dA = rdD(q, M.n.A), dB = rdD(q, M.n.B), dM = M.tr && M.tr.M ? rdD(q, M.n[M.tr.M[M.tr.M.length - 1]]) : 1e9; return dM < Math.min(dA, dB) ? 'M' : dA < dB ? 'A' : 'B'; };
  const PERM = []; (function pm(a, k) { if (k === a.length) { PERM.push(a.slice()); return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; pm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } })([0, 1, 2, 3, 4], 0);
  const pairs = (L.kills || []).map((k, j) => { const ta = (k.byA ? 'a' : 'b') === (aAtt ? 'a' : 'b'); return { t: ta ? k.k : k.v, c: ta ? k.v : k.k, w: j < 2 ? 1.6 : j < 5 ? 1 : .6 }; });
  const fit = (zc, zt) => zc === zt ? 2 : zc === 'M' && zt === site ? 1.2 : zc === oth && zt === site ? .5 : 0;
  let best = null, bs = -1e9; const tz = PERM.map(p => p.map(x => zT(tp0[x]))), ctzs = PERM.map(p => p.map(x => posts[x].s));
  for (let a = 0; a < PERM.length; a++) for (let b = 0; b < PERM.length; b++) { let sc2 = 0; for (const q of pairs) sc2 += q.w * fit(ctzs[b][q.c], tz[a][q.t]);
    for (let i = 0; i < 5; i++) { if (PERM[a][i] === i) sc2 += i === 0 || i === 4 ? .5 : .15; if (PERM[b][i] === i) sc2 += i === 0 ? .5 : .15; }
    if (sc2 > bs) { bs = sc2; best = [a, b]; } }
  const tpOf = i => tp0[PERM[best[0]][i]], postOf = i => posts[PERM[best[1]][i]];
  /* защита: на позиции */
  C_.forEach(d => { const po = postOf(d.i), q = rdSnap(M, po.p, .9), t = go(d, F + d.i * .07 + rnd() * .2, q, RD_V.ct * d.sp); d.post = po; d.postT = t; d.goal = q; d.lk.push([t, 1e9, po.look]); });

  /* атака: выход на места ожидания */
  const used = {};
  T_.forEach(d => { const R = tpOf(d.i), st = R.r.slice(0, R.s + 1), key = st[st.length - 1], k = used[key] = (used[key] == null ? 0 : used[key] + 1);
    d.lurk = !!R.lurk; d.rest = R.r.slice(R.s + 1);
    const Pp = rdTrim(rdChain(M, pEnd(d), st, null, 'T'), k * 2.8); d.stArr = walk(d, F + .15 + d.i * .08 + rnd() * .2, Pp, RD_V.run * d.sp);
    const nx = d.rest.length ? M.n[d.rest[0]] : sc; d.lk.push([d.stArr, 1e9, nx]); d.goal = pEnd(d); });

  /* кто закладывает: тот, кто дольше всех живёт по движку (и не люркер) */
  const vOrder = kills.map(k => (k.byA ? 'b' : 'a') + k.v), dieIdx = d => vOrder.indexOf(d.team + d.i);
  const planter = plants ? T_.slice().sort((x, y) => ((dieIdx(y) < 0 ? 99 : dieIdx(y)) - (y.lurk ? .5 : 0)) - ((dieIdx(x) < 0 ? 99 : dieIdx(x)) - (x.lurk ? .5 : 0)))[0] : null;

  /* выход на точку */
  const tEx = Math.max(...T_.filter(d => !d.lurk).map(d => d.stArr)) + RD_V.pause[tempo] + rnd() * .4, vEx = RD_V.ex[tempo];
  const order = T_.filter(d => !d.lurk).sort((x, y) => [1, 2, 4, 0, 3].indexOf(x.i) - [1, 2, 4, 0, 3].indexOf(y.i));
  const fsl = P.fs[site]; let fi = planter ? 1 : 0;
  const finalOf = d => rdSnap(M, d === planter ? fsl[0] : fsl[Math.min(fsl.length - 1, fi++)], .9);
  const entryCut = Pp => { /* для раунда «время вышло»: останавливаются у входа на точку */ let k = 0; for (let i = 0; i < 60; i++) { const q = rdAlong(Pp, i / 60); if (rdD(q, sc) < sR + 5) break; k = i / 60; } return rdTrim(Pp, rdLen(Pp) * (1 - k)); };
  const rk0 = {};
  const execute = (d, t0) => { const fq = finalOf(d); let Pp = rdChain(M, pEnd(d), d.rest, fq, 'T'); if (timeR) { Pp = entryCut(Pp); const ek = Pp[Pp.length - 1].map(Math.round).join(','), q = rk0[ek] = (rk0[ek] == null ? 0 : rk0[ek] + 1); Pp = rdTrim(Pp, q * 2.6); } const t = walk(d, t0, Pp, vEx * d.sp); d.goal = pEnd(d); d.lk.push([t, 1e9, timeR ? sc : M.n.CTS]); d.arr = t; return t; };
  order.forEach((d, n) => execute(d, tEx + n * .28 + rnd() * .15));
  T_.filter(d => d.lurk).forEach(d => execute(d, tEx + 2 + rnd() * .8));
  let tc = Math.min(...T_.map(d => enterT(d, sc, sR + 1, tEx) ?? 1e9)); if (tc > 1e8) tc = tEx + 3;

  /* защита: ротация на атакуемую точку (якорь на второй точке остаётся до закладки) */
  const othC = C_.filter(d => d.post.s === oth).sort((x, y) => x.i - y.i), anchor = othC.length ? othC[0] : null;
  const rotSpot = d => { const Pp = rdPath(M, pEnd(d), sc, 'CT'); let k = 1; for (let i = 0; i <= 60; i++) { const q = rdAlong(Pp, i / 60); if (rdD(q, sc) < sR + 4) { k = i / 60; break; } } return rdTrim(Pp, rdLen(Pp) * (1 - k)); };
  const rk = [];
  C_.forEach((d, n) => { if (d.post.s === site || d === anchor) return; const t0 = tc - .4 + n * .3 + rnd() * .3; let Pp = rotSpot(d); for (let q = 0; q < 6 && rk.some(c => rdD(c, Pp[Pp.length - 1]) < 2.4); q++) Pp = rdTrim(Pp, 2.6); rk.push(Pp[Pp.length - 1]); const t = walk(d, t0, Pp, RD_V.ct * d.sp); d.goal = pEnd(d); d.lk.push([t, 1e9, sc]); });

  /* убийства */
  const ev = [], alive = (d, t) => d.dt == null || t < d.dt;
  const buyOf = d => d.team === 'a' ? L.buyA : L.buyB, range = d => { const b = buyOf(d); return b === 'pistol' || b === 'eco' ? 22 : d.i === 0 && b === 'full' ? 46 : 30; };
  const sees = (K, V, t) => { const a = rdPos(K, t), b = rdPos(V, t); return rdD(a, b) <= range(K) && rdLos(M, a, b); };
  let plantT = null; const plantEst = () => { if (!planter) return null; const a = arrive(planter, rdSnap(M, fsl[0], .9), tEx, .8); return a == null ? null : a + .9; };
  let tPrev = 1.8;
  kills.forEach((k, j) => {
    const K = find(k.byA ? 'a' : 'b', k.k), V = find(k.byA ? 'b' : 'a', k.v); if (!K || !V || V.dt != null) return;
    let t0 = tPrev + (j ? .25 + rnd() * .55 : .3 + rnd() * .6);
    if (V === planter) { const pe = plantEst(); if (pe != null) t0 = Math.max(t0, pe + .5); }
    let t = null; for (let x = t0; x <= t0 + 4; x += .1) if (alive(K, x) && sees(K, V, x)) { t = x; break; }
    if (t == null) {
      /* сближение: до закладки идёт атакующий, после — защитник; закладчик на месте не срывается */
      const pp = plantEst(), post = plants && pp != null && t0 >= pp - .9;
      let m = post ? (K.att ? V : K) : (K.att ? K : V); if (m === planter && pp != null && t0 >= pp - 1.2) m = m === K ? V : K;
      const R = range(K) * .78, look = x => { for (let y = x; y <= x + 3; y += .1) if (alive(K, y) && sees(K, V, y)) return y; return null; };
      const chase = (m, t0) => { const o = m === K ? V : K, from = rdPos(m, t0), v = RD_V.hunt * m.sp; let Pp = [from], tt = t0 + .4;
        for (let it = 0; it < 3; it++) { const q = rdPos(o, tt); Pp = rdPath(M, from, q, m.side); let got = null, dd = 0; const Lp = rdLen(Pp), n = Math.max(1, Math.ceil(Lp / .5));
          for (let s = 0; s <= n; s++) { const x = rdAlong(Pp, s / n); if (rdD(x, q) <= R && rdLos(M, x, q)) { got = x; dd = Lp * s / n; break; } }
          if (!got) dd = Lp; tt = t0 + Math.max(.35, dd / v); Pp = rdTrim(Pp, Lp - dd); }
        cut(m, t0); walk(m, t0, Pp, v); return Math.max(tt, tEnd(m)); };
      const movers = [m];
      t = chase(m, t0); let x = look(Math.max(t0, t - .6));
      if (x == null) { const o = m === K ? V : K; movers.push(o); t = chase(o, t); x = look(Math.max(t0, t - .6)); }
      if (x != null) t = x;
      if (movers.includes(K)) { K.lk.push([t, t + .6, rdPos(V, t), 1]); walk(K, t + .6, rdPath(M, rdPos(K, t + .6), K.goal, K.side), RD_V.back * K.sp); K.lk.push([tEnd(K), 1e9, K.att ? M.n.CTS : sc]); }
    }
    V.dp = rdPos(V, t); V.dt = t; K.lk.push([t - .45, t + .35, V.dp, 1]);
    ev.push({ t, type: 'kill', k, j }); tPrev = t;
  });

  /* закладка, взрыв, разминирование, время */
  const lastK = kills.length ? tPrev : 0;
  if (plants && planter) { const pe = plantEst(); plantT = pe != null ? pe : Math.max(tc + 1, lastK - .5); if (planter.dt != null && planter.dt < plantT + .3) { const e = ev.find(x => x.type === 'kill' && (x.k.byA ? 'b' : 'a') + x.k.v === planter.team + planter.i); planter.dt = plantT + .3; planter.dp = rdWp(planter, planter.dt); if (e) e.t = planter.dt; } ev.push({ t: plantT, type: 'plant', site }); }
  let T;
  if (L.end === 'bomb') { const tb = Math.max(plantT + 6.5, lastK + 1.4); ev.push({ t: tb, type: 'boom', site }); T = tb + 1.2; }
  else if (L.end === 'defuse') { const bp = rdSnap(M, fsl[0], .9), cs = C_.filter(d => d.dt == null), df = cs.sort((x, y) => rdD(rdPos(x, lastK), bp) - rdD(rdPos(y, lastK), bp))[0];
    let td = Math.max(plantT + 1.5, lastK + 1.2); if (df) { const t0 = Math.max(lastK + .3, plantT + .4); cut(df, t0); const a = go(df, t0, [bp[0] + 1.2, bp[1] + .6], RD_V.hunt * df.sp); df.lk.push([a, 1e9, bp]); td = Math.max(td, a + 1.6); }
    ev.push({ t: td, type: 'defuse', site }); T = td + 1.3; }
  else if (timeR) { const tt = Math.max(lastK + 2, 16); ev.push({ t: tt, type: 'time' }); T = tt + 1.2; }
  else T = lastK + 1.6;
  T = Math.max(T, 12);
  /* длинный раунд сжимаем до 22 с: всё ускоряется одинаково, совпадения по времени сохраняются */
  if (T > 22) { const k = 22 / T, sc1 = x => x * k; for (const d of dots) { d.wp.forEach(w => { w[0] *= k; }); d.lk.forEach(l => { l[0] *= k; if (l[1] < 1e8) l[1] *= k; }); if (d.dt != null) d.dt *= k; if (d.stArr) d.stArr *= k; if (d.postT) d.postT *= k; if (d.arr) d.arr *= k; }
    ev.forEach(e => { e.t = sc1(e.t); }); tc = sc1(tc); if (plantT != null) plantT = sc1(plantT); T = 22; }
  ev.sort((x, y) => x.t - y.t);
  /* гранаты: дым/молотов/флешка выхода + дым в начале раунда */
  const ut = [];
  if (!timeR) for (const u of P.ut[site] || []) ut.push({ t: Math.max(1.5, tc + u.dt), k: u.k, p: u.p });
  for (const u of P.ut0 || []) ut.push({ t: u.t, k: u.k, p: u.p });
  ut.sort((x, y) => x.t - y.t);
  return { dots, ev, T, site, tc, plantT, aAtt, ut, planter: planter ? planter.team + planter.i : null };
}

/* ---------- План на карте до раунда: куда пойдёт ваша команда ---------- */
function rdPlanSvg(mapN, sideA, plan) {
  const atk = sideA === 'A', fake = { sideA, plan: plan || { dir: 'S', tempo: 'norm' }, planB: { dir: 'S', tempo: 'norm' }, kills: [], end: 'elim', round: 1 };
  const S = rdScript(fake, mapN), M = rdMap(mapN);
  const line = (d, cl, upTo) => { const pts = d.wp.filter(w => w[0] <= upTo).map(w => w[1].toFixed(1) + ' ' + w[2].toFixed(1)); return pts.length > 1 ? `<path class="rd-route ${cl}" d="M${pts.join('L')}"/>` : ''; };
  const mine = S.dots.filter(d => d.team === 'a');
  if (atk) {
    const site = plan && (plan.dir === 'A' || plan.dir === 'B') ? plan.dir : null;
    return mine.map(d => line(d, d.lurk ? 'me thin' : 'me', site ? 1e9 : d.stArr + .01)).join('') + (site ? `<circle class="rd-aim" cx="${M.n[site][0]}" cy="${M.n[site][1]}" r="13"/>` : '');
  }
  return mine.map(d => { const p = rdSnap(M, d.post.p, .9); return line(d, 'me thin', d.postT + .01) + `<g class="rd-hold"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.4"/><text x="${p[0].toFixed(1)}" y="${(p[1] + 1.4).toFixed(1)}">${d.i + 1}</text></g>`; }).join('');
}

/* ---------- Вид карты сверху: улицы, дома, плиты A/B, респауны. Рисуется один раз на матч в canvas ---------- */
const RD_THEME = {
  sand: { g: '#cbb48b', g2: '#b9a079', st: '#5f5a50', st2: '#726b5f', curb: '#3f3b35', roof: ['#ece1c8', '#dccaa6', '#cfb98f', '#e4d4b2'], det: '#bfa47a', tree: '#5c8a3a', dome: '#c9a043' },
  inferno: { g: '#b49a74', g2: '#a3896a', st: '#6a5a4c', st2: '#7a685a', curb: '#45392f', roof: ['#b8613f', '#c97a4f', '#a5543a', '#d08b5c'], det: '#8a4a30', tree: '#4f7a34', dome: '#c9a043' },
  ancient: { g: '#4c6741', g2: '#3f5937', st: '#6c695d', st2: '#7b786b', curb: '#3b3a33', roof: ['#8a8f7a', '#9aa08a', '#7d826d', '#a7ab93'], det: '#5e6352', tree: '#2f5a2a', dome: '#7f9a6a' } };
const RD_MAP_THEME = { Mirage: 'sand', 'Dust II': 'sand', Anubis: 'sand', Inferno: 'inferno', Ancient: 'ancient' };
const RD_ART = {};
function rdArt(mapN, size = 1024) {
  const key = mapN + '@' + size; if (RD_ART[key]) return RD_ART[key];
  const M = rdMap(mapN), T = RD_THEME[RD_MAP_THEME[mapN] || 'sand'], c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), u = size / 100; let sd = 0; for (const ch of mapN) sd = (sd * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ sd >>> 15, 1 | sd); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const W = 8.6, GEO = rdGeo(M), dist = p => W / 2 - rdFree(M, p);   /* как раньше: расстояние до оси прохода шириной W */
  /* земля с пятнами */
  g.fillStyle = T.g; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() < .5 ? T.g2 : 'rgba(255,255,255,.05)'; const r = rnd() * 2.2 * u; g.globalAlpha = .35; g.beginPath(); g.arc(rnd() * size, rnd() * size, r, 0, 7); g.fill(); } g.globalAlpha = 1;
  /* дома: блоки вдоль улиц, с тенью, крышами и деталями */
  for (let y = 1; y < 99; y += 4.2) for (let x = 1; x < 99; x += 4.2) {
    const cx = x + rnd() * 1.2, cy = y + rnd() * 1.2, d = dist([cx + 2, cy + 2]); if (d < W / 2 + 2.6 || rnd() < .1) continue;
    const w = 3.2 + rnd() * 1.6, h = 3.2 + rnd() * 1.6, roof = T.roof[(rnd() * T.roof.length) | 0];
    g.fillStyle = 'rgba(0,0,0,.32)'; g.fillRect((cx + .7) * u, (cy + .9) * u, w * u, h * u);
    g.fillStyle = roof; g.fillRect(cx * u, cy * u, w * u, h * u);
    g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = u * .25; g.strokeRect((cx + .35) * u, (cy + .35) * u, (w - .7) * u, (h - .7) * u);
    const q = rnd(); if (q < .3) { g.fillStyle = T.det; g.fillRect((cx + w * .2) * u, (cy + h * .25) * u, w * .3 * u, h * .3 * u); }
    else if (q < .38) { g.fillStyle = T.dome; g.beginPath(); g.arc((cx + w / 2) * u, (cy + h / 2) * u, Math.min(w, h) * .32 * u, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc((cx + w / 2 - .4) * u, (cy + h / 2 - .4) * u, Math.min(w, h) * .12 * u, 0, 7); g.fill(); }
    else if (q < .5) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect((cx + .6) * u, (cy + h - 1.4) * u, (w - 1.2) * u, .6 * u); }
  }
  /* улицы: бордюр, покрытие, разметка */
  g.lineCap = g.lineJoin = 'round';
  const lay = (pad, col) => { g.strokeStyle = g.fillStyle = col; for (const sg of GEO.segs) { g.lineWidth = (sg.h * 2 + pad) * u; g.beginPath(); g.moveTo(sg.a[0] * u, sg.a[1] * u); g.lineTo(sg.b[0] * u, sg.b[1] * u); g.stroke(); } for (const c of GEO.circ) if (c.r > 0) { g.beginPath(); g.arc(c.c[0] * u, c.c[1] * u, (c.r + pad / 2) * u, 0, 7); g.fill(); } };
  lay(2.2, 'rgba(0,0,0,.35)'); lay(1, T.curb); lay(0, T.st);
  for (let i = 0; i < 1400; i++) { const p = [rnd() * 100, rnd() * 100]; if (dist(p) < W / 2 - .3) { g.fillStyle = rnd() < .5 ? T.st2 : 'rgba(0,0,0,.12)'; g.fillRect(p[0] * u, p[1] * u, (.5 + rnd()) * u, (.5 + rnd()) * u); } }
  /* ящики и деревья у дорог */
  for (let i = 0; i < 70; i++) { const p = [rnd() * 100, rnd() * 100], d = dist(p); if (d > W / 2 - 1.6 && d < W / 2 - .4) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect((p[0] + .3) * u, (p[1] + .3) * u, 1.6 * u, 1.6 * u); g.fillStyle = '#8b6a3f'; g.fillRect(p[0] * u, p[1] * u, 1.6 * u, 1.6 * u); g.strokeStyle = '#5e4628'; g.lineWidth = u * .2; g.strokeRect(p[0] * u, p[1] * u, 1.6 * u, 1.6 * u); }
    else if (d > W / 2 + .6 && d < W / 2 + 2.4 && rnd() < .5) { g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc((p[0] + .6) * u, (p[1] + .6) * u, 1.5 * u, 0, 7); g.fill(); g.fillStyle = T.tree; g.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; g.lineTo((p[0] + Math.cos(a) * 1.6) * u, (p[1] + Math.sin(a) * 1.6) * u); g.lineTo((p[0] + Math.cos(a + .45) * .6) * u, (p[1] + Math.sin(a + .45) * .6) * u); } g.fill(); } }
  /* плиты точек и респауны */
  for (const s of ['A', 'B']) { const p = M.n[s]; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect((p[0] - 4.2) * u, (p[1] - 3.6) * u, 9 * u, 9 * u); g.fillStyle = '#c4252b'; g.fillRect((p[0] - 4.5) * u, (p[1] - 4.5) * u, 9 * u, 9 * u); g.strokeStyle = '#fff'; g.lineWidth = u * .5; g.strokeRect((p[0] - 4.5) * u, (p[1] - 4.5) * u, 9 * u, 9 * u);
    g.fillStyle = '#fff'; g.font = `700 ${7 * u}px Oswald, Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, p[0] * u, (p[1] + .4) * u); }
  for (const [k, col] of [['TS', 'rgba(242,193,78,.35)'], ['CTS', 'rgba(74,163,255,.35)']]) { const p = M.n[k]; g.fillStyle = col; g.fillRect((p[0] - 6) * u, (p[1] - 4) * u, 12 * u, 8 * u); g.strokeStyle = col.replace('.35', '.9'); g.lineWidth = u * .4; g.strokeRect((p[0] - 6) * u, (p[1] - 4) * u, 12 * u, 8 * u); }
  const vg = g.createRadialGradient(size / 2, size / 2, size * .3, size / 2, size / 2, size * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = vg; g.fillRect(0, 0, size, size);
  return (RD_ART[key] = c.toDataURL('image/jpeg', .86));
}
