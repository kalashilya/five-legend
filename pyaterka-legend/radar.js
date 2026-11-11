/* ---------- Радар карты: схема проходов, маршруты команд и постановка раунда ----------
   Схемы нарисованы для игры (не копия радаров Valve): узлы, проходы, точки A/B, респауны.
   Постановка раунда строится из результата движка (L): кто кого и в каком порядке убил, закладка, исход —
   поэтому то, что видно на радаре, всегда совпадает со счётом. Сам баланс матча здесь не меняется. */
const RADAR = {
  Mirage: {
    n: { TS: [90, 64], tA1: [74, 76], tA2: [56, 84], A: [32, 76], M1: [70, 52], M2: [52, 46], M3: [38, 56], sh: [38, 34], tB1: [70, 30], tB2: [48, 16], B: [22, 22], CTS: [16, 50], ctA: [22, 64], ctB: [14, 34] },
    e: [['TS', 'tA1'], ['tA1', 'tA2'], ['tA2', 'A'], ['TS', 'M1'], ['M1', 'M2'], ['M2', 'M3'], ['M3', 'A'], ['M2', 'sh'], ['sh', 'B'], ['TS', 'tB1'], ['tB1', 'tB2'], ['tB2', 'B'], ['CTS', 'ctA'], ['ctA', 'A'], ['CTS', 'ctB'], ['ctB', 'B'], ['CTS', 'M3']],
    tr: { A: [['TS', 'tA1', 'tA2', 'A'], ['TS', 'M1', 'M2', 'M3', 'A']], B: [['TS', 'tB1', 'tB2', 'B'], ['TS', 'M1', 'M2', 'sh', 'B']], M: ['TS', 'M1', 'M2'] },
    ct: { A: ['CTS', 'ctA', 'A'], B: ['CTS', 'ctB', 'B'], M: ['CTS', 'M3', 'M2'] },
    lb: [['tA1', 'Рампа'], ['tA2', 'Палас'], ['M2', 'Мид'], ['tB1', 'Апартаменты'], ['sh', 'Шорт'], ['ctA', 'Тетрис'], ['M3', 'Коннектор']]
  },
  'Dust II': {
    n: { TS: [50, 90], L1: [78, 80], L2: [86, 60], L3: [86, 34], A: [74, 18], M1: [50, 68], M2: [50, 46], cat: [64, 32], B1: [24, 76], B2: [16, 50], B: [22, 20], CTS: [58, 14], ctm: [48, 28], ctB: [34, 18] },
    e: [['TS', 'L1'], ['L1', 'L2'], ['L2', 'L3'], ['L3', 'A'], ['TS', 'M1'], ['M1', 'M2'], ['M2', 'cat'], ['cat', 'A'], ['TS', 'B1'], ['B1', 'B2'], ['B2', 'B'], ['CTS', 'A'], ['CTS', 'ctm'], ['ctm', 'ctB'], ['ctB', 'B'], ['M2', 'ctm']],
    tr: { A: [['TS', 'L1', 'L2', 'L3', 'A'], ['TS', 'M1', 'M2', 'cat', 'A']], B: [['TS', 'B1', 'B2', 'B'], ['TS', 'M1', 'M2', 'ctm', 'ctB', 'B']], M: ['TS', 'M1', 'M2'] },
    ct: { A: ['CTS', 'A'], B: ['CTS', 'ctm', 'ctB', 'B'], M: ['CTS', 'ctm', 'M2'] },
    lb: [['L2', 'Лонг'], ['cat', 'Шорт'], ['M2', 'Мид'], ['B1', 'Тоннели'], ['ctm', 'CT-мид']]
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
const rdPts = (M, names) => names.map(k => M.n[k]);

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

/* ---------- Геометрия ---------- */
const rdLen = P => { let l = 0; for (let i = 1; i < P.length; i++) l += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return l; };
function rdAlong(P, k) {
  if (P.length < 2) return P[0].slice(); const L = rdLen(P); let d = clamp(k, 0, 1) * L;
  for (let i = 1; i < P.length; i++) { const s = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (d <= s || i === P.length - 1) { const q = s ? Math.min(1, d / s) : 1; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * q, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * q]; } d -= s; }
  return P[P.length - 1].slice();
}
const rdEase = x => x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
/* позиция точки игрока во время t: по отрезкам маршрута, после смерти — на месте смерти */
function rdPos(d, t) {
  if (d.dt != null && t >= d.dt) return d.dp;
  let p = d.segs[0].P[0];
  for (const s of d.segs) { if (t < s.t0) break; p = rdAlong(s.P, s.d > 0 ? rdEase((t - s.t0) / s.d) : 1); }
  return [p[0] + d.ox, p[1] + d.oy];
}

/* ---------- Постановка раунда ----------
   L — результат Match.play. Возвращает точки обеих команд с маршрутами и события по времени. */
const RD_MOVE = { fast: 4.2, norm: 5.8, slow: 7.4 };
function rdScript(L, mapN) {
  const M = rdMap(mapN), aAtt = L.sideA === 'A', attPlan = aAtt ? L.plan : L.planB, defPlan = aAtt ? L.planB : L.plan;
  const site = attPlan.dir === 'A' || attPlan.dir === 'B' ? attPlan.dir : (L.round * 7 + 3) % 2 ? 'A' : 'B', oth = site === 'A' ? 'B' : 'A';
  const r = ((L.round * 2654435761) >>> 0) % 1000 / 1000;
  const jit = (i, s) => { const a = (i * 2.399 + s) % 6.283, m = 2.4 + (i % 3) * 1.1; return [Math.cos(a) * m, Math.sin(a) * m]; };
  /* маршрут нападающего по роли: 0 снайпер, 1 энтри, 2 саппорт, 3 люркер, 4 капитан */
  const attRoute = i => { const d = attPlan.dir;
    if (d === 'S') return i === 0 || i === 3 ? { P: rdPts(M, M.tr.M), lurk: true } : i === 4 ? { P: rdPts(M, M.tr[oth][0]).slice(0, -1), lurk: true } : { P: rdPts(M, M.tr[site][0]) };
    if (i === 3) return { P: rdPts(M, M.tr[oth][0]).slice(0, -1), lurk: true };
    return { P: rdPts(M, i === 0 ? M.tr[site][1] : M.tr[site][0]) }; };
  const defRoute = i => { const d = defPlan.dir; const to = d === 'A' ? (i === 0 ? 'M' : i === 3 ? 'B' : 'A') : d === 'B' ? (i === 0 ? 'M' : i === 3 ? 'A' : 'B') : (i === 0 ? 'M' : i < 3 ? 'A' : 'B'); return { P: rdPts(M, M.ct[to]), at: to }; };
  /* время: заморозка, выход на точку, бой, развязка; итог 15–20 секунд */
  const n = L.kills.length, plants = L.end === 'bomb' || L.end === 'defuse';
  let F = 1.6, Mv = RD_MOVE[attPlan.tempo] || RD_MOVE.norm, W = clamp(n * .95, 3.4, 7.2);
  const tail = () => L.end === 'bomb' ? 3.6 : L.end === 'defuse' ? 3.2 : L.end === 'time' ? 2.6 : 1.6;
  const total = () => F + Mv * .85 + W + tail();
  if (total() < 15) { const x = 15 - total(); Mv += x * .45; W += x * .55; }
  if (total() > 20) W = Math.max(2.6, W - (total() - 20));
  const tc = F + Mv * .85, T = total();
  const dots = [];
  for (const team of ['a', 'b']) {
    const att = (team === 'a') === aAtt;
    for (let i = 0; i < 5; i++) {
      const R0 = att ? attRoute(i) : defRoute(i), [ox, oy] = jit(i + (att ? 0 : 5), r * 6);
      const segs = [{ t0: F * (att ? 1 : .4), d: att ? Mv * (R0.lurk ? 1.15 : 1) : 3.4 + i * .25, P: R0.P }];
      dots.push({ team, i, att, side: att ? 'T' : 'CT', segs, ox, oy, dt: null, dp: null, lurk: !!R0.lurk });
    }
  }
  /* сближение: после первого контакта все живые стягиваются к атакуемой точке */
  const sp = M.n[site];
  for (const d of dots) { const from = rdAlong(d.segs[0].P, 1), t0 = tc + (d.lurk ? 1.4 : d.att ? .2 : .6) + d.i * .12; const [jx, jy] = jit(d.i * 3 + (d.att ? 1 : 7), 2); d.segs.push({ t0, d: d.lurk ? 3.4 : 2.6, P: [from, [sp[0] + jx * 1.8, sp[1] + jy * 1.8]] }); }
  /* события: убийства в порядке движка, закладка, взрыв или разминирование */
  const ev = [], kt = j => tc + W * (j + .5) / Math.max(1, n) + ((j * 37) % 10 - 5) * .03;
  L.kills.forEach((k, j) => ev.push({ t: kt(j), type: 'kill', k, j }));
  let plantT = null;
  if (plants) { plantT = tc + W * .42; ev.push({ t: plantT, type: 'plant', site }); }
  if (L.end === 'bomb') ev.push({ t: T - 1.2, type: 'boom', site });
  if (L.end === 'defuse') ev.push({ t: T - 1.3, type: 'defuse', site });
  if (L.end === 'time') ev.push({ t: T - 1.2, type: 'time' });
  ev.sort((x, y) => x.t - y.t);
  /* места смертей: жертва замирает там, где была в момент убийства */
  for (const e of ev) if (e.type === 'kill') { const vt = e.k.byA ? 'b' : 'a', d = dots.find(x => x.team === vt && x.i === e.k.v); if (d && d.dt == null) { d.dp = rdPos(d, e.t); d.dt = e.t; } }
  return { dots, ev, T, site, tc, plantT, aAtt };
}

/* ---------- План на радаре до раунда: куда пойдёт ваша команда ---------- */
function rdPlanSvg(mapN, sideA, plan) {
  const M = rdMap(mapN), atk = sideA === 'A', line = (P, cl) => `<path class="rd-route ${cl}" d="M${P.map(p => p[0] + ' ' + p[1]).join('L')}"/>`;
  if (atk) {
    const site = plan.dir === 'B' ? 'B' : plan.dir === 'A' ? 'A' : null;
    if (!site) return line(rdPts(M, M.tr.M), 'me') + line(rdPts(M, M.tr.A[0]), 'me thin') + line(rdPts(M, M.tr.B[0]), 'me thin');
    return line(rdPts(M, M.tr[site][0]), 'me') + line(rdPts(M, M.tr[site][1]), 'me thin') + `<circle class="rd-aim" cx="${M.n[site][0]}" cy="${M.n[site][1]}" r="13"/>`;
  }
  const st = plan.dir === 'A' ? { A: 3, B: 1, M: 1 } : plan.dir === 'B' ? { A: 1, B: 3, M: 1 } : { A: 2, B: 2, M: 1 };
  return ['A', 'B', 'M'].map(k => { const p = M.n[M.ct[k][M.ct[k].length - 1]]; return line(rdPts(M, M.ct[k]), 'me thin') + `<g class="rd-hold"><circle cx="${p[0]}" cy="${p[1]}" r="${4 + st[k] * 1.6}"/><text x="${p[0]}" y="${p[1] + 1.6}">${st[k]}</text></g>`; }).join('');
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
  const seg = M.e.map(([a, b]) => [M.n[a], M.n[b]]), W = 8.4;
  const dist = (p) => Math.min(...seg.map(([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy || 1, t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l, 0, 1); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }));
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
  const path = () => { g.beginPath(); for (const [a, b] of seg) { g.moveTo(a[0] * u, a[1] * u); g.lineTo(b[0] * u, b[1] * u); } };
  g.lineCap = g.lineJoin = 'round';
  path(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = (W + 2.2) * u; g.stroke();
  path(); g.strokeStyle = T.curb; g.lineWidth = (W + 1) * u; g.stroke();
  path(); g.strokeStyle = T.st; g.lineWidth = W * u; g.stroke();
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
