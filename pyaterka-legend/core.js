/* ===== Ядро: карточки, паки, состав, матч ===== */
const R = Math.random, rnd = (a, b) => a + R() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1)), pick = a => a[Math.floor(R() * a.length)], clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hsh = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const RN = ['AWP', 'ENT', 'SUP', 'LRK', 'IGL'], RNAME = ['Снайпер', 'Энтри', 'Саппорт', 'Люркер', 'Капитан'];
const SK = ['aim', 'ent', 'clu', 'utl', 'pos', 'igl'], SN = { aim: 'Стрельба', ent: 'Опенинг', clu: 'Клатч', utl: 'Гранаты', pos: 'Позиция', igl: 'Тактика' }, SS = { aim: 'СТР', ent: 'ОПН', clu: 'КЛЧ', utl: 'ГРН', pos: 'ПОЗ', igl: 'ТАК' };
const RAR = ['Ширпотреб', 'Армейское', 'Запрещённое', 'Засекреченное', 'Тайное'], SPN = ['', 'Игрок недели', 'MVP'];
const PROF = [{ aim: 4, pos: 4, ent: -2, utl: -3, igl: -3 }, { ent: 6, aim: 2, clu: -3, pos: -3, igl: -2 }, { utl: 7, pos: 1, ent: -4, aim: -2 }, { clu: 6, pos: 3, ent: -3, utl: -3, igl: -3 }, { igl: 10, utl: 3, aim: -5, ent: -3, clu: -3 }];
const TIER = [8, 35, 110, 260];           // границы редкостей по месту в общем рейтинге
const CARDS = {}, POOL = [[], [], [], [], []], IFP = [[], [], [], [], []], MVPP = [];
(function build() {
  const mk = (id, i, add, sp, rar) => {
    const [nick, t, role, o] = PL[i], ovr = Math.min(99, o + add), st = {};
    for (const k of SK) st[k] = clamp(ovr + (PROF[role][k] || 0) + (hsh(nick + k) % 7) - 3, 40, 99);
    return CARDS[id] = { id, base: i, nick, team: TM[t], t, role, ovr, rar, sp, st };
  };
  PL.forEach((p, i) => {
    const rar = i < TIER[0] ? 4 : i < TIER[1] ? 3 : i < TIER[2] ? 2 : i < TIER[3] ? 1 : 0;
    POOL[rar].push(mk(i, i, 0, 0, rar));
    if (i < TIER[0]) MVPP.push(mk(2000 + i, i, 3, 2, 4));
    if (hsh(p[0] + 'week') % 100 < 8) { const r2 = Math.min(4, rar + 1); IFP[r2].push(mk(1000 + i, i, 3, 1, r2)); }
  });
})();
const ALL = Object.values(CARDS).sort((a, b) => b.ovr - a.ovr || a.id - b.id);

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
  const pool = POOL[rar], mn = pool[pool.length - 1].ovr; let tot = 0;
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
  const G = { v: 1, coins: 600, tro: 0, best: 0, xp: 0, lvl: 1, cards: {}, squad: [null, null, null, null, null], packs: { basic: 1, pro: 2, elite: 0 }, daily: 0, w: 0, l: 0 };
  for (let role = 0; role < 5; role++) { const c = pick(POOL[0].filter(x => x.role === role && x.ovr <= 66)) || POOL[0].find(x => x.role === role); G.cards[c.id] = { n: 1, lv: 1 }; G.squad[role] = c.id; }
  return G;
}
function addCard(G, id) { const o = G.cards[id]; if (o) { o.n++; return false; } G.cards[id] = { n: 1, lv: 1 }; return true; }
function canUp(G, id) { const o = G.cards[id], c = CARDS[id]; return !!o && o.lv < 5 && o.n - 1 >= UP_N[o.lv - 1] && G.coins >= upCost(c, o.lv); }
function doUp(G, id) { if (!canUp(G, id)) return false; const o = G.cards[id]; G.coins -= upCost(CARDS[id], o.lv); o.n -= UP_N[o.lv - 1]; o.lv++; return true; }
function sellDupes(G, id, all) { const o = G.cards[id]; if (!o || o.n < 2) return 0; const k = all ? o.n - 1 : 1, v = k * sellVal(CARDS[id]); o.n -= k; G.coins += v; return v; }
function addXp(G, x) { G.xp += x; let up = 0; while (G.xp >= 100 * G.lvl) { G.xp -= 100 * G.lvl; G.lvl++; G.packs.basic++; up++; } return up; }
const DAY = 20 * 3600 * 1000;

