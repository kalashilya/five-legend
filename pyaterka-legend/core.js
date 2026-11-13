/* ===== Ядро: карточки, паки, состав, матч ===== */
const R = Math.random, rnd = (a, b) => a + R() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(R() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hsh = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const RN = ['AWP', 'ENT', 'SUP', 'LRK', 'IGL'], RNAME = ['Снайпер', 'Энтри', 'Саппорт', 'Люркер', 'Капитан'];
const SK = ['aim', 'ent', 'clu', 'utl', 'pos', 'igl'], SN = { aim: 'Стрельба', ent: 'Опенинг', clu: 'Клатч', utl: 'Гранаты', pos: 'Позиция', igl: 'Тактика' }, SS = { aim: 'СТР', ent: 'ОПН', clu: 'КЛЧ', utl: 'ГРН', pos: 'ПОЗ', igl: 'ТАК' };
const RAR = ['Ширпотреб', 'Армейское', 'Запрещённое', 'Засекреченное', 'Тайное'], SPN = ['', '', 'MVP'];
const PROF = [{ aim: 4, pos: 4, ent: -2, utl: -3, igl: -3 }, { ent: 6, aim: 2, clu: -3, pos: -3, igl: -2 }, { utl: 7, pos: 1, ent: -4, aim: -2 }, { clu: 6, pos: 3, ent: -3, utl: -3, igl: -3 }, { igl: 10, utl: 3, aim: -5, ent: -3, clu: -3 }];
const W_ID = 100000, M_ID = 200000;      // номера особых версий: «Игрок недели» (убраны, нужны только для переноса старых сохранений) и MVP
const OVR_CAP = 92;                      // потолок рейтинга любой карточки (тот же, что в gen.js)
const CARDS = {}, POOL = [[], [], [], [], []], MVPP = [];
(function build() {
  const rows = {};
  const mk = (id, row, add, sp, rar) => {
    const [nick, t, role, o, pid, , hist, rawStats, hltv] = row, ovr = Math.min(OVR_CAP, o + add), st = {};
    if (Array.isArray(rawStats) && rawStats.length === SK.length) SK.forEach((k, i) => st[k] = clamp(Math.round(rawStats[i] + add), 40, 99));
    else for (const k of SK) st[k] = clamp(ovr + (PROF[role][k] || 0) + (hsh(nick + k) % 7) - 3, 40, 99);
    return CARDS[id] = { id, base: pid, nick, team: TM[t], t, role, ovr, o, rar, sp, hist: !!hist, st, hltv: hltv || null, aw: !hist && typeof AWD !== 'undefined' && AWD[nick] || null };
  };
  PL.forEach(row => { rows[row[4]] = row; POOL[row[5]].push(mk(row[4], row, 0, 0, row[5])); });
  SPM.forEach(pid => { if (rows[pid]) MVPP.push(mk(M_ID + pid, rows[pid], 3, 2, 4)); });
})();
const ALL = Object.values(CARDS).sort((a, b) => b.ovr - a.ovr || a.id - b.id);

/* ---------- Способности ----------
   Базовая зависит от естественной роли и работает только на своей роли. Индивидуальная задаётся по нику в IND;
   для игроков с подтверждённой статистикой HLTV назначается индивидуальный архетип. Сила растёт с уровнем, у особых версий она выше. */
const AB_BASE = [
  { n: 'Первый выстрел', d: 'В защите надёжнее встречает первый выход соперника.' },
  { n: 'Размен', d: 'Проигранная первая дуэль обходится команде вдвое дешевле.' },
  { n: 'Поддержка', d: 'Гранаты команды работают на четверть сильнее.' },
  { n: 'Тайминг', d: 'Усиливает команду, когда она отстаёт по счёту, и в решающем раунде.' },
  { n: 'Чтение игры', d: 'Смягчает неудачный выбор направления.' }
];
const AB_IND = {
  team: { n: 'Командная игра', d: 'Небольшой универсальный вклад в командное исполнение.', mult: 1 },
  duelist: { n: 'Дуэлянт', d: 'Высокий HLTV Firepower: усиливает индивидуальный вклад в ключевых дуэлях.', mult: 1.08 },
  sniper: { n: 'Снайпер', d: 'Высокий HLTV Sniping: сильнее влияет на индивидуальный вклад в раунде.', mult: 1.1 },
  entry: { n: 'Первый контакт', d: 'Высокий HLTV Opening: усиливает вклад при поиске первых дуэлей.', mult: 1.1 },
  support: { n: 'Поддержка', d: 'Высокий HLTV Utility: усиливает вклад гранат и командного взаимодействия.', mult: 1.08 },
  trader: { n: 'Трейдер', d: 'Высокий HLTV Trading: усиливает вклад в размены и поддержку тиммейтов.', mult: 1.08 },
  anchor: { n: 'Опорник', d: 'Высокий HLTV Closing: сильнее влияет на поздние стадии раунда.', mult: 1.08 }
};
const IND = { donk: 'duelist', ZywOo: 'sniper', m0NESY: 'sniper', Vexite: 'entry', jks: 'support', insani: 'entry', blameF: 'anchor', asap: 'duelist', JamYoung: 'support', Senzu: 'entry', Magnojez: 'entry', junior: 'sniper', leakz: 'trader', s1nside: 'anchor', lattykk: 'sniper' };
const indOf = c => AB_IND[IND[c.nick] || 'team'];
const abPow = (c, lv) => (1 + .1 * (lv - 1)) * (c.sp ? 1.3 : 1);
const indPow = (c, lv) => abPow(c, lv) * (indOf(c).mult || 1);

/* ---------- Паки ---------- */
const PACKS = {
  basic: { n: 'Базовый', price: 400, odds: [62, 27, 9, 1.8, .2], min: 0, d: 'Пять карточек, чаще всего ширпотреб.' },
  pro: { n: 'Про', price: 1200, odds: [30, 40, 23, 6, 1], min: 2, d: 'Минимум одна «Запрещённое» или выше.' },
  elite: { n: 'Элитный', price: 4000, odds: [0, 40, 42, 14, 4], min: 3, d: 'Минимум одна «Засекреченное» или выше.' },
  /* ограниченный кейс на час: 20 карточек — 1 гарантированно 87+, 2 гарантированно 85+, 17 по шансам odds.
     Экономика: быстрая продажа всех 20 карточек в среднем ≈ 12 тыс. монет (максимум возможный ≈ 60 тыс. при 20 «Тайных») — меньше цены 100 тыс., монеты из кейса не «размножаются» */
  limit: { n: 'Легендарный', price: 100000, odds: [0, 20, 45, 25, 10], min: 0, n20: 20, g: [87, 85, 85], from: Date.UTC(2026, 10, 12, 14, 45), to: Date.UTC(2026, 10, 12, 15, 45), d: '20 карточек: 1 гарантированно 87+, 2 гарантированно 85+, остальные 17 — по шансам ниже.' }
};
const packOn = (k, t) => { const P = PACKS[k]; return !P.from || (t >= P.from && t < P.to); };
/* карточка с рейтингом не ниже th: среди «Засекреченных» и «Тайных», чем выше рейтинг — тем реже */
function pickMinOvr(th) {
  const pool = POOL[3].concat(POOL[4]).filter(c => c.ovr >= th); let tot = 0;
  const w = pool.map(c => { const x = 1 / (1 + .35 * (c.ovr - th)) * (c.rar === 4 ? .6 : 1); tot += x; return x; });
  let r = R() * tot; for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; } return pool[0];
}
const MVP_CH = .12;
function rollRar(odds) { let r = R() * 100; for (let i = 0; i < 5; i++) { r -= odds[i]; if (r <= 0) return i; } return 0; }
function pickIn(rar) {
  if (rar === 4 && R() < MVP_CH) return pick(MVPP);
  const pool = POOL[rar], mn = Math.min(...pool.map(c => c.ovr)); let tot = 0;
  const w = pool.map(c => { const x = 1 / ((1 + .3 * (c.ovr - mn)) * (1 + (100 - c.t) / 100)); tot += x; return x; });
  let r = R() * tot; for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; } return pool[0];
}
function openPack(type) {
  const P = PACKS[type], out = []; let best = 0;
  if (P.n20) { for (const th of P.g) out.push(pickMinOvr(th)); while (out.length < P.n20) out.push(pickIn(rollRar(P.odds))); return shuffle(out); }
  for (let i = 0; i < 5; i++) { let r = rollRar(P.odds); if (i === 4 && best < P.min) r = Math.max(r, P.min); best = Math.max(best, r); out.push(pickIn(r)); }
  return shuffle(out);
}

