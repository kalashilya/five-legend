/* Проверки игровой логики и баланса. Запуск: bash build.sh && node test.js  (или: cat data.js core.js meta.js > _t.js && node test.js)
   QUICK=1 сокращает симуляции. Любая несошедшаяся проверка завершает запуск с ошибкой. */
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const E = require('./_t.js'), N = process.env.QUICK ? 600 : 3000, NOW = Date.UTC(2026, 10, 10, 12);
let passed = 0; const ok = (name, fn) => { fn(); passed++; console.log('  ok  ' + name); };
/* состав для симуляций: случайные обычные карточки нужной роли с рейтингом около заданного */
const mkSq = o => { const sq = []; for (let r = 0; r < 5; r++) { const l = E.ALL.filter(x => x.role === r && !x.sp && !sq.some(q => q.c.nick === x.nick)).sort((a, b) => Math.abs(a.ovr - o) - Math.abs(b.ovr - o)).slice(0, 6); sq.push({ c: l[Math.floor(Math.random() * l.length)], lv: 1 }); } return sq; };
const subsets = m => { const h = m.a.hand, o = []; for (let k = 0; k < 1 << h.length; k++) { const s = h.filter((x, i) => k >> i & 1); if (m.canPlay(m.a, s)) o.push(s); } return o; };
const cost = s => s.reduce((x, k) => x + E.AC[k].cost, 0);
const P = {
  none: m => [[], {}],
  random: m => { const o = subsets(m); return [o[Math.floor(Math.random() * o.length)], { dir: 'ASB'[Math.floor(Math.random() * 3)], tempo: E.TEMPOS[Math.floor(Math.random() * 3)] }]; },
  /* «по цифрам»: берёт приказы с наибольшей суммой бонусов, которые показаны на картах; план не трогает */
  greedy: m => { const ctx = { side: m.sideA, behind: m.a.score < m.b.score, cap: m.capIgl(m.a) }, val = k => k === 'eco' ? -9 : k === 'fake' ? 3 : E.acVal(k, m.a, ctx); return [subsets(m).sort((a, b) => b.reduce((x, k) => x + val(k), 0) - a.reduce((x, k) => x + val(k), 0))[0] || [], {}]; },
  stubborn: m => [P.greedy(m)[0], { dir: 'A', tempo: 'fast' }],
  /* «читающий»: пользуется разведкой, помнит точки и приказы соперника, не повторяется сам */
  reader: m => {
    const atk = m.sideA === 'A', it = m.nx.intel, h = m.hist.filter(x => x.side === m.sideA), c = { A: 0, B: 0, S: 0 }, mine = { A: 0, B: 0, S: 0 }; h.slice(-6).forEach(x => c[x.dirB]++); h.slice(-4).forEach(x => mine[x.dirA]++);
    const guess = it && it.k === 'dir' ? it.v : h.length >= 2 && c.A !== c.B ? (c.A > c.B ? 'A' : 'B') : null;
    let dir = !guess ? (Math.random() < .5 ? 'A' : 'B') : guess === 'S' ? (atk ? 'A' : 'S') : atk ? (guess === 'A' ? 'B' : 'A') : guess;
    if (!(it && it.k === 'dir') && mine[dir] >= 3) dir = 'S';
    const e = m.a.info.e, tempo = atk ? (e[1].st.ent >= e[2].st.utl ? 'fast' : 'slow') : 'norm', seen = {}; m.hist.slice(-6).forEach(x => x.theirs.forEach(k => seen[k] = (seen[k] || 0) + 1));
    const ctx = { side: m.sideA, behind: m.a.score < m.b.score, cap: m.capIgl(m.a), oppStack: seen.stack >= 2, oppTempo: seen.tempo >= 2, oppNades: seen.nades >= 2 };
    const val = k => k === 'eco' ? -9 : k === 'fake' ? 3 : E.acVal(k, m.a, ctx);
    const cards = subsets(m).sort((a, b) => b.reduce((x, k) => x + val(k), 0) - a.reduce((x, k) => x + val(k), 0))[0] || [];
    return [cards, { dir, tempo }];
  }
};
function sim(o, tro, pol, n = N) { let w = 0, r = 0; for (let i = 0; i < n; i++) { const sq = mkSq(o), m = new E.Match(sq, tro, E.squadInfo(sq).rating, { capt: 4 }); let g = 0; while (!m.over && g++ < 40) { const [c, p] = pol(m); assert(m.play(c, p), 'раунд должен разыграться'); } assert(m.over); if (m.won) w++; r += m.hist.length; } return { win: 100 * w / n, rounds: r / n }; }