/* ---------- Состав ---------- */
/* squad: массив из 5 { c: карточка, lv } по слотам ролей */
function effOf(e, slot) { const pen = e.c.role === slot ? 0 : 5, add = e.lv - 1 - pen, st = {}; for (const k of SK) st[k] = e.c.st[k] + add; return { c: e.c, ovr: e.c.ovr + add, st, off: pen > 0 }; }
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
  fake: { n: 'Фейк', cost: 2, d: 'Отменяет самую дорогую карту соперника в этом раунде.' },
  awp: { n: 'AWP-пик', cost: 2, d: 'Бонус от стрельбы вашего снайпера.' },
  clutch: { n: 'Клатч', cost: 1, d: 'Бонус от клатча люркера. Удваивается, когда вы отстаёте по счёту.' },
  timeout: { n: 'Тайм-аут', cost: 1, d: 'Бонус от тактики капитана и +1 энергия в следующем раунде.' },
  star: { n: 'Звезда раунда', cost: 4, d: 'Большой бонус от общего рейтинга вашего лучшего игрока.' },
  eco: { n: 'Эко-раунд', cost: 0, d: 'Команда не закупается: раунд слабее, зато деньги целы и +3 энергии.' },
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
    case 'timeout': return 1.5 + (e[4].st.igl - 70) / 5;
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
const EDGE_A = 2.5;                       // фора игроку: ИИ разыгрывает карты без ошибок по энергии
const WIN_N = 13, HALF = 12, START_MONEY = 800, MAX_MONEY = 12000;
const END = { elim: 'Команда уничтожена', bomb: 'Бомба взорвана', defuse: 'Бомба обезврежена', time: 'Время вышло' };