/* ---------- Профиль ---------- */
const LEAGUES = [['Бронза', 0], ['Серебро', 200], ['Золото', 500], ['Платина', 900], ['Алмаз', 1400], ['Элита', 2000], ['Легенда', 2800]];
const leagueOf = t => { let i = 0; for (let k = 0; k < LEAGUES.length; k++) if (t >= LEAGUES[k][1]) i = k; return i; };
const SELL = [20, 50, 150, 600, 3000], UP_N = [1, 2, 4, 8], UP_C = [100, 250, 600, 1500];
const sellVal = c => SELL[c.rar] * (c.sp ? 3 : 1);
const upCost = (c, lv) => UP_C[lv - 1] * (1 + c.rar);
function newGame() {
  const G = { v: 2, coins: 600, tro: 0, best: 0, xp: 0, lvl: 1, cards: {}, squad: [null, null, null, null, null], packs: { basic: 1, pro: 2, elite: 0 }, daily: 0, w: 0, l: 0 };
  for (let role = 0; role < 5; role++) { const c = pick(POOL[0].filter(x => x.role === role && x.ovr <= 66)) || POOL[0].find(x => x.role === role); G.cards[c.id] = { n: 1, lv: 1 }; G.squad[role] = c.id; }
  return G;
}
function addCard(G, id) { const o = G.cards[id]; if (o) { o.n++; return false; } G.cards[id] = { n: 1, lv: 1 }; return true; }
function canUp(G, id) { const o = G.cards[id], c = CARDS[id]; return !!o && o.lv < 5 && o.n - 1 >= UP_N[o.lv - 1] && G.coins >= upCost(c, o.lv); }
function doUp(G, id) { if (!canUp(G, id)) return false; const o = G.cards[id]; G.coins -= upCost(CARDS[id], o.lv); o.n -= UP_N[o.lv - 1]; o.lv++; return true; }
function addXp(G, x) { G.xp += x; let up = 0; while (G.xp >= 100 * G.lvl) { G.xp -= 100 * G.lvl; G.lvl++; G.packs.basic++; up++; } return up; }

/* ---------- Состав ---------- */
/* squad: массив из 5 { c: карточка, lv } по слотам ролей */
function effOf(e, slot) { const pen = e.c.role === slot ? 0 : 5, add = e.lv - 1 - pen, st = {}; for (const k of SK) st[k] = e.c.st[k] + add; return { c: e.c, lv: e.lv, ovr: e.c.ovr + add, st, off: pen > 0, pw: pen ? 0 : abPow(e.c, e.lv), ipw: pen ? 0 : indPow(e.c, e.lv) }; }
function squadOf(G) { return G.squad.map(id => id == null ? null : { c: CARDS[id], lv: G.cards[id] ? G.cards[id].lv : 1 }); }
function squadInfo(sq) {
  if (sq.some(x => !x)) return null;
  const e = sq.map(effOf), cnt = {}; let mx = 0;
  for (const x of e) mx = Math.max(mx, cnt[x.c.t] = (cnt[x.c.t] || 0) + 1);
  const onRole = e.every(x => !x.off), chem = [0, 0, 2, 4, 7, 10][mx] + (onRole ? 3 : 0), cb = chem * .25;
  const m = f => e.reduce((s, x) => s + f(x.st), 0) / 5;
  return { e, chem, mx, onRole, rating: e.reduce((s, x) => s + x.ovr, 0) / 5 + cb, atk: m(s => .4 * s.aim + .35 * s.ent + .25 * s.utl) + cb, def: m(s => .4 * s.aim + .35 * s.pos + .25 * s.clu) + cb, best: Math.max(...e.map(x => x.ovr)), pos: m(s => s.pos) };
}