ok('16 полных HLTV-профилей и статистика HLTV подключены к карточкам', () => {
  const profiled = E.ALL.filter(c => c.hltv && c.hltv.photo && c.hltv.country && c.hltv.teamLogo && !c.sp && !c.hist);
  assert.strictEqual(profiled.length, 16);
  assert.strictEqual(E.ALL.filter(c => c.hltv && c.hltv.photo && !c.sp && !c.hist).length, 38, 'все найденные портреты HLTV должны быть привязаны к карточкам');
  assert.strictEqual(new Set(E.ALL.filter(c => !c.sp && !c.hist).map(c => c.team)).size, 125, 'в базе должны быть ровно 125 команд HLTV');
  const verified = E.ALL.filter(c => c.hltv && !c.sp && !c.hist), base = E.ALL.filter(c => !c.sp && !c.hist), donk = base.find(c => c.nick === 'donk'), zywoo = base.find(c => c.nick === 'ZywOo');
  assert(donk && zywoo); assert.strictEqual(donk.ovr, 98); assert.strictEqual(donk.st.aim, 97); assert.strictEqual(donk.st.ent, 88);
  assert.strictEqual(donk.hltv.last12m.maps, 177); assert.strictEqual(donk.hltv.last3m.rating3, 1.34);
  assert.strictEqual(E.indOf(donk).n, 'Дуэлянт'); assert(E.indPow(donk, 1) > E.abPow(donk, 1));
  assert.strictEqual(E.indOf(zywoo).n, 'Снайпер');
  const junior = verified.find(c => c.nick === 'junior'), leakz = verified.find(c => c.nick === 'leakz'), lattykk = verified.find(c => c.nick === 'lattykk');
  assert(junior && leakz && lattykk); assert.strictEqual(junior.role, 0); assert.strictEqual(lattykk.role, 0);
  assert.strictEqual(E.indOf(junior).n, 'Снайпер'); assert.strictEqual(E.indOf(leakz).n, 'Трейдер');
});
console.log('1. Карточки и база');
ok('717 карточек, номера уникальны, особые версии на месте', () => { assert.strictEqual(E.ALL.length, 717); assert.strictEqual(new Set(E.ALL.map(c => c.id)).size, 717); assert.strictEqual(E.MVPP.length, 8); assert.strictEqual(E.IFP.flat().length, 56); const state = E.ALL.find(c => c.team === 'STATE'), butterfly = E.ALL.find(c => c.team === 'Butterfly'); assert(state && butterfly); assert.notStrictEqual(state.t, butterfly.t, 'команды за пределами первых 101 не должны склеиваться в одну'); });
ok('редкости 388/152/78/27/8', () => assert.deepStrictEqual(E.POOL.map(p => p.length), [388, 152, 78, 27, 8]));
ok('у каждой карточки шесть показателей от 40 до 99', () => E.ALL.forEach(c => Object.values(c.st).forEach(v => assert(v >= 40 && v <= 99))));
ok('обновление базы: трансфер создаёт новую карточку, старая остаётся архивной с тем же номером', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-')); for (const f of ['gen.js', 'teams.txt', 'ids.json']) fs.copyFileSync(f, path.join(d, f));
  let t = fs.readFileSync(path.join(d, 'teams.txt'), 'utf8'); assert(t.includes('flameZ, ') && t.includes('donk'));
  t = t.replace('flameZ, ', '').replace('donk\n', 'donk, flameZ\n'); fs.writeFileSync(path.join(d, 'teams.txt'), t);
  cp.execFileSync('node', ['gen.js'], { cwd: d });
  const D = new Function(fs.readFileSync(path.join(d, 'data.js'), 'utf8') + ';return {PL,TM}')(), old = E.ALL.find(c => c.nick === 'flameZ' && !c.sp);
  const rows = D.PL.filter(p => p[0] === 'flameZ'); assert.strictEqual(rows.length, 2);
  const arch = rows.find(p => p[6] === 1), cur = rows.find(p => p[6] === 0);
  assert.strictEqual(arch[4], old.id); assert.strictEqual(D.TM[arch[1]], 'Vitality'); assert.strictEqual(arch[3], old.ovr); assert.strictEqual(D.TM[cur[1]], 'Spirit'); assert(cur[4] >= 500);
  for (const c of E.ALL.filter(x => !x.sp)) assert(D.PL.some(p => p[4] === c.id && p[0] === c.nick), 'номер ' + c.id + ' сохранён');
});

