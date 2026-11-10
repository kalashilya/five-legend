/* ===== Ядро: карточки, паки, состав, матч ===== */
const R = Math.random, rnd = (a, b) => a + R() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(R() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hsh = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const RN = ['AWP', 'ENT', 'SUP', 'LRK', 'IGL'], RNAME = ['Снайпер', 'Энтри', 'Саппорт', 'Люркер', 'Капитан'];
const SK = ['aim', 'ent', 'clu', 'utl', 'pos', 'igl'], SN = { aim: 'Стрельба', ent: 'Опенинг', clu: 'Клатч', utl: 'Гранаты', pos: 'Позиция', igl: 'Тактика' }, SS = { aim: 'СТР', ent: 'ОПН', clu: 'КЛЧ', utl: 'ГРН', pos: 'ПОЗ', igl: 'ТАК' };
const RAR = ['Ширпотреб', 'Армейское', 'Запрещённое', 'Засекреченное', 'Тайное'], SPN = ['', 'Игрок недели', 'MVP'];
const PROF = [{ aim: 4, pos: 4, ent: -2, utl: -3, igl: -3 }, { ent: 6, aim: 2, clu: -3, pos: -3, igl: -2 }, { utl: 7, pos: 1, ent: -4, aim: -2 }, { clu: 6, pos: 3, ent: -3, utl: -3, igl: -3 }, { igl: 10, utl: 3, aim: -5, ent: -3, clu: -3 }];
const W_ID = 100000, M_ID = 200000;      // номера особых версий: «Игрок недели» и MVP
const CARDS = {}, POOL = [[], [], [], [], []], IFP = [[], [], [], [], []], MVPP = [];
(function build() {
  const rows = {};
  const mk = (id, row, add, sp, rar) => {
    const [nick, t, role, o, pid, , hist, rawStats, hltv] = row, ovr = Math.min(99, o + add), st = {};
    if (Array.isArray(rawStats) && rawStats.length === SK.length) SK.forEach((k, i) => st[k] = clamp(Math.round(rawStats[i] + add), 40, 99));
    else for (const k of SK) st[k] = clamp(ovr + (PROF[role][k] || 0) + (hsh(nick + k) % 7) - 3, 40, 99);
    return CARDS[id] = { id, base: pid, nick, team: TM[t], t: Math.min(t, 100), role, ovr, rar, sp, hist: !!hist, st, hltv: hltv || null };
  };
  PL.forEach(row => { rows[row[4]] = row; POOL[row[5]].push(mk(row[4], row, 0, 0, row[5])); });
  SPM.forEach(pid => { if (rows[pid]) MVPP.push(mk(M_ID + pid, rows[pid], 3, 2, 4)); });
  SPW.forEach(pid => { if (rows[pid]) { const r2 = Math.min(4, rows[pid][5] + 1); IFP[r2].push(mk(W_ID + pid, rows[pid], 3, 1, r2)); } });
})();
const ALL = Object.values(CARDS).sort((a, b) => b.ovr - a.ovr || a.id - b.id);

/* ---------- Способности ----------
   Базовая зависит от естественной роли и работает только на своей роли. Индивидуальная задаётся по нику в IND;
   пока данных HLTV нет, у всех нейтральная «Командная игра». Сила растёт с уровнем, у особых версий она выше. */
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
  anchor: { n: 'Опорник', d: 'Высокий HLTV Closing: сильнее влияет на поздние стадии раунда.', mult: 1.08 }
};
const IND = { donk: 'duelist', ZywOo: 'sniper', m0NESY: 'sniper', Vexite: 'entry', jks: 'support', insani: 'entry', blameF: 'anchor', asap: 'duelist', JamYoung: 'support', Senzu: 'entry' };
const indOf = c => AB_IND[IND[c.nick] || 'team'];
const abPow = (c, lv) => (1 + .1 * (lv - 1)) * (c.sp ? 1.3 : 1);
const indPow = (c, lv) => abPow(c, lv) * (indOf(c).mult || 1);