/* ---------- Карты действий ---------- */
const AC = {
  tempo: { n: 'Быстрый темп', cost: 2, d: 'Бонус от опенинга вашего энтри, в атаке на четверть сильнее. Проваливается против «Стека».' },
  stack: { n: 'Стек точки', cost: 2, d: 'Слабая сама по себе, но ломает «Быстрый темп» соперника. Проигрывает «Раскидке».' },
  nades: { n: 'Раскидка гранат', cost: 3, d: 'Бонус от гранат вашего саппорта. Наказывает «Стек».' },
  fake: { n: 'Фейк', cost: 2, d: 'Отменяет самую дорогую карту соперника. В атаке спасает, если соперник угадал точку.' },
  awp: { n: 'AWP-пик', cost: 2, d: 'Бонус от стрельбы вашего снайпера.' },
  clutch: { n: 'Клатч', cost: 1, d: 'Бонус от клатча люркера. Удваивается, когда вы отстаёте по счёту.' },
  timeout: { n: 'Тайм-аут', cost: 1, d: 'Бонус от тактики капитана и +1 импульс в следующем раунде.' },
  star: { n: 'Звезда раунда', cost: 4, d: 'Большой бонус от общего рейтинга вашего лучшего игрока.' },
  eco: { n: 'Эко-раунд', cost: 0, d: 'Команда не закупается: раунд слабее, зато деньги целы и +3 импульса.' },
  cross: { n: 'Перекрёстный огонь', cost: 3, d: 'Бонус от позиции всей пятёрки, в защите в полтора раза сильнее.' }
};
const DECK = Object.keys(AC);
function acVal(k, me, ctx) {
  const e = me.info.e;
  switch (k) {
    case 'tempo': return ctx.oppStack ? -6 : (4 + (e[1].st.ent - 70) / 4) * (ctx.side === 'A' ? 1.25 : 1);
    case 'stack': return ctx.oppTempo ? 11 : ctx.oppNades ? -3 : 2;
    case 'nades': return 6 + (e[2].st.utl - 70) / 4 + (ctx.oppStack ? 3 : 0);
    case 'awp': return 3.5 + (e[0].st.aim - 70) / 3;
    case 'clutch': return (2 + (e[3].st.clu - 70) / 5) * (ctx.behind ? 2 : 1);
    case 'timeout': return 1.5 + (ctx.cap - 70) / 5;
    case 'star': return 8 + (me.info.best - 75) / 2;
    case 'eco': return -7;
    case 'cross': return (5 + (me.info.pos - 70) / 4) * (ctx.side === 'D' ? 1.5 : 1);
    default: return 0;
  }
}
/* ---------- Тактики перед раундом (быстрый план) ----------
   Атака (T) и защита (CT) выбирают по одной тактике. Тактика задаёт точку и темп (по ним идёт 3D-розыгрыш), приказ к ней
   (карта из руки, если хватает импульса) и свой плюс/минус против тактики соперника: bt — кого бьёт (+TK_HIT), ls — кому проигрывает (−TK_HIT).
   need: 'buy' — только с закупкой (полная/форс), 'eco' — только на пистолетах или без денег, иначе всегда. */
const TK_HIT = 3.4;
const TK = {
  rushB: { s: 'A', n: 'Раш B', d: 'Быстро всей пятёркой на B', ic: 'B', dir: 'B', tempo: 'fast', card: 'tempo', ac: '#ff8a3d', bt: ['even', 'awpMid', 'midAgro'], ls: ['stackB', 'cross'] },
  rushA: { s: 'A', n: 'Раш A', d: 'Быстро всей пятёркой на A', ic: 'A', dir: 'A', tempo: 'fast', card: 'tempo', ac: '#ff7a5a', bt: ['even', 'awpMid', 'midAgro'], ls: ['stackA', 'cross'] },
  splitA: { s: 'A', n: 'Сплит A', d: 'Медленно, с двух сторон на A', ic: 'A', dir: 'A', tempo: 'slow', card: 'nades', ac: '#ff5a5a', need: 'buy', bt: ['stackA', 'retake'], ls: ['midAgro', 'antiEco'] },
  splitB: { s: 'A', n: 'Сплит B', d: 'Медленно, с двух сторон на B', ic: 'B', dir: 'B', tempo: 'slow', card: 'nades', ac: '#e8604f', need: 'buy', bt: ['stackB', 'retake'], ls: ['midAgro', 'antiEco'] },
  deflt: { s: 'A', n: 'Дефолт', d: 'Разведка по карте, точка по ходу', ic: '⇄', dir: 'S', tempo: 'norm', card: 'nades', ac: '#f2c14e', bt: ['save', 'retake'], ls: ['midAgro', 'awpMid'] },
  mid: { s: 'A', n: 'Через мид', d: 'Забираем мид, потом на любую точку', ic: 'M', dir: 'S', tempo: 'norm', card: 'awp', ac: '#ffd166', need: 'buy', bt: ['stackA', 'stackB', 'even'], ls: ['midAgro', 'awpMid'] },
  fake: { s: 'A', n: 'Фейк A → B', d: 'Шум и граната на A, выход на B', ic: '↷', dir: 'B', tempo: 'norm', card: 'fake', ac: '#b79bff', bt: ['stackA', 'even'], ls: ['stackB', 'awpMid'] },
  lurk: { s: 'A', n: 'Лерк', d: 'Четверо на A, один тихо заходит с B', ic: 'L', dir: 'A', tempo: 'norm', card: 'clutch', ac: '#7fe0d0', bt: ['stackA', 'retake'], ls: ['even', 'cross'] },
  contact: { s: 'A', n: 'Контакт', d: 'Тихо, без гранат, ловим ротацию', ic: '•', dir: 'S', tempo: 'slow', card: 'clutch', ac: '#9fd36b', bt: ['midAgro', 'antiEco'], ls: ['cross', 'even'] },
  ecoRush: { s: 'A', n: 'Эко-раш', d: 'Без денег: все вместе в одну точку', ic: '$', dir: 'B', tempo: 'fast', card: 'tempo', ac: '#c9a26a', need: 'eco', bt: ['even', 'awpMid', 'save'], ls: ['antiEco', 'stackB'] },
  stackA: { s: 'D', n: 'Стек A', d: 'Трое на A, по одному на мид и B', ic: 'A', dir: 'A', tempo: 'norm', card: 'stack', ac: '#4aa3ff', bt: ['rushA', 'lurk'], ls: ['fake', 'splitA', 'mid'] },
  stackB: { s: 'D', n: 'Стек B', d: 'Трое на B, по одному на мид и A', ic: 'B', dir: 'B', tempo: 'norm', card: 'stack', ac: '#8f7bff', bt: ['rushB', 'fake', 'ecoRush'], ls: ['splitB', 'mid'] },
  even: { s: 'D', n: 'Ровно 2-1-2', d: 'Двое на каждой точке, один на миде', ic: '◎', dir: 'S', tempo: 'norm', card: 'cross', ac: '#7fe0d0', bt: ['lurk', 'contact'], ls: ['rushA', 'rushB', 'mid'] },
  midAgro: { s: 'D', n: 'Агрессия на мид', d: 'Забираем мид, ломаем атаке выходы', ic: 'M', dir: 'S', tempo: 'fast', card: 'tempo', ac: '#5ec8ff', bt: ['mid', 'deflt', 'splitA', 'splitB'], ls: ['rushA', 'rushB', 'contact'] },
  retake: { s: 'D', n: 'Ретейк', d: 'Отдаём точку, возвращаем её вчетвером', ic: '↺', dir: 'S', tempo: 'slow', card: 'timeout', ac: '#9ab8ff', bt: ['rushA', 'rushB'], ls: ['splitA', 'splitB', 'lurk', 'deflt'] },
  awpMid: { s: 'D', n: 'Снайпер на миде', d: 'AWP держит центр, остальные ровно', ic: '⌖', dir: 'S', tempo: 'norm', card: 'awp', ac: '#6fd0c0', need: 'buy', bt: ['mid', 'deflt', 'fake'], ls: ['rushA', 'rushB', 'ecoRush'] },
  antiEco: { s: 'D', n: 'Анти-эко', d: 'Атака без денег: выходим вперёд', ic: '»', dir: 'S', tempo: 'fast', card: 'tempo', ac: '#ffb35a', bt: ['ecoRush', 'contact', 'splitA', 'splitB'], ls: [] },
  save: { s: 'D', n: 'Сейв-сетап', d: 'Стоим глубоко, бережём оружие', ic: '▣', dir: 'S', tempo: 'slow', card: 'eco', ac: '#9aa3ae', bt: [], ls: ['deflt', 'ecoRush'] },
  cross: { s: 'D', n: 'Перекрёсток', d: 'Двое держат один проход под разными углами', ic: '✕', dir: 'S', tempo: 'norm', card: 'cross', ac: '#4fd1a5', need: 'buy', bt: ['rushA', 'rushB', 'lurk', 'contact'], ls: ['mid', 'splitA'] }
};
const TK_T = Object.keys(TK).filter(k => TK[k].s === 'A'), TK_CT = Object.keys(TK).filter(k => TK[k].s === 'D');
/* доступна ли тактика при такой закупке (pistol/full/force/eco) */
const tkOk = (k, buy) => !!TK[k] && (!TK[k].need || (TK[k].need === 'buy' ? buy === 'full' || buy === 'force' : buy === 'eco' || buy === 'pistol'));
/* плюс тактики против тактики соперника; «Анти-эко» сильно, только если у атаки нет закупки, иначе это ошибка; «Сейв» слабее, зато бережёт деньги */
function tkBonus(my, op, myBuy, opBuy) {
  const a = TK[my]; if (!a) return 0;
  let v = a.bt.includes(op) ? TK_HIT : a.ls.includes(op) ? -TK_HIT : 0;
  if (my === 'antiEco') v += opBuy === 'eco' ? 2.5 : opBuy === 'force' || opBuy === 'pistol' ? 0 : -3;
  if (my === 'save') v -= 2.5;
  if (my === 'ecoRush' && myBuy !== 'eco' && myBuy !== 'pistol') v -= 2;
  return v;
}
/* причина раунда для строки после раунда: чем тактика победителя била тактику проигравшего */
function tkWhy(w, l) { const a = TK[w], b = TK[l]; if (!a || !b) return ''; return a.bt.includes(l) ? `«${a.n}» бьёт «${b.n}»` : b.ls.includes(w) ? `«${b.n}» слабо против «${a.n}»` : ''; }