console.log('2. Кейсы');
for (const t of ['basic', 'pro', 'elite']) ok('шансы кейса «' + E.PACKS[t].n + '» совпадают с объявленными', () => {
  const c = [0, 0, 0, 0, 0], n = N * 4; for (let i = 0; i < n; i++) { const p = E.openPack(t); assert.strictEqual(p.length, 5); for (const x of p) c[x.rar]++; assert(Math.max(...p.map(x => x.rar)) >= E.PACKS[t].min); }
  if (t === 'basic') E.PACKS[t].odds.forEach((o, i) => assert(Math.abs(c[i] / n / 5 * 100 - o) < Math.max(1.2, o * .12), 'редкость ' + i));
});

console.log('3. Сохранение и перенос');
const G = E.newProfile(NOW);
ok('новый профиль: версия 2, пять карточек, три состава', () => { assert.strictEqual(G.v, 2); assert.strictEqual(Object.keys(G.cards).length, 5); assert.strictEqual(G.squads.length, 3); assert(G.squad.every(id => G.cards[id])); assert.strictEqual(G.tut, 0); });
ok('сохранение переживает перезапуск без потерь', () => { const g2 = E.migrate(JSON.parse(JSON.stringify(G)), NOW); assert.deepStrictEqual(JSON.parse(JSON.stringify(g2)), JSON.parse(JSON.stringify(G))); assert.deepStrictEqual(g2.squad, G.squad); });
ok('версия 1 переносится: особые карточки, состав, монеты и уровень сохраняются', () => {
  const v1 = { v: 1, coins: 777, tro: 640, best: 700, xp: 30, lvl: 4, cards: { 0: { n: 2, lv: 3 }, 1000: { n: 1, lv: 1 }, 2003: { n: 1, lv: 2 }, 16: { n: 1, lv: 1 }, 26: { n: 1, lv: 1 }, 2: { n: 1, lv: 1 }, 10: { n: 3, lv: 1 } }, squad: [2003, 1000, 26, 2, 10], packs: { basic: 1, pro: 0, elite: 2 }, daily: NOW - 3600000, w: 9, l: 4 };
  const g = E.migrate(JSON.parse(JSON.stringify(v1)), NOW);
  assert.strictEqual(g.v, 2); assert.strictEqual(g.coins, 817); assert.strictEqual(g.streak.day, 1); assert.strictEqual(g.lvl, 4); assert.strictEqual(g.tro, 640);
  assert.deepStrictEqual(g.cards[0], { n: 2, lv: 3 }); assert(g.cards[E.W_ID] && g.cards[E.M_ID + 3].lv === 2); assert(!g.cards[1000] && !g.cards[2003]);
  assert.deepStrictEqual(g.squad, [E.M_ID + 3, E.W_ID, 26, 2, 10]); assert.strictEqual(E.CARDS[E.M_ID + 3].nick, E.CARDS[3].nick);
  assert.strictEqual(g.capts[0], 10); assert.strictEqual(g.tut, 3); assert.strictEqual(E.dailyReady(g, NOW), false); assert.strictEqual(g.tasks.d.length, 4);
});
ok('повреждённые данные не принимаются, неизвестные карточки не ломают игру', () => {
  assert.strictEqual(E.migrate(null, NOW), null); assert.strictEqual(E.migrate({ v: 2 }, NOW), null); assert.strictEqual(E.migrate({ v: 9, cards: {}, squad: [] }, NOW), null);
  const g = E.migrate({ v: 2, coins: 'x', cards: { 5: { n: 1, lv: 9 }, 987654: { n: 2, lv: 1 } }, squads: [[5, 987654, null, null, null]] }, NOW);
  assert.strictEqual(g.coins, 40); assert.strictEqual(g.streak.day, 1); assert.strictEqual(g.cards[5].lv, 5); assert(!g.cards[987654] && g.orphans[987654]); assert.deepStrictEqual(g.squad, [5, null, null, null, null]); assert.strictEqual(E.squadInfo(E.squadOf(g)), null);
});
ok('миграция v1 переживает слот капитана с отсутствующей карточкой', () => {
  const v1 = { v: 1, coins: 10, cards: { 5: { n: 1, lv: 1 } }, squad: [5, null, null, null, 987654] };
  const g = E.migrate(v1, NOW); assert(g); assert.strictEqual(g.capts[0], null); assert.deepStrictEqual(g.squad, [5, null, null, null, null]);
});
ok('частично повреждённые поля заданий и сезона безопасно восстанавливаются', () => {
  const g = E.migrate({ v: 2, coins: 25, cards: { 987654: { n: 1, lv: 1 } }, orphans: 'broken', squads: [[], [], []], capts: [], season: { m: -1 }, tasks: { day: 0, d: null, week: 0, w: 'bad' } }, NOW);
  assert(g); assert.strictEqual(typeof g.orphans, 'object'); assert(g.orphans[987654]); assert(Array.isArray(g.season.goals)); assert(Array.isArray(g.season.hist));
  assert(Array.isArray(g.tasks.d)); assert(Array.isArray(g.tasks.w)); assert.strictEqual(g.tasks.d.length, 4);
  assert.strictEqual(g.tasks.w.length, 5); assert(g.tasks.s);
});
ok('нормализация удаляет повреждённые задания, награды и дубликаты игроков в составе', () => {
  const base = E.newProfile(NOW), id = base.squad[0];
  const data = JSON.parse(JSON.stringify(base));
  data.squads[0] = [id, id, null, null, null];
  data.tasks.d = [{ k: 'win', t: null, n: 2, p: 0, r: { coins: 50 } }, { k: 'match', t: 'Сыграйте матч: 2', n: 2, p: 1, r: { coins: 50 } }];
  data.tasks.w = [{ k: 'bad', t: 'Повреждённое', n: 1, p: 0, r: { pick: 99 } }];
  data.tasks.s = { k: 'bad', t: 'Без награды', n: 1, p: 0, r: {} };
  data.inbox = [{ t: 'Повреждённая награда', r: { pack: { nope: 1 } } }];
  data.picks = [[id], [id, id, id]];
  data.best = -100; data.xp = -5; data.w = -3; data.season.hist = [null, { m: 2, lg: 99, tro: 10, place: 1 }, { m: 2, lg: 1, tro: 500, place: 2 }];
  const g = E.migrate(data, NOW);
  assert(g); assert.strictEqual(g.squads[0].filter(x => x === id).length, 1);
  assert.strictEqual(g.tasks.d.length, 1); assert.strictEqual(g.tasks.d[0].p, 1);
  assert.strictEqual(g.tasks.w.length, 0); assert.strictEqual(g.tasks.s, null);
  assert.strictEqual(g.inbox.length, 0); assert.strictEqual(g.picks.length, 1);
  assert(g.best >= g.tro); assert.strictEqual(g.xp, 0); assert.strictEqual(g.w, 0); assert.strictEqual(g.season.hist.length, 1);
});

