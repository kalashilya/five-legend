'use strict';
/* ===== Утилиты ===== */
const R = Math.random;
const rnd = (a, b) => a + R() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(R() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function wpick(o) { let t = 0; for (const k in o) t += o[k]; let r = R() * t; for (const k in o) { r -= o[k]; if (r <= 0) return k; } return Object.keys(o)[0]; }
const avgA = (five, k) => five.reduce((s, p) => s + p.a[k], 0) / five.length;

/* ===== Справочники ===== */
const ROLES = { awp: 'Снайпер', entry: 'Энтри', sup: 'Саппорт', lurk: 'Люркер', igl: 'Капитан' };
const ATTR = { aim: 'Стрельба', ref: 'Реакция', util: 'Гранаты', pos: 'Позиция', clu: 'Клатч', team: 'Командность' };
const PLAN_N = { rush: 'Раш', exec: 'Выход', fake: 'Фейк', def: 'Дефолт' };
const SETUP_N = { standard: 'Стандарт 2-1-2', stackA: 'Стек A', stackB: 'Стек B', aggro: 'Агрессия в мид', retake: 'Игра на ретейк' };
const BUY_N = { pistol: 'Пистолеты', eco: 'Эко', force: 'Форс', full: 'Закуп' };
const WHY_N = { elim: 'команда соперника уничтожена', bomb: 'бомба взорвана', defuse: 'бомба обезврежена', time: 'время вышло' };

function ovr(p) { const a = p.a; return .3 * a.aim + .18 * a.ref + .14 * a.util + .18 * a.pos + .08 * a.clu + .12 * a.team; }
function perf(p) { return (0.88 + 0.12 * p.energy / 100) * (0.94 + 0.08 * p.morale / 100) * (1 + p.form / 100); }

/* ===== Карты: граф зон ===== */
function prepMap(m) {
  m.adj = {}; for (const k in m.zones) m.adj[k] = [];
  for (const [a, b] of m.edges) { m.adj[a].push(b); m.adj[b].push(a); }
  m.tban = new Set(Object.keys(m.zones).filter(k => m.zones[k].site || m.zones[k].ct));
  return m;
}
const MAPS = {
  pier: prepMap({
    id: 'pier', name: 'Пристань', note: 'Ровная карта с быстрыми ротациями защиты',
    zones: {
      TS: { n: 'База атаки', x: 50, y: 110, s: 'M' }, AL: { n: 'Длина A', x: 16, y: 86, s: 'A' }, AM: { n: 'Подход A', x: 16, y: 56, s: 'A' },
      A: { n: 'A', x: 22, y: 27, s: 'A', site: 1 }, MID: { n: 'Мид', x: 50, y: 80, s: 'M' }, MT: { n: 'Коннектор', x: 50, y: 50, s: 'M' },
      BL: { n: 'Тоннель B', x: 84, y: 86, s: 'B' }, BM: { n: 'Подход B', x: 84, y: 56, s: 'B' }, B: { n: 'B', x: 78, y: 27, s: 'B', site: 1 },
      CTS: { n: 'База защиты', x: 50, y: 11, s: 'M', ct: 1 }
    },
    edges: [['TS', 'AL'], ['TS', 'MID'], ['TS', 'BL'], ['AL', 'AM'], ['AM', 'A'], ['MID', 'MT'], ['MT', 'A'], ['MT', 'B'], ['BL', 'BM'], ['BM', 'B'], ['A', 'CTS'], ['B', 'CTS'], ['MT', 'CTS']],
    routes: { A: [['AL', 'AM', 'A'], ['MID', 'MT', 'A']], B: [['BL', 'BM', 'B'], ['MID', 'MT', 'B']] },
    ct: { A: 'A', B: 'B', mid: 'MT', back: 'CTS', push: 'MID' }
  }),
  quarry: prepMap({
    id: 'quarry', name: 'Карьер', note: 'Точка B далеко от базы защиты, удобна для атаки',
    zones: {
      TS: { n: 'База атаки', x: 50, y: 110, s: 'M' }, AL: { n: 'Спуск A', x: 16, y: 86, s: 'A' }, AM: { n: 'Подход A', x: 16, y: 56, s: 'A' },
      A: { n: 'A', x: 22, y: 27, s: 'A', site: 1 }, MID: { n: 'Мид', x: 50, y: 78, s: 'M' }, MT: { n: 'Окно', x: 44, y: 48, s: 'M' },
      BL: { n: 'Штольня', x: 84, y: 90, s: 'B' }, BM: { n: 'Подход B', x: 80, y: 62, s: 'B' }, B: { n: 'B', x: 82, y: 34, s: 'B', site: 1 },
      CTS: { n: 'База защиты', x: 36, y: 10, s: 'M', ct: 1 }, CR: { n: 'Мост', x: 68, y: 12, s: 'M', ct: 1 }
    },
    edges: [['TS', 'AL'], ['TS', 'MID'], ['TS', 'BL'], ['AL', 'AM'], ['AM', 'A'], ['MID', 'MT'], ['MT', 'A'], ['MID', 'BM'], ['BL', 'BM'], ['BM', 'B'], ['A', 'CTS'], ['MT', 'CTS'], ['CTS', 'CR'], ['CR', 'B']],
    routes: { A: [['AL', 'AM', 'A'], ['MID', 'MT', 'A']], B: [['BL', 'BM', 'B'], ['MID', 'BM', 'B']] },
    ct: { A: 'A', B: 'B', mid: 'MT', back: 'CTS', push: 'MID' }
  }),
  observatory: prepMap({
    id: 'observatory', name: 'Обсерватория', note: 'Длинные подходы к точкам, карта защиты',
    zones: {
      TS: { n: 'База атаки', x: 50, y: 112, s: 'M' }, AL: { n: 'Аллея', x: 14, y: 98, s: 'A' }, AX: { n: 'Арка', x: 14, y: 76, s: 'A' }, AM: { n: 'Подход A', x: 16, y: 53, s: 'A' },
      A: { n: 'A', x: 24, y: 28, s: 'A', site: 1 }, MID: { n: 'Мид', x: 50, y: 84, s: 'M' }, MT: { n: 'Купол', x: 50, y: 54, s: 'M' },
      BL: { n: 'Склад', x: 86, y: 98, s: 'B' }, BX: { n: 'Лестница', x: 86, y: 76, s: 'B' }, BM: { n: 'Подход B', x: 84, y: 53, s: 'B' }, B: { n: 'B', x: 76, y: 28, s: 'B', site: 1 },
      CTS: { n: 'База защиты', x: 50, y: 11, s: 'M', ct: 1 }
    },
    edges: [['TS', 'AL'], ['TS', 'MID'], ['TS', 'BL'], ['AL', 'AX'], ['AX', 'AM'], ['AM', 'A'], ['MID', 'MT'], ['MT', 'A'], ['MT', 'B'], ['BL', 'BX'], ['BX', 'BM'], ['BM', 'B'], ['A', 'CTS'], ['B', 'CTS'], ['MT', 'CTS']],
    routes: { A: [['AL', 'AX', 'AM', 'A'], ['MID', 'MT', 'A']], B: [['BL', 'BX', 'BM', 'B'], ['MID', 'MT', 'B']] },
    ct: { A: 'A', B: 'B', mid: 'MT', back: 'CTS', push: 'MID' }
  })
};
const MAP_ORDER = ['pier', 'quarry', 'observatory'];
function bfs(m, from, to, ban) {
  if (from === to) return [];
  const prev = { [from]: null }, q = [from];
  while (q.length) {
    const c = q.shift();
    for (const n of m.adj[c]) {
      if (n in prev) continue;
      if (ban && ban.has(n) && n !== to) continue;
      prev[n] = c;
      if (n === to) { const p = []; let x = n; while (x !== from) { p.unshift(x); x = prev[x]; } return p; }
      q.push(n);
    }
  }
  return [];
}

/* ===== Раунд: потактовая симуляция по зонам ===== */
const K = 1.5;                      // чувствительность дуэли к разнице навыка
const WPN = { pistol: .8, eco: .68, force: .88, full: 1 };
const mv = p => .5 * p.a.aim + .3 * p.a.ref + .2 * p.a.pos;      // атакующий в дуэли
const hd = p => .4 * p.a.aim + .2 * p.a.ref + .4 * p.a.pos;      // держащий позицию

class Round {
  constructor(map, T, CT) {
    this.map = map; this.T = T; this.CT = CT;
    this.tick = 0; this.over = null; this.feed = [];
    this.planted = false; this.bombZ = null; this.bombT = 0; this.plantP = 0; this.plantZ = null; this.defP = 0; this.retGo = false;
    this.plan = { ...T.plan }; this.plan0 = { ...T.plan }; this.setup = CT.setup;
    this.units = []; this.seen = { A: new Set(), B: new Set() };
    this.rotTo = null; this.rotN = 0; this.pend = null; this.lock = 0; this.lastKiller = null; this.switched = false; this.noised = false;
    const mk = (pl, side, ctx, i) => ({ id: side + i, pl, side, z: null, alive: true, path: [], wait: 0, cd: 0, k: 0, eff: perf(pl) * WPN[ctx.buy] * (ctx.boost || 1), awp: pl.role === 'awp' && ctx.buy === 'full', anchor: null, passive: false, faker: false, late: false });
    const z = map.zones, rt = map.routes, P = this.plan, o = P.site === 'A' ? 'B' : 'A';
    const ord = { entry: 0, igl: 1, sup: 2, awp: 3, lurk: 4 };
    const tf = [...T.five].sort((a, b) => ord[a.role] - ord[b.role]);
    const tu = tf.map((pl, i) => { const u = mk(pl, 'T', T, i); u.z = 'TS'; return u; });
    this.spdT = P.type === 'rush' ? 3 : 4;
    this.uf = { rush: .35, exec: 1, fake: .8, def: .7 }[P.type];
    this.go = P.type === 'rush'; this.goTick = { rush: 0, exec: 20, fake: 28, def: 26 }[P.type];
    this.called = P.type === 'rush' || P.type === 'exec';
    tu.forEach((u, i) => {
      if (P.type === 'rush') u.path = [...rt[P.site][i < 4 ? 0 : 1]];
      else if (P.type === 'exec') u.path = [...rt[P.site][i < 3 ? 0 : 1]];
      else if (P.type === 'fake') { if (i < 3) u.path = [...rt[P.site][0]]; else { u.path = rt[o][0].slice(0, -1); u.faker = u.late = true; } }
      else u.path = i < 2 ? rt.A[0].slice(0, -1) : i === 2 ? [rt.A[1][0]] : rt.B[0].slice(0, -1);
    });
    const lay = { standard: ['A', 'A', 'mid', 'B', 'B'], stackA: ['A', 'A', 'A', 'mid', 'B'], stackB: ['A', 'mid', 'B', 'B', 'B'], aggro: ['A', 'mid', 'mid', 'B', 'B'], retake: ['A', 'back', 'back', 'back', 'B'] }[this.setup];
    const cf = shuffle([...CT.five]); const got = {};
    const cu = cf.map((pl, i) => {
      const u = mk(pl, 'CT', CT, i), slot = lay[i]; u.z = map.ct[slot];
      if ((slot === 'A' || slot === 'B') && !got[slot]) { got[slot] = 1; u.anchor = slot; if (this.setup === 'retake') u.passive = true; }
      if (this.setup === 'aggro' && slot === 'mid') { u.path = [map.ct.push]; u.wait = 3; }
      return u;
    });
    this.units = tu.concat(cu);
    const ct = avgA(CT.five, 'team');
    this.rotDelay = 4 + Math.round((100 - ct) / 12);
    this.ctReads = P.type === 'fake' && R() < clamp(.42 + (ct - avgA(T.five, 'util')) / 100, .15, .75);
  }
  alive(s) { return this.units.filter(u => u.alive && u.side === s); }
  in(zn, s) { return this.units.filter(u => u.alive && u.side === s && u.z === zn); }
  tpath(from, to) { return bfs(this.map, from, to, this.map.tban); }
  end(win, why) { this.over = { win, why }; }

  step() {
    if (this.over) return;
    this.tick++; const t = this.tick;
    if (!this.planted) {
      if (!this.called && t >= this.goTick) { this.called = true; this.call(); }
      if (!this.go && this.called && t >= this.goTick) {
        const al = this.alive('T').filter(u => !u.late);
        if (al.every(u => u.path.length <= 1) || t >= this.goTick + 22) this.go = true;
      }
      if (this.plan0.type === 'fake' && !this.noised && t >= 8) {
        const f = this.units.find(u => u.faker && u.alive && !u.path.length);
        if (f) { this.noised = true; for (const u of this.alive('T')) if (u.faker) { u.path = this.tpath(u.z, this.plan.site); u.late = false; } if (!this.ctReads) { const fs = this.plan0.site === 'A' ? 'B' : 'A'; ['f1', 'f2'].forEach(x => this.seen[fs].add(x)); } }
      }
      this.ctThink();
    }
    const tf = t % 2 === 1;
    const list = this.units.filter(u => u.alive).sort((a, b) => (a.side === b.side ? 0 : (a.side === 'T') === tf ? -1 : 1));
    for (const u of list) if (u.alive) this.move(u);
    this.fights();
    this.objectives();
  }
  run() { while (!this.over) this.step(); return this.over; }

  call() {
    const P = this.plan;
    if (P.type === 'fake') { for (const u of this.alive('T')) if (u.faker && u.late) { u.path = this.tpath(u.z, P.site); u.late = false; } return; }
    const z = this.map.zones; let nA = ri(-1, 1), nB = ri(-1, 1);
    for (const u of this.alive('CT')) { if (z[u.z].s === 'A') nA++; else if (z[u.z].s === 'B') nB++; }
    P.site = nA < nB ? 'A' : nB < nA ? 'B' : pick(['A', 'B']);
    for (const u of this.alive('T')) u.path = this.tpath(u.z, P.site);
  }
  reveal(u) {
    if (u.side !== 'T') return;
    if (u.faker && this.ctReads && !this.go) return;
    const s = this.map.zones[u.z].s; if (s === 'M') return;
    if (this.in(u.z, 'CT').length) { this.seen[s].add(u.id); return; }
    if (R() < .3 && this.map.adj[u.z].some(n => this.in(n, 'CT').length)) this.seen[s].add(u.id);
  }
  ctThink() {
    if (this.setup === 'retake' || this.lock > this.tick) { if (this.lock > this.tick) return; if (this.setup === 'retake') return; }
    for (const X of ['A', 'B']) {
      const n = this.seen[X].size, m = this.seen[X === 'A' ? 'B' : 'A'].size;
      if (this.rotTo !== X && this.rotN < 2 && ((n >= 3 && n > m) || (n >= 2 && m === 0 && this.tick > 18))) {
        this.pend = { X, at: this.tick + this.rotDelay }; this.rotTo = X; this.rotN++;
      }
    }
    if (this.pend && this.tick >= this.pend.at) { this.rotate(this.pend.X); this.pend = null; }
  }
  rotate(X) {
    const site = this.map.ct[X], z = this.map.zones;
    for (const u of this.alive('CT')) {
      if (u.z === site) continue;
      if (u.anchor && u.anchor !== X) continue;
      u.path = bfs(this.map, u.z, site); u.passive = false; u.wait = 0;
    }
  }
  cmd(side, c) {
    if (this.over || this.planted) return false;
    if (side === 'T') {
      if (this.switched) return false;
      this.switched = true; this.plan.site = this.plan.site === 'A' ? 'B' : 'A';
      for (const u of this.alive('T')) { u.path = this.tpath(u.z, this.plan.site); u.faker = u.late = false; }
      this.go = false; this.called = true; this.goTick = this.tick + 4; this.uf = Math.min(this.uf, .7);
      return true;
    }
    this.rotate(c); this.lock = this.tick + 18; this.rotTo = c; this.pend = null;
    return true;
  }
  move(u) {
    if (u.wait > 0) { u.wait--; return; }
    if (u.cd > 0) { u.cd--; return; }
    if (!u.path.length) return;
    const nx = u.path[0], zs = this.map.zones;
    if (u.side === 'T' && !this.planted && !this.go && u.path.length === 1 && zs[nx].site) return;
    if (u.side === 'CT' && this.planted && !this.retGo && u.path.length === 1 && nx === this.bombZ) return;
    const other = u.side === 'T' ? 'CT' : 'T';
    let foes = this.in(nx, other);
    if (foes.length && u.side === 'T' && !this.planted) {
      for (const f of foes) if (f.passive && R() < .75) { const b = bfs(this.map, f.z, this.map.ct.back); if (b.length) f.z = b[0]; f.path = []; }
      foes = this.in(nx, other);
    }
    if (foes.length) {
      const lk = this.lastKiller; const trade = lk && lk.t === this.tick && foes.includes(lk.u) && R() < .7;
      const h = trade ? lk.u : pick(foes);
      this.duel(u, h, { entry: true, trade, to: nx });
      if (!u.alive) return;
    }
    u.z = nx; u.path.shift(); u.cd = (u.side === 'T' ? this.spdT : 3) - 1; this.reveal(u);
  }
  duel(a, b, o) {
    let ra = (o.entry ? mv(a.pl) : hd(a.pl)) * a.eff * (o.ma || 1), rb = hd(b.pl) * b.eff * (o.mb || 1);
    const tu = this.T.util, cu = this.CT.util;
    if (o.entry) {
      rb *= (b.side === 'CT' ? 1.24 : 1.15) * (1 + .06 * (this.in(b.z, b.side).length - 1)); if (b.awp) rb *= 1.08; if (a.awp) ra *= .96; if (a.pl.role === 'entry') ra *= 1.05;
      if (a.side === 'T' && !this.planted && this.map.zones[o.to].site) ra *= 1 + this.uf * .30 * tu / (tu + cu);
      if (a.side === 'CT' && this.planted) ra *= (1 + .2 * cu / (tu + cu)) * (this.setup === 'retake' ? 1.2 : 1);
      if (o.trade) ra *= 1.1 + a.pl.a.team / 600;
      if (a.side === 'CT' && !this.planted && this.setup === 'aggro' && this.tick < 16) ra *= 1.3;
    }
    if (this.alive(a.side).length === 1) ra *= 1 + (a.pl.a.clu - 60) / 300;
    if (this.alive(b.side).length === 1) rb *= 1 + (b.pl.a.clu - 60) / 300;
    const p = ra ** K / (ra ** K + rb ** K);
    const [w, l] = R() < p ? [a, b] : [b, a];
    l.alive = false; w.k++;
    this.lastKiller = { u: w, t: this.tick };
    this.feed.push({ t: this.tick, wn: w.pl.nick, ln: l.pl.nick, ws: w.side });
    const tU = a.side === 'T' ? a : b, s = this.map.zones[o.to || tU.z].s;
    if (s !== 'M' && !(tU.faker && this.ctReads && !this.go)) this.seen[s].add(tU.id);
  }
  fights() {
    for (const zn in this.map.zones) {
      const a = this.in(zn, 'T'), b = this.in(zn, 'CT');
      if (!a.length || !b.length) continue;
      shuffle(a); shuffle(b);
      const n = Math.min(a.length, b.length), d = a.length - b.length, site = this.map.zones[zn].site;
      for (let i = 0; i < n; i++) {
        if (!a[i].alive || !b[i].alive || R() > .6) continue;
        let ma = 1 + Math.max(0, d) * .05, mb = 1 + Math.max(0, -d) * .05;
        if (site) { if (this.planted) ma *= 1.05; else mb *= 1.05; }
        this.duel(a[i], b[i], { ma, mb });
      }
    }
  }
  objectives() {
    const T = this.alive('T'), C = this.alive('CT'), zs = this.map.zones;
    if (!this.planted) {
      if (!C.length) return this.end('T', 'elim');
      if (!T.length) return this.end('CT', 'elim');
      let pz = null;
      for (const u of T) if (zs[u.z].site && !this.in(u.z, 'CT').length) { pz = u.z; break; }
      if (pz) { if (this.plantZ === pz) this.plantP++; else { this.plantZ = pz; this.plantP = 1; } if (this.plantP >= 3) this.plant(pz); }
      else { this.plantP = 0; this.plantZ = null; }
      if (this.tick >= 100 && !this.planted) return this.end('CT', 'time');
    } else {
      this.bombT--;
      if (!C.length) return this.end('T', 'elim');
      const c = this.in(this.bombZ, 'CT').length, t = this.in(this.bombZ, 'T').length;
      if (c && !t) { this.defP++; if (this.defP >= 7) return this.end('CT', 'defuse'); } else this.defP = 0;
      if (this.bombT <= 0) return this.end('T', 'bomb');
      if (!this.retGo && (C.every(u => u.path.length <= 1) || this.bombT <= 14)) this.retGo = true;
    }
  }
  plant(zn) {
    this.planted = true; this.bombZ = zn; this.bombT = 35; this.go = true;
    this.feed.push({ t: this.tick, plant: zn });
    for (const u of this.alive('CT')) { u.path = bfs(this.map, u.z, zn); u.passive = false; u.wait = 0; }
    for (const u of this.alive('T')) if (u.z !== zn) u.path = this.tpath(u.z, zn);
  }
}

/* ===== Матч: экономика, стороны, овертаймы, ИИ-тактика ===== */
const COST = { pistol: 3500, eco: 2500, force: 11000, full: 21000 };
const UTILB = { pistol: .6, eco: .45, force: .8, full: 1 };
function genTend() {
  return { rush: rnd(.6, 1.6), exec: rnd(.8, 1.8), fake: rnd(.3, 1), def: rnd(.6, 1.4), pA: rnd(.35, .65),
    ct: { standard: rnd(1.2, 2.2), stackA: rnd(.3, .9), stackB: rnd(.3, .9), aggro: rnd(.3, 1), retake: rnd(.3, 1) } };
}
class Match {
  constructor(map, ta, tb, opt = {}) {
    this.map = map; this.opt = opt;
    const mk = t => { const c = { team: t, five: t.five.map(id => t.players.find(p => p.id === id)), score: 0, money: 4000, loss: 0, tilt: 0, to: 3, boostR: 0, hT: [], hC: [], keep: 0, wonLast: false, st: {}, buy: 'pistol', side: null, boost: 1, util: 60 }; c.five.forEach(p => c.st[p.id] = { k: 0, d: 0 }); return c; };
    this.a = mk(ta); this.b = mk(tb);
    this.a.side = R() < .5 ? 'T' : 'CT'; this.b.side = this.a.side === 'T' ? 'CT' : 'T';
    this.rn = 0; this.ot = 0; this.otStart = 0; this.over = false; this.winner = null; this.round = null; this.log = []; this.msg = [];
  }
  get T() { return this.a.side === 'T' ? this.a : this.b; }
  get CT() { return this.a.side === 'CT' ? this.a : this.b; }
  isPistol() { return this.ot === 0 && (this.rn === 1 || this.rn === 13); }
  lastOfHalf() { return this.ot === 0 ? (this.rn === 12) : ((this.rn - this.otStart) % 3 === 0); }
  autoBuy(c, opp) {
    if (this.isPistol()) return 'pistol';
    const m = c.money;
    if (m >= COST.full * (1 - .16 * c.keep)) return 'full';
    if (this.lastOfHalf() || opp.score >= 13 + 3 * this.ot - 1) return m >= 7000 ? 'force' : 'eco';
    if (m >= COST.force && (c.loss >= 2 || c.wonLast)) return 'force';
    return 'eco';
  }
  timeout(c) { if (c.to <= 0) return false; c.to--; c.boostR = 3; c.tilt = 0; return true; }
  startRound() {
    this.rn++; const T = this.T, CT = this.CT, ut = this.opt.tactics;
    for (const c of [T, CT]) {
      const opp = c === T ? CT : T; let want = this.autoBuy(c, opp);
      if (c.team.user && ut && ut.buy !== 'auto' && !this.isPistol()) {
        want = ut.buy; if (want === 'full' && c.money < 15000) want = 'force'; if (want === 'force' && c.money < 7000) want = 'eco';
      }
      c.buy = want;
      c.money -= Math.min(c.money, Math.round(COST[want] * (1 - .16 * (want === 'full' || want === 'force' ? c.keep : 0))));
      c.boost = 1 + (c.boostR > 0 ? .04 : 0) - Math.min(.06, .02 * Math.max(0, c.tilt - 2));
      if (c.boostR > 0) c.boostR--;
      c.util = avgA(c.five, 'util') * UTILB[want];
    }
    T.plan = T.team.user && ut ? { ...ut.T } : this.aiT(T, CT);
    CT.setup = CT.team.user && ut ? ut.CT : this.aiCT(CT, T);
    this.round = new Round(this.map, T, CT);
    return this.round;
  }
  aiT(c, opp) {
    const td = c.team.tend, w = { rush: td.rush, exec: td.exec, fake: td.fake, def: td.def }; let pA = td.pA;
    if (c.buy === 'eco' || c.buy === 'pistol') w.rush *= 2;
    const h = opp.hC.slice(-2);
    if (h.length === 2 && h[0] === h[1]) {
      if (h[0] === 'stackA') pA *= .35; if (h[0] === 'stackB') pA = 1 - (1 - pA) * .35;
      if (h[0] === 'retake') w.rush *= 1.8; if (h[0] === 'aggro') { w.exec *= 1.5; w.def *= .6; }
    }
    return { type: wpick(w), site: R() < pA ? 'A' : 'B' };
  }
  aiCT(c, opp) {
    const w = { ...c.team.tend.ct }, h = opp.hT.slice(-4), nA = h.filter(x => x.site === 'A').length, nB = h.length - nA;
    if (h.length >= 3) { if (nA >= 3) w.stackA *= 2.5; if (nB >= 3) w.stackB *= 2.5; }
    if (opp.buy === 'eco') w.aggro *= 1.6;
    if (opp.hT.slice(-3).filter(x => x.type === 'rush').length >= 2) { w.retake *= .4; w.standard *= 1.4; }
    return wpick(w);
  }
  swap() { [this.a.side, this.b.side] = [this.b.side, this.a.side]; for (const c of [this.a, this.b]) { c.loss = 0; c.keep = 0; c.wonLast = false; } }
  endRound() {
    const r = this.round, w = r.over.win, T = this.T, CT = this.CT, W = w === 'T' ? T : CT, L = w === 'T' ? CT : T;
    W.score++;
    for (const u of r.units) { const c = u.side === 'T' ? T : CT, s = c.st[u.pl.id]; s.k += u.k; if (!u.alive) s.d++; c.money += u.k * 300; }
    W.money += 16000; W.loss = 0; W.tilt = 0; W.wonLast = true; W.keep = (W.buy === 'full' || W.buy === 'force') ? r.alive(W.side).length : 0;
    L.loss++; L.tilt++; L.wonLast = false; L.keep = 0; L.money += 7000 + 2500 * Math.min(L.loss - 1, 4) + (L === T && r.planted ? 4000 : 0);
    T.hT.push({ type: r.plan0.type, site: r.plan.site }); CT.hC.push(r.setup);
    for (const c of [this.a, this.b]) c.money = Math.min(c.money, 60000);
    this.log.push({ rn: this.rn, win: W === this.a ? 'a' : 'b', side: w, why: r.over.why });
    if (!L.team.user && L.tilt >= 4 && L.to > 0) { this.timeout(L); this.msg.push(L.team.tag + ' берут тайм-аут'); }
    const tgt = 13 + 3 * this.ot, a = this.a, b = this.b;
    if (Math.max(a.score, b.score) >= tgt) { this.over = true; this.winner = a.score > b.score ? a : b; return; }
    if (this.ot === 0 && this.rn === 12) { this.swap(); a.money = b.money = 4000; this.msg.push('Смена сторон'); }
    else if (a.score === b.score && a.score === 12 + 3 * this.ot) { this.ot++; this.otStart = this.rn; a.money = b.money = 50000; a.loss = b.loss = 0; this.msg.push('Овертайм ' + this.ot); }
    else if (this.ot > 0 && this.rn - this.otStart === 3) { this.swap(); a.money = b.money = 50000; this.msg.push('Смена сторон'); }
  }
  playAll() { while (!this.over) { this.startRound().run(); this.endRound(); } return this; }
}

/* Быстрый расчёт чужих матчей без раундовой симуляции */
function teamStr(t) { const f = t.five.map(id => t.players.find(p => p.id === id)); return f.reduce((s, p) => s + ovr(p) * perf(p), 0) / f.length; }
const QE = 4.5;
function quickMatch(ta, tb) {
  const sa = teamStr(ta) ** QE, sb = teamStr(tb) ** QE, p = sa / (sa + sb); let a = 0, b = 0, tgt = 13;
  for (;;) { if (R() < p) a++; else b++; if (a >= tgt || b >= tgt) break; if (a === b && a === tgt - 1) tgt += 3; }
  return [a, b];
}

/* ===== Карьера ===== */
const FN = ['Артём', 'Ilya', 'Marek', 'Jonas', 'Тимур', 'Luca', 'Emre', 'Данил', 'Oskar', 'Rafael', 'Никита', 'Mateus', 'Kai', 'Егор', 'Viktor', 'Anton', 'Hugo', 'Руслан', 'Felix', 'Diego', 'Миша', 'Pavel', 'Noel', 'Айдар', 'Leo', 'Tomas'];
const LN = ['Саблин', 'Kowal', 'Lindqvist', 'Ахметов', 'Moretti', 'Yilmaz', 'Громов', 'Berg', 'Costa', 'Лаптев', 'Novak', 'Haas', 'Орлов', 'Petrov', 'Silva', 'Крюков', 'Dubois', 'Weiss', 'Ткач', 'Jensen', 'Rocha', 'Зимин', 'Vega', 'Holm', 'Усманов', 'Marin'];
const NA = ['zy', 'kra', 'vex', 'no', 'ri', 'ta', 'mo', 'sha', 'el', 'dro', 'fi', 'ky', 'lu', 'ar', 'su', 'ne', 'ba', 'ox', 'ju', 'ha', 'qu', 'te', 'wi', 'ce'];
const NB = ['x', 'ko', 'rn', 'ler', 'zz', 'dar', 'mi', 'to', 'ven', 'sh', 'ro', 'lix', 'n1k', 'ser', 'ty', 'ga', 'ps', 'mo', 'rex', 'vy'];
let PID = 1; const NICKS = new Set();
function genNick() { for (let i = 0; i < 50; i++) { let n = pick(NA) + pick(NB); if (R() < .3) n = pick(NA) + n; if (!NICKS.has(n)) { NICKS.add(n); return n; } } const n = pick(NA) + pick(NB) + ri(2, 99); NICKS.add(n); return n; }
function salary(p) { return Math.round(Math.pow(Math.max(ovr(p) - 40, 5), 2) * 4 / 50) * 50; }
function value(p) {
  const o = ovr(p); let v = Math.pow(Math.max(o - 40, 5), 2.2) * 40;
  v *= p.age < 22 ? 1.25 : p.age > 29 ? .55 : p.age > 27 ? .8 : 1; v *= 1 + Math.max(0, p.pot - o) / 60;
  return Math.max(2000, Math.round(v / 500) * 500);
}
function genPlayer(t, role, ageMin = 17, ageMax = 31) {
  const j = () => clamp(t + rnd(-7, 7), 30, 97);
  const a = { aim: j(), ref: j(), util: j(), pos: j(), clu: j(), team: j() };
  const tw = { awp: { aim: 4, pos: 3 }, entry: { ref: 6, aim: 2 }, sup: { util: 8, team: 3 }, lurk: { pos: 4, clu: 6 }, igl: { team: 9, util: 3, aim: -5 } }[role];
  for (const k in tw) a[k] = clamp(a[k] + tw[k], 30, 97);
  const p = { id: PID++, name: pick(FN) + ' ' + pick(LN), nick: genNick(), age: ri(ageMin, ageMax), role, a, pot: 0, energy: ri(80, 100), morale: ri(60, 85), form: 0, sal: 0, k: 0, d: 0, m: 0 };
  const o = ovr(p); p.pot = Math.min(96, o + (p.age < 23 ? ri(4, 16) : p.age < 27 ? ri(0, 6) : 0)); p.sal = salary(p);
  return p;
}
const RL = ['awp', 'entry', 'sup', 'lurk', 'igl'];
function genTeam(id, name, tag, t) {
  const players = RL.map(r => genPlayer(t, r)); players.push(genPlayer(t - 6, pick(RL), 17, 22));
  return { id, name, tag, players, five: players.slice(0, 5).map(p => p.id), tend: genTend(), w: 0, l: 0, rd: 0, user: false };
}
const AI_TEAMS = [['Polar Foxes', 'PLF', 82], ['Iron Lynx', 'LNX', 79], ['Night Heron', 'NHR', 77], ['Red Quarry', 'RQ', 75], ['Steppe Riders', 'STR', 73], ['Glass Cannon', 'GLC', 71], ['Salt Harbor', 'SLT', 70], ['Ninth Gate', 'N9', 68], ['Copper Owls', 'OWL', 66], ['Low Orbit', 'LOW', 64], ['Tundra Five', 'TN5', 62]];
function makeSchedule(n) {
  const ids = [...Array(n).keys()], rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const wk = []; for (let i = 0; i < n / 2; i++) wk.push(r % 2 ? [ids[n - 1 - i], ids[i]] : [ids[i], ids[n - 1 - i]]);
    rounds.push(wk); ids.splice(1, 0, ids.pop());
  }
  return rounds;
}
function genMarket(n) { const m = []; for (let i = 0; i < n; i++) m.push(genPlayer(rnd(58, 80), pick(RL), 17, 30)); return m; }
function newCareer(name = 'First Light', tag = 'FL') {
  PID = 1; NICKS.clear();
  const teams = AI_TEAMS.map((t, i) => genTeam(i, t[0], t[1], t[2]));
  const u = genTeam(11, name, tag, 67); u.user = true; teams.push(u);
  const S = { v: 1, season: 1, week: 0, phase: 'league', teams, userId: 11, money: 140000, fans: 100, market: genMarket(16), training: { focus: 'aim', intensity: 'normal' }, staff: { coach: 0, analyst: 0 },
    schedule: shuffle(makeSchedule(12)), lastResults: [], news: [], playoff: null, tactics: { T: { type: 'exec', site: 'A' }, CT: 'standard', buy: 'auto' }, pid: 0, champion: null, lastFin: null };
  addNews(S, 'Сезон 1 начался. Цель: попасть в четвёрку лучших и выйти в плей-офф.');
  S.pid = PID; return S;
}
function addNews(S, t) { S.news.unshift({ w: S.week + 1, s: S.season, t }); if (S.news.length > 30) S.news.pop(); }
const userTeam = S => S.teams[S.userId];
const fiveOf = t => t.five.map(id => t.players.find(p => p.id === id));
function standings(S) { return [...S.teams].sort((a, b) => b.w - a.w || b.rd - a.rd || a.id - b.id); }
function nextMatch(S) {
  const u = S.userId;
  if (S.phase === 'league') { const m = S.schedule[S.week].find(x => x.includes(u)); return { opp: S.teams[m[0] === u ? m[1] : m[0]], map: MAPS[MAP_ORDER[S.week % 3]], stage: 'Тур ' + (S.week + 1) + ' из 11' }; }
  if (S.phase === 'semi') { const m = S.playoff.semis.find(x => x.includes(u)); return m ? { opp: S.teams[m[0] === u ? m[1] : m[0]], map: MAPS[MAP_ORDER[S.season % 3]], stage: 'Полуфинал' } : null; }
  if (S.phase === 'final') { const m = S.playoff.final; return m.includes(u) ? { opp: S.teams[m[0] === u ? m[1] : m[0]], map: MAPS[MAP_ORDER[(S.season + 1) % 3]], stage: 'Финал' } : null; }
  return null;
}
function applyResult(ta, tb, sa, sb) { const W = sa > sb ? ta : tb, L = sa > sb ? tb : ta; W.w++; L.l++; ta.rd += sa - sb; tb.rd += sb - sa; return W; }
function trainWeek(S) {
  const { focus, intensity } = S.training, I = { light: .6, normal: 1, hard: 1.5 }[intensity], coach = 1 + .15 * S.staff.coach, u = userTeam(S);
  const keys = { aim: ['aim', 'ref'], util: ['util'], pos: ['pos', 'clu'], team: ['team'] }[focus];
  for (const p of u.players) {
    const st = u.five.includes(p.id);
    p.energy += 10 - (st ? 8 : 0); if (!st) p.morale -= 1;
    if (focus === 'rest') { p.energy += 26; p.morale += 4; }
    else {
      const room = clamp((p.pot - ovr(p)) / 12, .05, 1.2), ageF = p.age <= 21 ? 1.3 : p.age <= 25 ? 1 : p.age <= 29 ? .6 : .3;
      const g = I * coach * room * ageF * rnd(.4, 1) * (p.energy < 35 ? .4 : 1);
      for (const k of keys) p.a[k] = clamp(p.a[k] + g * (keys.length > 1 ? .6 : 1), 30, 99);
      p.energy -= { light: 1, normal: 5, hard: 11 }[intensity]; if (intensity === 'hard') p.morale -= 1.5;
    }
    if (p.age >= 30) p.a.ref = Math.max(30, p.a.ref - .15);
    p.form = clamp(p.form * .6 + rnd(-3, 3), -5, 5);
    p.energy = clamp(p.energy, 5, 100); p.morale = clamp(p.morale, 5, 100);
  }
  for (const t of S.teams) if (!t.user) for (const p of t.players) {
    if (p.pot > ovr(p) && R() < .5) { const k = pick(Object.keys(p.a)); p.a[k] = clamp(p.a[k] + rnd(0, .7) * (p.age <= 23 ? 1.2 : .6), 30, 99); }
    p.form = clamp(p.form * .6 + rnd(-3, 3), -5, 5); p.energy = ri(78, 96);
  }
}
/* Итог матча пользователя: m — завершённый Match, где a = команда пользователя */
function finishUserMatch(S, m) {
  const u = userTeam(S), opp = m.b.team, won = m.winner === m.a, sa = m.a.score, sb = m.b.score;
  for (const c of [m.a, m.b]) for (const p of c.five) { const s = c.st[p.id]; p.k += s.k; p.d += s.d; p.m++; if (c.team.user) { p.morale = clamp(p.morale + (won ? 4 : -3), 5, 100); p.form = clamp(p.form + (s.k > s.d ? 1 : -1), -5, 5); } }
  const res = { won, sa, sb, opp: opp.name, lines: [] };
  if (S.phase === 'league') {
    applyResult(u, opp, sa, sb);
    const out = [{ a: u.tag, b: opp.tag, sa, sb, user: true }];
    for (const [x, y] of S.schedule[S.week]) { if (x === S.userId || y === S.userId) continue; const [qa, qb] = quickMatch(S.teams[x], S.teams[y]); applyResult(S.teams[x], S.teams[y], qa, qb); out.push({ a: S.teams[x].tag, b: S.teams[y].tag, sa: qa, sb: qb }); }
    S.lastResults = out;
  } else if (S.phase === 'semi') {
    S.playoff.sres = []; const fin = [];
    for (const [x, y] of S.playoff.semis) { let r; if (x === S.userId || y === S.userId) r = x === S.userId ? [sa, sb] : [sb, sa]; else r = quickMatch(S.teams[x], S.teams[y]); S.playoff.sres.push(r); fin.push(r[0] > r[1] ? x : y); }
    S.playoff.final = fin;
  } else if (S.phase === 'final') { S.playoff.fres = S.playoff.final[0] === S.userId ? [sa, sb] : [sb, sa]; S.champion = won ? S.userId : opp.id; }
  addNews(S, (won ? 'Победа над ' : 'Поражение от ') + opp.name + ' ' + sa + ':' + sb);
  endWeek(S, res, won);
  return res;
}
function endWeek(S, res, won) {
  const u = userTeam(S);
  S.fans = Math.max(20, S.fans + (won === true ? 12 : won === false ? -3 : 0));
  const sponsor = 14000 + S.fans * 40, prize = won === true ? 6000 : won === false ? 1500 : 0;
  const sal = u.players.reduce((s, p) => s + p.sal, 0), staff = 1500 * (S.staff.coach + S.staff.analyst);
  S.money += sponsor + prize - sal - staff;
  S.lastFin = { sponsor, prize, sal, staff, net: sponsor + prize - sal - staff };
  if (res) res.fin = S.lastFin;
  trainWeek(S);
  if (S.money < 0) { for (const p of u.players) p.morale = clamp(p.morale - 3, 5, 100); addNews(S, 'Бюджет в минусе: игроки недовольны задержкой зарплат.'); }
  for (let i = 0; i < 3; i++) S.market[ri(0, S.market.length - 1)] = genPlayer(rnd(58, 80), pick(RL), 17, 30);
  const tired = u.players.filter(p => u.five.includes(p.id) && p.energy < 40).length;
  if (tired) addNews(S, 'Усталость в основе: ' + tired + ' игрок(а) ниже 40% энергии. Нужен отдых или замена.');
  if (S.phase === 'league') {
    S.week++;
    if (S.week >= S.schedule.length) {
      const st = standings(S).slice(0, 4).map(t => t.id);
      S.playoff = { semis: [[st[0], st[3]], [st[1], st[2]]], final: null, sres: null, fres: null }; S.phase = 'semi';
      addNews(S, st.includes(S.userId) ? 'Регулярный сезон окончен. Вы в плей-офф!' : 'Регулярный сезон окончен. В плей-офф попасть не удалось.');
    }
  } else if (S.phase === 'semi') S.phase = 'final';
  else if (S.phase === 'final') seasonEnd(S);
  S.pid = PID;
}
/* Неделя плей-офф без участия пользователя */
function simPlayoffWeek(S) {
  if (S.phase === 'semi') { S.playoff.sres = []; S.playoff.final = S.playoff.semis.map(([x, y]) => { const r = quickMatch(S.teams[x], S.teams[y]); S.playoff.sres.push(r); return r[0] > r[1] ? x : y; }); }
  else if (S.phase === 'final') { const [x, y] = S.playoff.final, r = quickMatch(S.teams[x], S.teams[y]); S.playoff.fres = r; S.champion = r[0] > r[1] ? x : y; }
  endWeek(S, null, null);
}
function seasonEnd(S) {
  const st = standings(S), place = st.findIndex(t => t.user) + 1, fin = S.playoff.final, semi = S.playoff.semis.flat();
  let prize = place <= 4 ? 0 : place <= 8 ? 30000 : 15000, title = place + '-е место в лиге';
  if (S.champion === S.userId) { prize = 200000; title = 'Чемпион сезона'; }
  else if (fin.includes(S.userId)) { prize = 110000; title = 'Финалист'; }
  else if (semi.includes(S.userId)) { prize = 60000; title = 'Полуфиналист'; }
  S.money += prize; S.phase = 'end';
  S.summary = { season: S.season, place, title, prize, champ: S.teams[S.champion].name, w: userTeam(S).w, l: userTeam(S).l };
  addNews(S, 'Итог сезона: ' + title + '. Призовые $' + prize.toLocaleString('ru-RU') + '. Чемпион: ' + S.summary.champ + '.');
}
function nextSeason(S) {
  S.season++; S.week = 0; S.phase = 'league'; S.playoff = null; S.champion = null; S.lastResults = []; S.summary = null;
  PID = S.pid;
  for (const t of S.teams) {
    t.w = t.l = t.rd = 0;
    for (const p of t.players) { p.age++; p.energy = 100; p.morale = clamp(p.morale + 10, 5, 100); p.k = p.d = p.m = 0; if (p.age >= 31) for (const k in p.a) p.a[k] = Math.max(30, p.a[k] - rnd(.5, 2)); p.sal = Math.max(p.sal, salary(p)); }
    if (!t.user) { t.players = t.players.map(p => p.age > 32 ? Object.assign(genPlayer(ovr(p) + 2, p.role, 18, 22), {}) : p); t.five = t.players.slice(0, 5).map(p => p.id); t.tend = genTend(); }
  }
  S.schedule = shuffle(makeSchedule(12)); S.market = genMarket(16); S.pid = PID;
  addNews(S, 'Сезон ' + S.season + ' начался. Контракты пересмотрены, игроки отдохнули.');
}

if (typeof module !== 'undefined') module.exports = { MAPS, MAP_ORDER, Round, Match, quickMatch, newCareer, nextMatch, finishUserMatch, simPlayoffWeek, nextSeason, standings, userTeam, fiveOf, genTeam, genPlayer, ovr, teamStr, value, salary, avgA, UTILB };