const STYLES = {
  aggro: { n: 'агрессивный', d: 'часто играет «Быстрый темп» и «Звезду раунда»', w: { tempo: 3, star: 2, awp: 1.2, clutch: 1, nades: .8, fake: .6, stack: .4, timeout: .7, cross: .5, eco: .5 } },
  tact: { n: 'тактический', d: 'любит «Раскидку», «Фейк» и «Тайм-аут»', w: { nades: 2.6, fake: 2, timeout: 1.8, awp: 1, tempo: .7, stack: .9, star: 1, clutch: .8, cross: 1, eco: .7 } },
  def: { n: 'осторожный', d: 'ставит «Стек» и «Перекрёстный огонь»', w: { stack: 2.4, cross: 2.4, awp: 1.5, clutch: 1.2, timeout: 1, nades: .8, tempo: .5, fake: .8, star: .9, eco: .8 } }
};
const ONAMES = ['xXKamazXx', 'dedInside7', 'ne_tilt', 'Borsch1k', 'frag_hunter', 'L0tus', 'mid_or_feed', 'Valera_AWP', 'k1tty_cat', 'SiberianOwl', 'tolik2007', 'CtrlAltDefuse', 'smoke_mid', 'Zefir4ik', 'eco_king', 'rush_b_bro', 'Marmok_fan', 'silent_step', 'KoT_B_canorax', 'onetap_andrey'];

const MAPS = [
  { n: 'Mirage', ct: 0, hue: 38, d: 'Равная карта' }, { n: 'Inferno', ct: 1, hue: 22, d: 'Чуть легче в защите' },
  { n: 'Nuke', ct: 2.5, hue: 205, d: 'Сильная защита' }, { n: 'Ancient', ct: 1.5, hue: 150, d: 'Легче в защите' },
  { n: 'Anubis', ct: -1.5, hue: 48, d: 'Легче в атаке' }, { n: 'Dust II', ct: -1, hue: 42, d: 'Чуть легче в атаке' },
  { n: 'Train', ct: 2, hue: 215, d: 'Сильная защита' }
];
const BUY = { pistol: { n: 'Пистолеты', v: 0, c: 800 }, full: { n: 'Полная закупка', v: 0, c: 4000 }, force: { n: 'Форс-бай', v: -4, c: 2500 }, eco: { n: 'Эко', v: -9, c: 0 } };
const WIN_N = 13, HALF = 12, START_MONEY = 800, MAX_MONEY = 12000;
const END = { elim: 'Команда уничтожена', bomb: 'Бомба взорвана', defuse: 'Бомба обезврежена', time: 'Время вышло' };
const DIRS = ['A', 'S', 'B'], DIRN = { A: 'точка A', S: 'по центру', B: 'точка B' }, TEMPOS = ['fast', 'norm', 'slow'], TEMPON = { fast: 'быстро', norm: 'обычно', slow: 'медленно' };
const T_OPEN = { fast: 1.4, norm: 1, slow: .6 }, T_UTIL = { fast: .5, norm: 1, slow: 1.4 };
const AI_ERR = [.42, .36, .3, .24, .18, .13, .08];   // доля ошибочных решений соперника по лигам
const DIR_HIT = 6.5;                      // цена угаданного или неугаданного направления
const other = s => s === 'A' ? 'D' : 'A';