console.log('4. Карточки игрока: прокачка, продажа, состав');
ok('прокачка до 5 уровня тратит дубликаты и монеты, выше 5 нельзя', () => {
  const g = E.newProfile(NOW), id = g.squad[0]; g.cards[id].n = 30; g.coins = 1e6;
  for (let lv = 1; lv < 5; lv++) { const n0 = g.cards[id].n, c0 = g.coins; assert(E.doUp(g, id)); assert.strictEqual(g.cards[id].lv, lv + 1); assert.strictEqual(n0 - g.cards[id].n, E.UP_N[lv - 1]); assert.strictEqual(c0 - g.coins, E.upCost(E.CARDS[id], lv)); }
  assert.strictEqual(E.doUp(g, id), false); const e = E.effOf({ c: E.CARDS[id], lv: 5 }, E.CARDS[id].role); assert.strictEqual(e.ovr, E.CARDS[id].ovr + 4); assert(e.pw > E.abPow(E.CARDS[id], 1));
});
ok('штраф −5 за чужую роль и отключение способности', () => { const c = E.ALL.find(x => x.role === 0 && !x.sp), on = E.effOf({ c, lv: 1 }, 0), off = E.effOf({ c, lv: 1 }, 2); assert.strictEqual(on.ovr - off.ovr, 5); assert.strictEqual(off.pw, 0); assert(on.pw > 0); });
ok('продажа: дубль и последняя копия; последняя копия из состава требует подтверждения и освобождает слот', () => {
  const g = E.newProfile(NOW), id = g.squad[0]; g.cards[id].n = 2; const c0 = g.coins;
  assert.strictEqual(E.sellNeedsConfirm(g, id), false); const v = E.sellOne(g, id); assert(v > 0 && g.coins === c0 + v && g.cards[id].n === 1);
  assert.strictEqual(E.sellNeedsConfirm(g, id), true); E.sellOne(g, id); assert(!g.cards[id]); assert(g.squads.every(s => !s.includes(id))); assert.strictEqual(E.squadInfo(E.squadOf(g)), null);
  const sp = E.MVPP[0]; g.cards[sp.id] = { n: 1, lv: 3 }; assert.strictEqual(E.sellNeedsConfirm(g, sp.id), true); assert(E.priceOf(sp, 3) > E.priceOf(sp, 1));
});
ok('химия: игроки одной команды и роли', () => { const t = E.ALL.filter(c => c.team === 'Vitality' && !c.sp && !c.hist), sq = [0, 1, 2, 3, 4].map(r => ({ c: t.find(c => c.role === r), lv: 1 })); assert(sq.every(x => x.c)); const i = E.squadInfo(sq); assert.strictEqual(i.mx, 5); assert.strictEqual(i.chem, 13); const m = E.squadInfo(mkSq(70)); assert(m.chem <= 13); });
ok('капитан: только IGL, рекомендация, три состава независимы', () => {
  const g = E.newProfile(NOW); assert.strictEqual(E.captSlot(g), 4); assert.strictEqual(E.bestCapt(g), g.squad[4]);
  const a = E.ALL.find(c => c.role === 0 && !c.sp && c.nick !== E.CARDS[g.squad[0]].nick); E.addCard(g, a.id); E.setSlot(g, 4, a.id); assert.strictEqual(E.captSlot(g), -1); assert.strictEqual(E.bestCapt(g), null);
  g.sqi = 1; assert.strictEqual(E.captSlot(g), 4); assert.notStrictEqual(g.squads[0][4], g.squads[1][4]);
});