class Match {
  constructor(mySq, tro, myRating, map) {
    const mk = (name, sq) => ({ name, sq, info: squadInfo(sq), score: 0, en: 3, bonusEn: 0, deck: shuffle([...DECK]), hand: [], disc: [], money: START_MONEY, ls: 0, ws: 0, k: [0, 0, 0, 0, 0], d: [0, 0, 0, 0, 0] });
    this.a = mk('Вы', mySq);
    const t = .45 * clamp(64 + tro / 40, 64, 93) + .55 * myRating + rnd(-2, 2), osq = [];
    for (let role = 0; role < 5; role++) { const c = [...ALL].filter(x => x.role === role && !x.sp && !osq.some(o => o.c.nick === x.nick)).sort((x, y) => Math.abs(x.ovr - t) + R() * 3 - (Math.abs(y.ovr - t) + R() * 3))[0]; osq.push({ c, lv: 1 }); }
    this.b = mk(pick(ONAMES), osq); this.style = pick(Object.keys(STYLES));
    this.map = map || pick(MAPS);
    this.round = 1; this.sideA = R() < .5 ? 'A' : 'D'; this.over = false; this.hist = []; this.last = null; this.decider = false;
    this.draw(this.a); this.draw(this.b);
  }
  draw(s) { while (s.hand.length < 4) { if (!s.deck.length) { s.deck = shuffle(s.disc); s.disc = []; } if (!s.deck.length) break; s.hand.push(s.deck.pop()); } }
  canPlay(s, cards) { return cards.length <= 2 && cards.every(k => s.hand.includes(k)) && cards.reduce((x, k) => x + AC[k].cost, 0) <= s.en; }
  isPistol() { return !this.decider && (this.round === 1 || this.round === HALF + 1); }
  /* Закупка считается сама по деньгам команды; карта «Эко-раунд» заставляет сохранить деньги */
  buyOf(s, cards) { return this.isPistol() ? 'pistol' : cards && cards.includes('eco') ? 'eco' : s.money >= BUY.full.c ? 'full' : s.money >= BUY.force.c ? 'force' : 'eco'; }
  aiChoose() {
    const s = this.b, w = STYLES[this.style].w, h = s.hand, opts = [[]];
    for (let i = 0; i < h.length; i++) { opts.push([h[i]]); for (let j = i + 1; j < h.length; j++) opts.push([h[i], h[j]]); }
    let best = [], bs = -1e9;
    for (const o of opts) {
      if (!this.canPlay(s, o)) continue;
      let sc = o.length ? 0 : (s.en < 3 ? 2.6 : s.en >= 6 ? -1 : 1);
      for (const k of o) sc += k === 'eco' ? (s.en <= 1 && s.money < BUY.full.c ? 3.5 : .1) * w.eco : w[k] * (1 + AC[k].cost * .6);
      if (o.includes('eco') && o.length > 1) sc -= 3;
      sc += rnd(0, 2.5);
      if (sc > bs) { bs = sc; best = o; }
    }
    return best;
  }
  /* Кто кого убил в раунде: победитель теряет от 0 до 4 игроков */
  feed(win, pa, pb, sideA) {
    const a = this.a, b = this.b, W = win ? a : b, L = win ? b : a, wSide = win ? sideA : (sideA === 'A' ? 'D' : 'A');
    const r = R(), end = wSide === 'A' ? (r < .3 ? 'bomb' : 'elim') : (r < .22 ? 'defuse' : r < .32 ? 'time' : 'elim');
    const gap = Math.abs(pa - pb), surv = clamp(Math.round(rnd(.6, 3.2) + gap / 9 + (R() < .12 ? -1.5 : 0)), 1, 5);
    const lSurv = end === 'elim' ? 0 : end === 'bomb' ? ri(0, 2) : end === 'time' ? ri(1, 2) : ri(0, 1);
    const order = shuffle([...Array(5 - lSurv).fill(1), ...Array(5 - surv).fill(0)]);
    if (lSurv === 0 && order[order.length - 1] !== 1) { const i = order.lastIndexOf(1); order[i] = 0; order[order.length - 1] = 1; }
    const alive = [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], kills = [], cnt = {};
    const wp = (team, arr) => { let tot = 0; const ws = arr.map(i => { const x = Math.pow(team.info.e[i].st.aim / 70, 4); tot += x; return x; }); let q = R() * tot; for (let i = 0; i < arr.length; i++) { q -= ws[i]; if (q <= 0) return arr[i]; } return arr[0]; };
    for (const byW of order) {
      const K = byW ? W : L, V = byW ? L : W, ka = alive[byW ? 0 : 1], va = alive[byW ? 1 : 0];
      const ki = wp(K, ka), vi = pick(va); va.splice(va.indexOf(vi), 1);
      K.k[ki]++; V.d[vi]++; const key = (K === a ? 'a' : 'b') + ki; cnt[key] = (cnt[key] || 0) + 1;
      kills.push({ byA: K === a, k: ki, v: vi, hs: R() < .45, awp: K.info.e[ki].c.role === 0 && R() < .7 });
    }
    let top = null; for (const key in cnt) if ((key[0] === 'a') === (W === a) && (!top || cnt[key] > cnt[top])) top = key;
    const ti = top ? +top[1] : wp(W, [0, 1, 2, 3, 4]), frags = top ? cnt[top] : 0;
    return { kills, end, surv, lSurv, mvp: W.info.e[ti].c.nick, mvpI: ti, frags, ace: frags === 5, clutch: surv === 1 && frags >= 2 && alive[0][0] === ti };
  }
  /* Разыграть раунд: mine — карты игрока */
  play(mine) {
    if (this.over || !this.canPlay(this.a, mine)) return null;
    const a = this.a, b = this.b, theirs = this.aiChoose(), sideA = this.sideA, sideB = sideA === 'A' ? 'D' : 'A', pistol = this.isPistol();
    const act = (own, other) => { let l = [...own]; if (other.includes('fake')) { const t = l.filter(k => k !== 'fake').sort((x, y) => AC[y].cost - AC[x].cost)[0]; if (t) l = l.filter(k => k !== t); return { l, cut: t || null }; } return { l, cut: null }; };
    const A = act(mine, theirs), B = act(theirs, mine);
    const buyA = this.decider ? 'full' : this.buyOf(a, mine), buyB = this.decider ? 'full' : this.buyOf(b, theirs);
    const val = (me, my, opp, side, behind) => { const ctx = { side, behind, oppStack: opp.includes('stack'), oppTempo: opp.includes('tempo'), oppNades: opp.includes('nades') }; return my.filter(k => k !== 'eco').map(k => ({ k, v: acVal(k, me, ctx) })); };
    const va = val(a, A.l, B.l, sideA, a.score < b.score), vb = val(b, B.l, A.l, sideB, b.score < a.score);
    const mapV = s => (s === 'D' ? 1 : -1) * this.map.ct / 2, hot = s => s.ws >= 2 ? 1.5 : 0;
    const baseA = (sideA === 'A' ? a.info.atk : a.info.def) + mapV(sideA), baseB = (sideB === 'A' ? b.info.atk : b.info.def) + mapV(sideB);
    const pa = baseA + BUY[buyA].v + hot(a) + va.reduce((s, x) => s + x.v, 0), pb = baseB + BUY[buyB].v + hot(b) + vb.reduce((s, x) => s + x.v, 0);
    const p = 1 / (1 + Math.exp(-(pa - pb + EDGE_A) / 9)), win = R() < p;
    const W = win ? a : b, L = win ? b : a; W.score++;
    const f = this.feed(win, pa, pb, sideA);
    for (const [s, pl, buy] of [[a, mine, buyA], [b, theirs, buyB]]) {
      s.en -= pl.reduce((x, k) => x + AC[k].cost, 0);
      s.bonusEn = (pl.includes('timeout') ? 1 : 0) + (pl.includes('eco') ? 3 : 0);
      for (const k of pl) { s.hand.splice(s.hand.indexOf(k), 1); s.disc.push(k); }
      if (!pl.length && s.hand.length) s.disc.push(s.hand.shift());
      s.money = Math.max(0, s.money - BUY[buy].c);
    }
    W.money = Math.min(MAX_MONEY, W.money + 3250 + 500 * f.surv); L.money = Math.min(MAX_MONEY, L.money + 1900 + 500 * Math.min(L.ls, 3) + 400 * f.lSurv);
    W.ws++; W.ls = 0; L.ls++; L.ws = 0;
    this.last = Object.assign({ round: this.round, mine, theirs, cutA: A.cut, cutB: B.cut, va, vb, baseA, baseB, pa, pb, p, win, sideA, buyA, buyB, pistol, decider: this.decider, hotA: hot(a) > 0, swap: false }, f);
    this.hist.push({ win, theirs: [...theirs], side: sideA, end: f.end });
    if (a.score >= WIN_N || b.score >= WIN_N) { this.over = true; this.won = a.score > b.score; return this.last; }
    this.round++;
    if (this.round === HALF + 1) { this.sideA = sideB; this.last.swap = true; for (const s of [a, b]) { s.money = START_MONEY; s.ls = 0; s.ws = 0; } }
    if (a.score === HALF && b.score === HALF) { this.decider = true; for (const s of [a, b]) s.money = MAX_MONEY; }
    for (const s of [a, b]) { s.en = Math.min(8, s.en + 2 + s.bonusEn); s.bonusEn = 0; this.draw(s); }
    return this.last;
  }
  /* Лучший игрок матча: больше всего убийств у победителей */
  mvp() { const W = this.won ? this.a : this.b; let i = 0; for (let k = 1; k < 5; k++) if (W.k[k] > W.k[i]) i = k; return { nick: W.info.e[i].c.nick, k: W.k[i], d: W.d[i], mine: this.won }; }
}
function applyResult(G, won) {
  const lg0 = leagueOf(G.best), lg = leagueOf(G.tro), r = { won, tro: won ? ri(28, 32) : -Math.min(G.tro, ri(18, 22)), coins: won ? 150 + 25 * lg : 50, xp: won ? 40 : 15, packs: [] };
  G.tro += r.tro; G.coins += r.coins; if (won) G.w++; else G.l++;
  if (G.tro > G.best) { G.best = G.tro; const n = leagueOf(G.best); if (n > lg0) { G.packs.pro++; r.packs.push('кейс «Про» за лигу «' + LEAGUES[n][0] + '»'); } }
  const up = addXp(G, r.xp); if (up) r.packs.push('базовый кейс за уровень ' + G.lvl);
  return r;
}
if (typeof module !== 'undefined') module.exports = { CARDS, ALL, POOL, IFP, MVPP, PACKS, openPack, newGame, addCard, squadOf, squadInfo, Match, MAPS, BUY, acVal, applyResult, AC, DECK, STYLES, leagueOf, LEAGUES, canUp, doUp, sellDupes, sellVal };