/* ---------- Паки ---------- */
const PACKS = {
  basic: { n: 'Базовый', price: 400, odds: [62, 27, 9, 1.8, .2], min: 0, d: 'Пять карточек, чаще всего ширпотреб.' },
  pro: { n: 'Про', price: 1200, odds: [30, 40, 23, 6, 1], min: 2, d: 'Минимум одна «Запрещённое» или выше.' },
  elite: { n: 'Элитный', price: 4000, odds: [0, 40, 42, 14, 4], min: 3, d: 'Минимум одна «Засекреченное» или выше.' }
};
const IF_CH = .07, MVP_CH = .12;
function rollRar(odds) { let r = R() * 100; for (let i = 0; i < 5; i++) { r -= odds[i]; if (r <= 0) return i; } return 0; }
function pickIn(rar) {
  if (rar === 4 && R() < MVP_CH) return pick(MVPP);
  if (IFP[rar].length && R() < IF_CH) return pick(IFP[rar]);
  const pool = POOL[rar], mn = Math.min(...pool.map(c => c.ovr)); let tot = 0;
  const w = pool.map(c => { const x = 1 / ((1 + .3 * (c.ovr - mn)) * (1 + (100 - c.t) / 100)); tot += x; return x; });
  let r = R() * tot; for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; } return pool[0];
}
function openPack(type) {
  const P = PACKS[type], out = []; let best = 0;
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
    this.a = mk('Вы', mySq, o.capt == null ? -1 : o.capt);
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
  buyOf(s, cards) { return this.isPistol() ? 'pistol' : cards && cards.includes('eco') ? 'eco' : s.money >= BUY.full.c ? 'full' : s.money >= BUY.force.c ? 'force' : 'eco'; }
  capIgl(s) { return s.capt >= 0 ? s.info.e[s.capt].st.igl : 55; }
  /* Соперник решает до игрока и видит только прошлые раунды */
  prep() {
    const slip = R() < this.err;
    this.nx = { plan: this.aiPlan(slip), cards: this.aiChoose(slip), slip };
    this.nx.intel = this.recon();
  }
  aiPlan(slip) {
    if (slip) return { dir: pick(DIRS), tempo: pick(TEMPOS), focus: -1 };
    const st = this.style, aiSide = other(this.sideA), all = this.hist.filter(x => x.side === this.sideA), h = all.slice(-5), cnt = { A: 0, S: 0, B: 0 }; h.forEach(x => cnt[x.dirA]++);
    /* сильный соперник меняет привычную точку, если его дважды переиграли */
    if (this.opp.lg >= 2 && all.slice(-3).filter(x => x.read === 'good' && x.dirB === this.fav[aiSide]).length >= 2) this.fav[aiSide] = this.fav[aiSide] === 'A' ? 'B' : 'A';
    const top = cnt.A >= cnt.B ? 'A' : 'B', aiDef = aiSide === 'D';
    const dir = h.length >= 3 && cnt[top] >= 3 && R() < .6 ? (aiDef ? top : top === 'A' ? 'B' : 'A') : R() < .55 ? this.fav[aiSide] : pick(DIRS);
    const tempo = pick(st === 'aggro' ? ['fast', 'fast', 'norm'] : st === 'def' ? ['slow', 'slow', 'norm'] : ['norm', 'norm', 'fast', 'slow']);
    return { dir, tempo, focus: -1 };
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
    return R() < .65 ? { k: 'dir', v: p.dir, t: aiDef ? 'Соперник усиливает: ' + DIRN[p.dir] : 'Соперник пойдёт: ' + DIRN[p.dir] } : { k: 'tempo', v: p.tempo, t: 'Темп соперника: ' + TEMPON[p.tempo] };
  }
  /* Кто кого убил: первое убийство — исход первой дуэли, победитель раунда теряет от 0 до 4 игроков */
  feed(win, pa, pb, sideA, open) {
    const a = this.a, b = this.b, W = win ? a : b, L = win ? b : a, wSide = win ? sideA : other(sideA);
    const r = R(), end = wSide === 'A' ? (r < .3 ? 'bomb' : 'elim') : (r < .22 ? 'defuse' : r < .32 ? 'time' : 'elim');
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
    return { kills, end, surv, lSurv, mvp: W.info.e[ti].c.nick, mvpI: ti, frags, ace: frags === 5, clutch: surv === 1 && frags >= 2 && lastAlive === ti, lastAlive, kA: kills.filter(x => x.byA).length, awpK: kills.filter(x => x.byA && x.k === 0).length };
  }
  /* Разыграть раунд: mine — приказы игрока, plan — направление, темп и ставка на игрока */
  play(mine, plan) {
    if (this.over || !this.canPlay(this.a, mine)) return null;
    plan = Object.assign({ dir: 'S', tempo: 'norm', focus: -1 }, plan && typeof plan === 'object' ? plan : {});
    if (!DIRS.includes(plan.dir)) plan.dir = 'S';
    if (!TEMPOS.includes(plan.tempo)) plan.tempo = 'norm';
    if (!Number.isInteger(plan.focus) || plan.focus < 0 || plan.focus >= 5) plan.focus = -1;
    const a = this.a, b = this.b, ai = this.nx, theirs = ai.cards, pB = ai.plan, sideA = this.sideA, sideB = other(sideA), pistol = this.isPistol();
    const act = (own, oth) => { let l = [...own]; if (oth.includes('fake')) { const t = l.filter(k => k !== 'fake').sort((x, y) => AC[y].cost - AC[x].cost)[0]; if (t) l = l.filter(k => k !== t); return { l, cut: t || null }; } return { l, cut: null }; };
    const A = act(mine, theirs), B = act(theirs, mine);
    const buyA = this.decider ? 'full' : this.buyOf(a, mine), buyB = this.decider ? 'full' : this.buyOf(b, theirs);
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
    const ent = att.info.e[1], hold = def.info.e[0], pO = 1 / (1 + Math.exp(-(ent.st.ent - (hold.st.aim + hold.st.pos) / 2 - 1.5 * hold.pw + 2) / 7)), openAtt = R() < pO;
    const stake = 3 * T_OPEN[pAtt.tempo], swing = openAtt ? stake : -stake * (1 - .5 * Math.min(1, ent.pw));
    const sgn = att === a ? 1 : -1;
    const baseA = (sideA === 'A' ? a.info.atk : a.info.def) + mapV(sideA), baseB = (sideB === 'A' ? b.info.atk : b.info.def) + mapV(sideB);
    const pa = baseA + BUY[buyA].v + hot(a) + va.reduce((s, x) => s + x.v, 0) + role(a, plan, a.score < b.score) + focus + sgn * (dm + swing) / 2;
    const pb = baseB + BUY[buyB].v + hot(b) + vb.reduce((s, x) => s + x.v, 0) + role(b, pB, b.score < a.score) - sgn * (dm + swing) / 2;
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
    W.ws++; W.ls = 0; L.ls++; L.ws = 0;
    const read = pAtt.dir === 'S' || pDef.dir === 'S' ? null : faked ? 'fake' : (pAtt.dir === pDef.dir) === (att === a) ? 'bad' : 'good';
    this.last = Object.assign({ round: this.round, mine, theirs, plan, planB: pB, cutA: A.cut, cutB: B.cut, va, vb, pa, pb, p, win, sideA, buyA, buyB, pistol, decider: this.decider, openMine: (att === a) === openAtt, read, intel: ai.intel, slip: ai.slip, swap: false }, f);
    this.hist.push({ round: this.round, win, side: sideA, dirA: plan.dir, dirB: pB.dir, focus: plan.focus, mine: [...mine], theirs: [...theirs], end: f.end, p, buyA, read, openMine: this.last.openMine, clutch: f.clutch, ace: f.ace, mvp: f.mvp, score: a.score + ':' + b.score });
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
  return r;
}