ok('Trade-Up безопасно обрабатывает пустой, неверный и неизвестный ввод', () => {
  const g = E.newProfile(NOW);
  assert.strictEqual(E.tuInfo(g, null).ok, false);
  assert.strictEqual(E.tuInfo(g, []).ok, false);
  assert.strictEqual(E.tuInfo(g, [987654]).ok, false);
});
console.log('5. Контракт');
ok('10 обычных карточек одной редкости дают одну карточку той же или следующей редкости', () => {
  const g = E.newProfile(NOW), pool = E.POOL[0].slice(0, 6); pool.forEach(c => { g.cards[c.id] = { n: 2, lv: 1 }; });
  const ids = pool.slice(0, 5).flatMap(c => [c.id, c.id]); let inf = E.tuInfo(g, ids.slice(0, 9)); assert.strictEqual(inf.ok, false);
  assert.strictEqual(E.tuInfo(g, ids.slice(0, 9).concat(E.POOL[1][0].id)).ok, false); assert.strictEqual(E.tuInfo(g, ids.slice(0, 9).concat(E.IFP[1][0].id)).ok, false);
  inf = E.tuInfo(g, ids); assert(inf.ok && /–/.test(inf.up)); const before = Object.values(g.cards).reduce((s, o) => s + o.n, 0), r = E.tuRun(g, ids);
  assert(r && !r.c.sp && (r.c.rar === 0 || r.c.rar === 1)); assert.strictEqual(Object.values(g.cards).reduce((s, o) => s + o.n, 0), before - 9); assert.strictEqual(E.tuRun(g, ids), null);
  let up = 0; for (let i = 0; i < 2000; i++) { const g2 = E.newProfile(NOW); pool.forEach(c => { g2.cards[c.id] = { n: 2, lv: 1 }; }); const x = E.tuRun(g2, ids); if (x.up) up++; else assert(x.c.ovr >= Math.ceil(inf.avg)); } assert(Math.abs(up / 2000 - inf.p) < .05);
  assert.strictEqual(E.tuInfo(g, E.POOL[4].slice(0, 8).map(c => c.id)).ok, false);
});