/* ---------- Матч: до 13 побед, смена сторон после 12 раунда, экономика, план на раунд ---------- */
class Match {
  /* o.capt — слот капитана в составе игрока или -1 */
  constructor(mySq, tro, myRating, o = {}) {
    const mk = (name, sq, capt) => { const info = squadInfo(sq); return { name, sq, info, capt, score: 0, en: capt >= 0 ? 3 : 2, bonusEn: 0, deck: shuffle([...DECK]), hand: [], disc: [], money: START_MONEY, ls: 0, ws: 0, k: [0, 0, 0, 0, 0], d: [0, 0, 0, 0, 0], mv: [0, 0, 0, 0, 0], op: [0, 0, 0, 0, 0], spent: 0, buys: {} }; };
    this.a = mk('Вы', mySq, o.capt == null ? -1 : o.capt); this.pvp = !!o.opp;
    if (o.opp) {   /* онлайн: соперник — живой игрок со своим составом, его план приходит по сети */
      this.b = mk(o.opp.name, o.opp.sq, o.opp.capt == null ? -1 : o.opp.capt); this.style = 'tact';
      this.opp = { name: o.opp.name, tro: o.opp.tro | 0, lg: leagueOf(o.opp.tro | 0), rating: this.b.info.rating }; this.err = 0;
      this.fav = { A: 'A', D: 'A' }; this.map = o.map || pick(MAPS);
      this.round = 1; this.sideA = R() < .5 ? 'A' : 'D'; this.over = false; this.hist = []; this.last = null; this.decider = false;
      this.draw(this.a); this.draw(this.b); this.prep(); return;
    }
    const btro = Math.max(0, tro + ri(-100, 100)), t = .45 * clamp(64 + btro / 40, 64, 93) + .55 * myRating + rnd(-2, 2), osq = [];
    for (let role = 0; role < 5; role++) {
      const candidates = ALL.filter(x => x.role === role && !x.sp && !osq.some(q => q.c.nick === x.nick));
      const c = candidates.map(x => ({ c: x, score: Math.abs(x.ovr - t) + R() * 3 })).sort((x, y) => x.score - y.score)[0]?.c;
      if (!c) throw new Error('Не найдена обычная карточка для роли ' + role + ' при создании соперника.');
      osq.push({ c, lv: 1 });
    }
    this.b = mk(pick(ONAMES), osq, 4); this.style = pick(Object.keys(STYLES));
    this.opp = { name: this.b.name, tro: btro, lg: leagueOf(btro), rating: this.b.info.rating }; this.err = AI_ERR[this.opp.lg];
    this.fav = { A: pick(['A', 'B']), D: pick(['A', 'B']) };          // любимые точки соперника в атаке и в защите
    this.map = o.map || pick(MAPS);
    this.round = 1; this.sideA = R() < .5 ? 'A' : 'D'; this.over = false; this.hist = []; this.last = null; this.decider = false;
    this.draw(this.a); this.draw(this.b); this.prep();
  }
  draw(s) { while (s.hand.length < 4) { if (!s.deck.length) { s.deck = shuffle(s.disc); s.disc = []; } if (!s.deck.length) break; s.hand.push(s.deck.pop()); } }
  /* Приказов за раунд можно отдать сколько угодно, пока хватает импульса */
  canPlay(s, cards) { return !!s && Array.isArray(cards) && cards.every(k => typeof k === 'string' && AC[k] && s.hand.includes(k)) && new Set(cards).size === cards.length && cards.reduce((x, k) => x + AC[k].cost, 0) <= s.en; }
  isPistol() { return !this.decider && (this.round === 1 || this.round === HALF + 1); }
  /* Закупка считается сама по деньгам команды; карта «Эко-раунд» заставляет сохранить деньги */
  buyOf(s, cards, want) { if (this.isPistol()) return 'pistol'; if (cards && cards.includes('eco')) return 'eco';
    if (want === 'full' || want === 'force' || want === 'eco') { if (s.money >= BUY[want].c) return want; }      /* закупка на выбор игрока, если хватает денег */
    return s.money >= BUY.full.c ? 'full' : s.money >= BUY.force.c ? 'force' : 'eco'; }
  capIgl(s) { return s.capt >= 0 ? s.info.e[s.capt].st.igl : 55; }
  /* Соперник решает до игрока и видит только прошлые раунды */
  prep() {
    if (this.pvp) { this.nx = { plan: { dir: 'S', tempo: 'norm', focus: -1 }, cards: [], slip: false, intel: null }; return; }
    const slip = R() < this.err;
    this.nx = { plan: this.aiPlan(slip), cards: this.aiChoose(slip), slip };
    this.nx.intel = this.recon();
  }
  /* Тактика соперника-бота. Видит только прошлые раунды: если вы дважды подряд играли одно и то же на этой стороне,
     он с шансом по лиге (40–85%) ставит то, что это бьёт; против атаки без денег играет «Анти-эко». */
  aiPlan(slip) {
    const aiSide = other(this.sideA), aiDef = aiSide === 'D', buy = this.decider ? 'full' : this.buyOf(this.b, []), meBuy = this.decider ? 'full' : this.buyOf(this.a, []);
    const L = (aiDef ? TK_CT : TK_T).filter(k => tkOk(k, buy)), mk = k => ({ dir: TK[k].dir, tempo: TK[k].tempo, focus: -1, tk: k });
    if (slip) return mk(pick(L));
    const lg = this.opp.lg, mine = this.hist.filter(x => x.side === this.sideA && x.tkA).slice(-3).map(x => x.tkA);
    /* сильный соперник меняет привычную точку, если его дважды переиграли */
    if (lg >= 2 && this.hist.filter(x => x.side === this.sideA).slice(-3).filter(x => x.read === 'good' && x.dirB === this.fav[aiSide]).length >= 2) this.fav[aiSide] = this.fav[aiSide] === 'A' ? 'B' : 'A';
    if (aiDef && meBuy === 'eco' && R() < .5 + .06 * lg) return mk('antiEco');
    const last = mine[mine.length - 1], same = mine.length >= 2 && mine[mine.length - 2] === last;
    if (last && same && R() < .4 + .065 * lg) { const c = L.filter(k => TK[k].bt.includes(last)); if (c.length) return mk(pick(c)); }
    const st = this.style, fav = this.fav[aiSide];
    const w = k => { const t = TK[k]; let x = 1;
      if (st === 'aggro') x *= t.tempo === 'fast' ? 2.2 : t.tempo === 'slow' ? .6 : 1;
      if (st === 'def') x *= ['stackA', 'stackB', 'cross', 'retake', 'even', 'contact', 'lurk'].includes(k) ? 1.8 : .8;
      if (st === 'tact') x *= ['splitA', 'splitB', 'fake', 'mid', 'deflt', 'awpMid'].includes(k) ? 1.9 : .8;
      if (t.dir === fav) x *= 1.6;
      if (k === 'antiEco' || k === 'save') x *= .15;
      return x; };
    let tot = 0; const ws = L.map(k => (tot += w(k), w(k))); let q = R() * tot;
    for (let i = 0; i < L.length; i++) { q -= ws[i]; if (q <= 0) return mk(L[i]); }
    return mk(L[0]);
  }
  aiChoose(slip) {
    const s = this.b, w = Object.assign({}, STYLES[this.style].w), h = s.hand, opts = [];
    for (let mask = 0; mask < 1 << h.length; mask++) { const o = h.filter((k, i) => mask >> i & 1); if (this.canPlay(s, o)) opts.push(o); }
    if (slip) return pick(opts.filter(o => o.length <= 1));
    const seen = {}; this.hist.slice(-6).forEach(x => x.mine.forEach(k => seen[k] = (seen[k] || 0) + 1));
    if (seen.tempo >= 2) w.stack *= 1.8; if (seen.stack >= 2) { w.nades *= 1.6; w.tempo *= .5; } if (seen.nades >= 2) w.stack *= .4;
    let best = [], bs = -1e9;
    for (const o of opts) {
      let sc = o.length ? 0 : (s.en < 3 ? 2.6 : s.en >= 6 ? -1 : 1);
      for (const k of o) sc += k === 'eco' ? (s.en <= 1 && s.money < BUY.full.c ? 3.5 : .1) * w.eco : w[k] * (1 + AC[k].cost * .6);
      if (o.includes('eco') && o.length > 1) sc -= 3;
      sc += rnd(0, 2.5);
      if (sc > bs) { bs = sc; best = o; }
    }
    return best;
  }
  /* Частичная разведка: капитан иногда узнаёт одну деталь плана соперника на этот раунд */
  recon() {
    const a = this.a; if (a.capt < 0) return null;
    if (R() > clamp(.3 + (this.capIgl(a) - 65) / 70, .15, .7)) return null;
    const p = this.nx.plan, aiDef = this.sideA === 'A';
    return R() < .65 ? Object.assign({ k: 'dir', v: p.dir, t: p.tk && TK[p.tk] ? 'Соперник готовит: «' + TK[p.tk].n + '»' : aiDef ? 'Соперник усиливает: ' + DIRN[p.dir] : 'Соперник пойдёт: ' + DIRN[p.dir] }, p.tk ? { tk: p.tk } : {}) : { k: 'tempo', v: p.tempo, t: 'Темп соперника: ' + TEMPON[p.tempo] };
  }
  /* Кто кого убил: первое убийство — исход первой дуэли, победитель раунда теряет от 0 до 4 игроков */
  feed(win, pa, pb, sideA, open) {
    const a = this.a, b = this.b, W = win ? a : b, L = win ? b : a, wSide = win ? sideA : other(sideA);
    /* как кончился раунд (на победителя и деньги не влияет): атака чаще побеждает взрывом бомбы или добивает защиту уже после закладки,
       защита — не даёт заложить, разминирует или держит до конца времени */
    const r = R(), end = wSide === 'A' ? (r < .5 ? 'bomb' : 'elim') : (r < .3 ? 'defuse' : r < .42 ? 'time' : 'elim');
    const planted = end === 'bomb' || end === 'defuse' || (end === 'elim' && wSide === 'A' && R() < .55);
    const gap = Math.abs(pa - pb), firstW = open.team === W;
    const surv = clamp(Math.round(rnd(.6, 3.2) + gap / 9 + (R() < .12 ? -1.5 : 0)), 1, firstW ? 5 : 4);
    const lSurv = end === 'elim' ? 0 : end === 'bomb' ? ri(0, 2) : end === 'time' ? ri(1, 2) : ri(0, 1);
    const order = shuffle([...Array(5 - lSurv).fill(1), ...Array(5 - surv).fill(0)]);
    if (lSurv === 0 && order[order.length - 1] !== 1) { const i = order.lastIndexOf(1); order[i] = 0; order[order.length - 1] = 1; }
    const want = firstW ? 1 : 0; if (order[0] !== want) { let j = -1; for (let i = 1; i < order.length; i++) if (order[i] === want && !(lSurv === 0 && i === order.length - 1)) { j = i; break; } if (j > 0) { order[j] = order[0]; order[0] = want; } }
    const alive = [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], kills = [], cnt = {};
    const wp = (team, arr) => { let tot = 0; const ws = arr.map(i => { const x = Math.pow(team.info.e[i].st.aim / 70, 4); tot += x; return x; }); let q = R() * tot; for (let i = 0; i < arr.length; i++) { q -= ws[i]; if (q <= 0) return arr[i]; } return arr[0]; };
    order.forEach((byW, n) => {
      const K = byW ? W : L, V = byW ? L : W, ka = alive[byW ? 0 : 1], va = alive[byW ? 1 : 0];
      const first = n === 0 && K === open.team;
      const ki = first ? open.k : wp(K, ka), vi = first && va.includes(open.v) ? open.v : pick(va); va.splice(va.indexOf(vi), 1);
      K.k[ki]++; V.d[vi]++; if (first) K.op[ki]++; const key = (K === a ? 'a' : 'b') + ki; cnt[key] = (cnt[key] || 0) + 1;
      kills.push({ byA: K === a, k: ki, v: vi, hs: R() < .45, awp: K.info.e[ki].c.role === 0 && R() < .7 });
    });
    let top = null; for (const key in cnt) if ((key[0] === 'a') === (W === a) && (!top || cnt[key] > cnt[top])) top = key;
    const ti = top ? +top[1] : wp(W, [0, 1, 2, 3, 4]), frags = top ? cnt[top] : 0; W.mv[ti]++;
    const lastAlive = surv === 1 ? pick([0, 1, 2, 3, 4]) : -1;
    return { kills, end, planted, surv, lSurv, mvp: W.info.e[ti].c.nick, mvpI: ti, frags, ace: frags === 5, clutch: surv === 1 && frags >= 2 && lastAlive === ti, lastAlive, kA: kills.filter(x => x.byA).length, awpK: kills.filter(x => x.byA && x.k === 0).length };
  }
  /* шанс атаки выиграть первую дуэль: энтри атаки против снайпера защиты */
  openP() { const att = this.sideA === 'A' ? this.a : this.b, def = att === this.a ? this.b : this.a, ent = att.info.e[1], hold = def.info.e[0];
    return 1 / (1 + Math.exp(-(ent.st.ent - (hold.st.aim + hold.st.pos) / 2 - 1.5 * hold.pw + 2) / 7)); }
  /* разыграть первую дуэль заранее (для решения капитана по ходу раунда): true — первый фраг у атаки */
  rollOpen() { this.preOpen = { r: this.round, v: R() < this.openP() }; return this.preOpen.v; }
  /* Разыграть раунд: mine — приказы игрока, plan — направление, темп и ставка на игрока */
  play(mine, plan) {
    if (this.over || !this.canPlay(this.a, mine)) return null;
    plan = Object.assign({ dir: 'S', tempo: 'norm', focus: -1 }, plan && typeof plan === 'object' ? plan : {});
    if (!DIRS.includes(plan.dir)) plan.dir = 'S';
    if (!TEMPOS.includes(plan.tempo)) plan.tempo = 'norm';
    if (!Number.isInteger(plan.focus) || plan.focus < 0 || plan.focus >= 5) plan.focus = -1;
    if (plan.tk != null && (!TK[plan.tk] || TK[plan.tk].s !== this.sideA)) delete plan.tk;
    /* решение по ходу раунда: удачное решение даёт до +3, неудачное или потерянное время — до −3 */
    const mc = clamp(+plan.mc || 0, -3, 3), mcB = clamp(+(this.nx.plan && this.nx.plan.mc) || 0, -3, 3);
    const a = this.a, b = this.b, ai = this.nx, theirs = ai.cards, pB = ai.plan, sideA = this.sideA, sideB = other(sideA), pistol = this.isPistol();
    const act = (own, oth) => { let l = [...own]; if (oth.includes('fake')) { const t = l.filter(k => k !== 'fake').sort((x, y) => AC[y].cost - AC[x].cost)[0]; if (t) l = l.filter(k => k !== t); return { l, cut: t || null }; } return { l, cut: null }; };
    const A = act(mine, theirs), B = act(theirs, mine);
    const buyA = this.decider ? 'full' : this.buyOf(a, mine, plan.buy), buyB = this.decider ? 'full' : this.buyOf(b, theirs);
    const val = (me, my, opp, side, behind) => { const ctx = { side, behind, cap: this.capIgl(me), oppStack: opp.includes('stack'), oppTempo: opp.includes('tempo'), oppNades: opp.includes('nades') }; return my.filter(k => k !== 'eco').map(k => ({ k, v: acVal(k, me, ctx) })); };
    const va = val(a, A.l, B.l, sideA, a.score < b.score), vb = val(b, B.l, A.l, sideB, b.score < a.score);
    const mapV = s => (s === 'D' ? 1 : -1) * this.map.ct / 2, hot = s => s.ws >= 2 ? 1.5 : 0;
    /* вклад ролей и способностей */
    const role = (s, pl, behind) => {
      const e = s.info.e, util = (e[2].st.utl - 70) / 6 * T_UTIL[pl.tempo] * (1 + .25 * e[2].pw), lurk = behind || this.decider ? .8 * e[3].pw : 0, ind = e.reduce((x, y) => x + .3 * y.ipw, 0);
      return util + lurk + ind;
    };
    const avg = a.info.e.reduce((x, y) => x + y.ovr, 0) / 5, fN = plan.focus >= 0 ? this.hist.slice(-4).filter(x => x.focus === plan.focus).length : 0;
    const focus = plan.focus < 0 ? 0 : fN >= 3 && !ai.slip ? -1.5 : clamp((a.info.e[plan.focus].ovr - avg) * .35, -1.5, 2.5);
    const att = sideA === 'A' ? a : b, def = att === a ? b : a, pAtt = att === a ? plan : pB, pDef = att === a ? pB : plan, cAtt = att === a ? A.l : B.l;
    /* направление: атака в усиленную точку проигрывает, мимо усиления — выигрывает */
    let dm = pAtt.dir !== 'S' && pDef.dir !== 'S' ? (pAtt.dir === pDef.dir ? -DIR_HIT : DIR_HIT) : pAtt.dir === 'S' && pDef.dir !== 'S' ? 1 : 0;
    const faked = dm < 0 && cAtt.includes('fake'); if (faked) dm = 0;
    dm *= 1 - .3 * (dm < 0 ? att : def).info.e[4].pw;
    /* первая дуэль: энтри атаки против снайпера защиты, ставка зависит от темпа атаки */
    const pre = this.preOpen && this.preOpen.r === this.round ? this.preOpen.v : null, openAtt = pre != null ? pre : R() < this.openP(); this.preOpen = null;
    const ent = att.info.e[1];
    const stake = 3 * T_OPEN[pAtt.tempo], swing = openAtt ? stake : -stake * (1 - .5 * Math.min(1, ent.pw));
    const sgn = att === a ? 1 : -1;
    const baseA = (sideA === 'A' ? a.info.atk : a.info.def) + mapV(sideA), baseB = (sideB === 'A' ? b.info.atk : b.info.def) + mapV(sideB);
    const tkB0 = pB.tk && TK[pB.tk] && TK[pB.tk].s === sideB ? pB.tk : null, tkA = tkBonus(plan.tk, tkB0, buyA, buyB), tkB = tkBonus(tkB0, plan.tk, buyB, buyA);
    const rA = role(a, plan, a.score < b.score), rB = role(b, pB, b.score < a.score), cA = va.reduce((s, x) => s + x.v, 0), cB = vb.reduce((s, x) => s + x.v, 0);
    const pa = baseA + BUY[buyA].v + hot(a) + cA + rA + focus + mc + tkA + sgn * (dm + swing) / 2;
    const pb = baseB + BUY[buyB].v + hot(b) + cB + rB + mcB + tkB - sgn * (dm + swing) / 2;
    /* разбор раунда (с вашей стороны, в очках силы; сумма = pa − pb): состав и сторона карты, деньги и серия, приказы, роли и фокус,
       тактика против тактики, решение капитана, угаданная точка, первая дуэль */
    const fx = { sq: baseA - baseB, buy: BUY[buyA].v - BUY[buyB].v + hot(a) - hot(b), cards: cA - cB, roles: rA + focus - rB, tk: tkA - tkB, call: mc - mcB, read: sgn * dm, duel: sgn * swing };
    const p = 1 / (1 + Math.exp(-(pa - pb) / 9)), win = R() < p;
    const W = win ? a : b, L = win ? b : a; W.score++;
    const open = openAtt ? { team: att, k: 1, v: ri(0, 4) } : { team: def, k: 0, v: 1 };
    const f = this.feed(win, pa, pb, sideA, open);
    for (const [s, pl, buy] of [[a, mine, buyA], [b, theirs, buyB]]) {
      s.en -= pl.reduce((x, k) => x + AC[k].cost, 0);
      s.bonusEn = (pl.includes('timeout') ? 1 : 0) + (pl.includes('eco') ? 3 : 0);
      for (const k of pl) { s.hand.splice(s.hand.indexOf(k), 1); s.disc.push(k); }
      if (!pl.length && s.hand.length) s.disc.push(s.hand.shift());
      s.money = Math.max(0, s.money - BUY[buy].c); s.spent += BUY[buy].c; const q = s.buys[buy] = s.buys[buy] || [0, 0]; q[0]++; if (s === W) q[1]++;
    }
    W.money = Math.min(MAX_MONEY, W.money + 3250 + 500 * f.surv); L.money = Math.min(MAX_MONEY, L.money + 1900 + 500 * Math.min(L.ls, 3) + 400 * f.lSurv);
    const Ltk = L === a ? plan.tk : tkB0, Lsv = L === a ? plan.save : pB.save; if (Ltk === 'save' || Lsv) L.money = Math.min(MAX_MONEY, L.money + 1200);   /* сейв сохранил оружие */
    W.ws++; W.ls = 0; L.ls++; L.ws = 0;
    const read = pAtt.dir === 'S' || pDef.dir === 'S' ? null : faked ? 'fake' : (pAtt.dir === pDef.dir) === (att === a) ? 'bad' : 'good';
    this.last = Object.assign({ round: this.round, mine, theirs, plan, planB: pB, cutA: A.cut, cutB: B.cut, va, vb, pa, pb, p, win, sideA, buyA, buyB, pistol, decider: this.decider, openMine: (att === a) === openAtt, read, intel: ai.intel, slip: ai.slip, swap: false, fx, tkA: plan.tk || null, tkB: tkB0, tkVa: tkA, tkVb: tkB, why: (() => { const wT = win ? plan.tk : tkB0, lT = win ? tkB0 : plan.tk, w = tkWhy(wT, lT), u = tkWhy(lT, wT); return w || (u ? u + ', но перестрелки решили иначе' : ''); })() }, f);
    this.hist.push({ round: this.round, win, side: sideA, dirA: plan.dir, dirB: pB.dir, tkA: plan.tk || null, tkB: tkB0, focus: plan.focus, mine: [...mine], theirs: [...theirs], end: f.end, p, buyA, buyB, read, openMine: this.last.openMine, clutch: f.clutch, ace: f.ace, mvp: f.mvp, score: a.score + ':' + b.score });
    if (a.score >= WIN_N || b.score >= WIN_N) { this.over = true; this.won = a.score > b.score; return this.last; }
    this.round++;
    if (this.round === HALF + 1) { this.sideA = sideB; this.last.swap = true; for (const s of [a, b]) { s.money = START_MONEY; s.ls = 0; s.ws = 0; } }
    if (a.score === HALF && b.score === HALF) { this.decider = true; for (const s of [a, b]) s.money = MAX_MONEY; }
    for (const s of [a, b]) { s.en = Math.min(8, s.en + 2 + s.bonusEn); s.bonusEn = 0; this.draw(s); }
    this.prep();
    return this.last;
  }
  /* Лучший игрок матча: больше всего убийств у победителей */
  mvp() { const W = this.won ? this.a : this.b; let i = 0; for (let k = 1; k < 5; k++) if (W.k[k] > W.k[i]) i = k; return { nick: W.info.e[i].c.nick, k: W.k[i], d: W.d[i], mine: this.won }; }
  /* Послематчевый отчёт: игроки, экономика, ключевые моменты и выводы */
  report() {
    const a = this.a, h = this.hist, my = h.filter(x => x.win), lost = h.filter(x => !x.win), mom = [], notes = [];
    const players = a.info.e.map((x, i) => ({ nick: x.c.nick, k: a.k[i], d: a.d[i], mv: a.mv[i], op: a.op[i] }));
    const cl = h.find(x => x.win && (x.ace || x.clutch)); if (cl) mom.push(`Раунд ${cl.round}: ${cl.mvp} — ${cl.ace ? 'эйс' : 'клатч'}, счёт стал ${cl.score}.`);
    const up = my.slice().sort((x, y) => x.p - y.p)[0]; if (up && up.p < .4 && up !== cl) mom.push(`Раунд ${up.round}: взяли раунд с шансом ${Math.round(up.p * 100)}%${up.buyA === 'eco' || up.buyA === 'force' ? ' на слабой закупке' : ''}.`);
    const dn = lost.slice().sort((x, y) => y.p - x.p)[0]; if (dn && dn.p > .62) mom.push(`Раунд ${dn.round}: отдали раунд при шансе ${Math.round(dn.p * 100)}%.`);
    let run = 0, best = 0, at = 0; h.forEach(x => { run = x.win ? run + 1 : 0; if (run > best) { best = run; at = x.round; } }); if (best >= 4 && mom.length < 3) mom.push(`Серия из ${best} раундов подряд закончилась в раунде ${at}.`);
    const bad = h.filter(x => x.read === 'bad').length, good = h.filter(x => x.read === 'good').length;
    if (bad >= 4 && bad > good) notes.push(`Соперник ${bad} раз прочитал ваше направление, вы его — ${good}. Чаще меняйте точку и следите за разведкой.`);
    else if (good >= 4 && good > bad) notes.push(`Вы ${good} раз переиграли соперника по направлению — выбор точки работал.`);
    const op = h.filter(x => x.openMine).length; if (h.length >= 8) notes.push(op / h.length < .42 ? `Первые дуэли: выиграно ${op} из ${h.length}. Усильте энтри и снайпера или играйте медленнее.` : op / h.length > .58 ? `Первые дуэли: выиграно ${op} из ${h.length}. Быстрый темп будет давать ещё больше.` : `Первые дуэли: выиграно ${op} из ${h.length}.`);
    const fr = a.buys.force; if (fr && fr[0] >= 3 && fr[1] / fr[0] < .34) notes.push(`Форс-закупки почти не сработали: ${fr[1]} из ${fr[0]}. Выгоднее сохранять деньги картой «Эко-раунд».`);
    const side = s => { const r = h.filter(x => x.side === s); return r.length ? r.filter(x => x.win).length + ' из ' + r.length : '—'; };
    if (notes.length < 3) notes.push(`Раунды в атаке: ${side('A')}, в защите: ${side('D')}.`);
    return { players, moments: mom.slice(0, 3), notes: notes.slice(0, 3), eco: { spent: a.spent, buys: a.buys } };
  }
}
/* Награды за рейтинговый матч: монеты 40 и 10; кубки +25, +30 за разницу больше 5 раундов; −25, −30 за 0:13 */
function applyResult(G, won, sa, sb) {
  const lg0 = leagueOf(G.best), r = { won, tro: won ? (sa - sb > 5 ? 30 : 25) : -Math.min(G.tro, sa === 0 && sb >= WIN_N ? 30 : 25), coins: won ? 40 : 10, xp: won ? 40 : 15, packs: [] };
  G.tro += r.tro; G.coins += r.coins; if (won) G.w++; else G.l++;
  if (G.tro > G.best) { G.best = G.tro; const n = leagueOf(G.best); if (n > lg0) { G.packs.pro++; r.packs.push('кейс «Про» за лигу «' + LEAGUES[n][0] + '»'); } }
  const up = addXp(G, r.xp); if (up) r.packs.push('базовый кейс за уровень ' + G.lvl);
  if (won && G.c4 && typeof c4WinReward === 'function') { const t = c4WinReward(G); if (t) r.packs.push(t); }   /* шанс на попытку или подсказку C4 */
  return r;
}