console.log('6. Матч');
ok('матч идёт до 13 побед, стороны меняются после 12 раунда, деньги в границах', () => {
  for (let i = 0; i < 300; i++) { const sq = mkSq(75), m = new E.Match(sq, 400, E.squadInfo(sq).rating, { capt: 4 }), s0 = m.sideA; let g = 0;
    while (!m.over) { const [c, p] = P.random(m), r = m.round, L = m.play(c, p); g++; assert(L.kills.length >= 3 && L.kills.length <= 10); for (const t of [m.a, m.b]) assert(t.money >= 0 && t.money <= 12000 && t.en >= 0 && t.en <= 8);
      if (r === 1 || r === 13) assert.strictEqual(L.buyA, m.hist.length === 25 ? 'full' : 'pistol'); if (r === 12 && !m.over) { assert(L.swap); assert.notStrictEqual(m.sideA, s0); assert.strictEqual(m.a.money, 800); } }
    assert(Math.max(m.a.score, m.b.score) === 13 && g <= 25 && g === m.hist.length); assert.strictEqual(m.a.k.reduce((x, y) => x + y, 0), m.b.d.reduce((x, y) => x + y, 0)); assert.strictEqual(m.a.mv.reduce((x, y) => x + y, 0), m.a.score);
    const rep = m.report(); assert(rep.players.length === 5 && rep.notes.length >= 1 && rep.moments.length <= 3); }
});
ok('счёт 12:12 приводит к одному решающему раунду с полной закупкой', () => {
  let seen = 0; for (let i = 0; i < 4000 && seen < 5; i++) { const sq = mkSq(75), m = new E.Match(sq, 400, E.squadInfo(sq).rating, { capt: 4 }); while (!m.over) { if (m.decider) { assert.strictEqual(m.a.score, 12); assert.strictEqual(m.b.score, 12); assert.strictEqual(m.a.money, 12000); const L = m.play([], {}); assert(L.decider && L.buyA === 'full' && L.buyB === 'full' && m.over); seen++; } else m.play(...P.greedy(m)); } } assert(seen >= 1);
});
ok('приказов можно отдать больше двух, пока хватает импульса; без импульса нельзя', () => {
  const sq = mkSq(75), m = new E.Match(sq, 0, 75, { capt: 4 }); m.a.en = 8; m.a.hand = ['clutch', 'timeout', 'awp', 'tempo']; assert(m.canPlay(m.a, ['clutch', 'timeout', 'awp', 'tempo'])); m.a.en = 3; assert(!m.canPlay(m.a, ['awp', 'tempo'])); assert(!m.canPlay(m.a, ['star']));
});
ok('без капитана нет разведки и меньше стартового импульса', () => { const sq = mkSq(75), m = new E.Match(sq, 0, 75, { capt: -1 }); assert.strictEqual(m.a.en, 2); for (let i = 0; i < 50; i++) { m.prep(); assert.strictEqual(m.nx.intel, null); } const m2 = new E.Match(sq, 0, 75, { capt: 4 }); assert.strictEqual(m2.a.en, 3); let n = 0; for (let i = 0; i < 300; i++) { m2.prep(); if (m2.nx.intel) n++; } assert(n > 20 && n < 280); });
ok('награды: 40 и 10 монет; кубки +25, +30, −25, −30; ниже нуля кубки не падают', () => {
  const g = E.newProfile(NOW); g.tro = 500; let r = E.applyResult(g, true, 13, 8); assert.strictEqual(r.tro, 25); assert.strictEqual(r.coins, 40);
  assert.strictEqual(E.applyResult(g, true, 13, 7).tro, 30); assert.strictEqual(E.applyResult(g, true, 13, 0).tro, 30); r = E.applyResult(g, false, 9, 13); assert.strictEqual(r.tro, -25); assert.strictEqual(r.coins, 10); assert.strictEqual(E.applyResult(g, false, 0, 13).tro, -30);
  g.tro = 10; assert.strictEqual(E.applyResult(g, false, 5, 13).tro, -10); assert.strictEqual(g.tro, 0);
});

ok('серия входов: награды по календарным дням, сброс после пропуска и цикл 28 дней', () => {
  const DAY = 86400000, g = E.newProfile(NOW);
  assert.strictEqual(g.streak.day, 1); assert.strictEqual(g.streak.reward.coins, 40);
  const c1 = g.coins; E.refresh(g, NOW); assert.strictEqual(g.coins, c1);
  E.refresh(g, NOW + DAY); assert.strictEqual(g.streak.day, 2); assert.strictEqual(g.streak.reward.coins, 50);
  E.refresh(g, NOW + 3 * DAY); assert.strictEqual(g.streak.day, 1, 'пропуск календарного дня сбрасывает серию');
  const full = E.newProfile(NOW), basic = full.packs.basic, pro = full.packs.pro;
  for (let d = 1; d < 28; d++) E.refresh(full, NOW + d * DAY);
  assert.strictEqual(full.streak.day, 28); assert.strictEqual(full.packs.basic, basic + 1);
  assert.strictEqual(full.packs.pro, pro + 2); assert.strictEqual(full.packs.elite, 1);
  E.refresh(full, NOW + 28 * DAY); assert.strictEqual(full.streak.day, 1, 'после 28-го дня цикл начинается заново');
});
console.log('7. Задания, бесплатный кейс, сезон');
ok('4 ежедневных, 5 недельных, 1 особое; прогресс, ручная награда, обновление в 00:00 по Москве', () => {
  const g = E.newProfile(NOW); assert.strictEqual(g.tasks.d.length, 0); g.tut = 3; E.refresh(g, NOW);
  assert.strictEqual(g.tasks.d.length, 4); assert(g.tasks.d.every(t => ['match', 'rounds', 'kills', 'cards'].includes(t.k)), 'ежедневные задания должны быть только на участие и действия'); assert.strictEqual(g.tasks.w.length, 5); assert(g.tasks.s); assert(g.tasks.w[0].main && g.tasks.w[0].r.pick != null); assert.strictEqual(g.season.goals.length, 3);
  const t = g.tasks.d[0], c0 = g.coins; assert.strictEqual(E.claimTask(g, t), false); E.taskAdd(g, { [t.k]: t.n + 5 }); assert.strictEqual(t.p, t.n); assert(E.claimTask(g, t)); assert.strictEqual(g.coins, c0 + t.r.coins); assert.strictEqual(E.claimTask(g, t), false);
  const t2 = g.tasks.d[1]; E.taskAdd(g, { [t2.k]: t2.n }); const t3 = g.tasks.d[2], p3 = t3.p;
  const midnight = Date.UTC(2026, 10, 10, 21, 0, 1); E.refresh(g, midnight - 2000); assert.strictEqual(g.tasks.d[1], t2); E.refresh(g, midnight);
  assert.notStrictEqual(g.tasks.d[1], t2); assert(g.tasks.d.every(x => x.p === 0)); assert.strictEqual(g.inbox.length, 1); assert.strictEqual(g.tasks.w.length, 5);
  const c1 = g.coins; assert(E.claimInbox(g, 0)); assert.strictEqual(g.coins, c1 + t2.r.coins); assert.strictEqual(g.inbox.length, 0); assert(p3 >= 0);
  const w0 = g.tasks.w; E.refresh(g, NOW + 7 * 86400000); assert.notStrictEqual(g.tasks.w, w0);
});
ok('карточная награда: выбор одной из трёх, нельзя пропустить или получить дважды', () => { const g = E.newProfile(NOW); E.giveReward(g, { pick: 2 }); assert.strictEqual(g.picks.length, 1); assert(g.picks[0].every(id => E.CARDS[id].rar === 2 && !E.CARDS[id].sp)); const g2 = E.migrate(JSON.parse(JSON.stringify(g)), NOW); assert.deepStrictEqual(g2.picks, g.picks); const id = g.picks[0][1], r = E.choosePick(g, 1); assert.strictEqual(r.c.id, id); assert(g.cards[id]); assert.strictEqual(g.picks.length, 0); assert.strictEqual(E.choosePick(g, 0), null); });
ok('задания выдаются только выполнимые', () => { const g = E.newProfile(NOW); g.tut = 3; const igl = g.squad[4]; delete g.cards[igl]; for (let i = 0; i < 200; i++) { assert(!E.genTasks(g, 'w').some(t => t.k === 'winCapt' || t.k === 'winRole')); const s = E.genTasks(g, 's'); assert(s.k !== 'winTeam3'); if (s.k === 'winCard') assert(g.cards[s.arg]); } });
ok('бесплатный кейс: раз в сутки, обновляется в 00:00 по Москве, не накапливается', () => { const g = E.newProfile(NOW); assert(E.dailyReady(g, NOW)); g.daily = E.mskDay(NOW); assert(!E.dailyReady(g, NOW + 3600000)); assert(E.dailyReady(g, Date.UTC(2026, 10, 10, 21, 0, 1))); assert(E.dailyReady(g, NOW + 5 * 86400000)); });
ok('сезон: в новом месяце итоги уходят в историю, рейтинг частично сбрасывается', () => { const g = E.newProfile(NOW); g.tut = 3; g.tro = 1000; E.refresh(g, NOW); const m0 = g.season.m; E.refresh(g, Date.UTC(2026, 11, 2)); assert.strictEqual(g.season.m, m0 + 1); assert.strictEqual(g.season.hist.length, 1); assert.strictEqual(g.season.hist[0].lg, 3); assert.strictEqual(g.season.hist[0].tro, 1000); assert(g.season.hist[0].place >= 1); assert(g.tro < 1000 && g.tro > 700); assert(g.inbox.some(x => /Итоги сезона/.test(x.t))); assert.strictEqual(g.frame, 3); });
ok('таблица лидеров: место игрока согласовано с кубками', () => { const g = E.newProfile(NOW); g.tut = 3; E.refresh(g, NOW); g.tro = 0; const a = E.lbTable(g, 'all', NOW); g.tro = 5000; const b = E.lbTable(g, 'all', NOW); assert.strictEqual(b.me.place, 1); assert(a.me.place > 100); assert.strictEqual(a.top.length, 10); });

console.log('8. Баланс матча (' + N + ' матчей на стратегию)');
const T = {}; for (const o of [66, 75, 85]) { T[o] = {}; for (const k in P) T[o][k] = sim(o, (o - 64) * 40, P[k]); console.log('  OVR ' + o + ': ' + Object.keys(P).map(k => k + ' ' + T[o][k].win.toFixed(1) + '%').join(' · ') + ' · раундов ' + T[o].reader.rounds.toFixed(1)); }
ok('игра без приказов заметно хуже любой другой', () => [66, 75, 85].forEach(o => assert(T[o].none.win < T[o].random.win - 8)));
ok('чтение соперника выгоднее случайных решений', () => [66, 75, 85].forEach(o => assert(T[o].reader.win > T[o].random.win + 5, 'OVR ' + o)));
ok('одно и то же направление каждый раунд наказывается', () => [66, 75, 85].forEach(o => assert(T[o].stubborn.win < T[o].reader.win - 5, 'OVR ' + o)));
ok('матч безопасно отклоняет неизвестные карты и нормализует неверную тактику', () => {
  const sq = mkSq(75), m = new E.Match(sq, 1200, E.squadInfo(sq).rating, { capt: 4 });
  assert.strictEqual(m.canPlay(m.a, ['not-a-card']), false);
  assert.strictEqual(m.canPlay(m.a, null), false);
  const L = m.play([], { dir: 'invalid', tempo: 'invalid', focus: 99 });
  assert(L); assert.strictEqual(m.hist[0].dirA, 'S'); assert.strictEqual(m.hist[0].focus, -1);
});
ok('клатч может быть засчитан любому игроку, а не только первому слоту', () => {
  let found = false;
  for (let n = 0; n < 80 && !found; n++) {
    const sq = mkSq(75), m = new E.Match(sq, 1200, E.squadInfo(sq).rating, { capt: 4 });
    while (!m.over) { const L = m.play([], { dir: 'ASB'[Math.floor(Math.random() * 3)], tempo: 'norm' }); if (L.clutch && L.mvpI !== 0) found = true; }
  }
  assert(found, 'клатч не должен быть жёстко привязан к слоту AWP');
});
ok('слабый соперник ошибается чаще сильного', () => assert(E.AI_ERR[0] > E.AI_ERR[6] && E.AI_ERR.every((x, i) => i === 0 || x <= E.AI_ERR[i - 1])));
ok('топовый соперник не непобедим, слабый не беспомощен', () => { assert(T[85].reader.win > 35 && T[85].reader.win < 80); assert(T[66].reader.win > 40 && T[66].reader.win < 85); });
{ const g = E.newProfile(NOW); g.tut = 3; E.refresh(g, NOW); let opened = 0, t = NOW; const open = k => { for (const c of E.openPack(k)) E.addCard(g, c.id); opened++; }; ['basic', 'pro', 'pro'].forEach(open);
  for (let i = 0; i < 60; i++) { if (i % 6 === 0) { t += 86400000; E.refresh(g, t); if (E.dailyReady(g, t)) { g.daily = E.mskDay(t); open('basic'); } }
    const sq = E.squadOf(g), m = new E.Match(sq, g.tro, E.squadInfo(sq).rating, { capt: E.captSlot(g) }); while (!m.over) { const L = m.play(...P.reader(m)); E.taskAdd(g, E.roundEvent(L)); } E.taskAdd(g, E.matchEvent(g, m)); E.applyResult(g, m.won, m.a.score, m.b.score);
    for (const x of E.allTasks(g)) E.claimTask(g, x); while (g.picks.length) E.choosePick(g, 0); for (const k of ['elite', 'pro', 'basic']) while (g.packs[k] > 0) { g.packs[k]--; open(k); } while (g.coins >= 400) { g.coins -= 400; open('basic'); }
    for (let r = 0; r < 5; r++) { const best = Object.keys(g.cards).map(id => E.CARDS[id]).filter(c => c.role === r && !g.squad.some((s, k) => k !== r && s != null && E.CARDS[s].nick === c.nick)).sort((a, b) => b.ovr - a.ovr)[0]; if (best) E.setSlot(g, r, best.id); } g.capts[g.sqi] = E.bestCapt(g); }
  console.log('  60 матчей за 10 дней: кубки ' + g.tro + ', ' + g.w + '–' + g.l + ', уровень ' + g.lvl + ', карточек ' + Object.keys(g.cards).length + ', кейсов открыто ' + opened + ', рейтинг состава ' + E.squadInfo(E.squadOf(g)).rating.toFixed(1) + ', сохранение ' + JSON.stringify(g).length + ' байт');
  ok('прогресс за 60 матчей не останавливается', () => assert(opened >= 12 && Object.keys(g.cards).length >= 40)); }
console.log('\nВсе проверки пройдены: ' + passed);
