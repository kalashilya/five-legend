/* ===== Прогресс: сохранение, составы, продажа, контракты, задания, сезоны ===== */
const SAVE_V = 2, MSK = 3 * 3600000;
const mskDay = ts => Math.floor((ts + MSK) / 86400000);            // сутки меняются в 00:00 по Москве
const mskWeek = day => Math.floor((day + 3) / 7);                   // неделя начинается в понедельник
const mskMonth = ts => { const d = new Date(ts + MSK); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };
const monthName = m => ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'][m % 12] + ' ' + Math.floor(m / 12);

/* ---------- Сохранение: перенос старых версий и проверка данных ---------- */
function migrate(d, now) {
  if (!d || typeof d !== 'object' || !d.cards || typeof d.cards !== 'object' || !(Array.isArray(d.squad) || Array.isArray(d.squads))) return null;
  if (d.v === 1) {                                                   // версия 1: особые карточки имели номера 1000+ и 2000+
    const map = id => { id = +id; return id >= 2000 && id < 2500 ? M_ID + id - 2000 : id >= 1000 && id < 1500 ? W_ID + id - 1000 : id; };
    const cards = {}; for (const k in d.cards) cards[map(k)] = d.cards[k];
    d.cards = cards; d.squad = d.squad.map(x => x == null ? null : map(x));
    d.daily = d.daily ? mskDay(d.daily) : -1; d.tut = 3; d.v = 2;
  }
  return d.v === SAVE_V ? normalize(d, now) : null;
}
function cleanReward(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  const out = {};
  if (Number.isFinite(r.coins) && r.coins > 0) out.coins = Math.floor(r.coins);
  if (r.pack && typeof r.pack === 'object' && !Array.isArray(r.pack)) {
    const pack = {};
    for (const k of ['basic', 'pro', 'elite']) if (Number.isFinite(r.pack[k]) && r.pack[k] > 0) pack[k] = Math.floor(r.pack[k]);
    if (Object.keys(pack).length) out.pack = pack;
  }
  if (Number.isInteger(r.pick) && r.pick >= 0 && r.pick < POOL.length) out.pick = r.pick;
  return Object.keys(out).length ? out : null;
}
function cleanTask(t) {
  if (!t || typeof t !== 'object' || Array.isArray(t) || typeof t.k !== 'string' || typeof t.t !== 'string' || !Number.isFinite(t.n) || t.n <= 0) return null;
  const r = cleanReward(t.r);
  if (!r) return null;
  return Object.assign({}, t, { n: Math.max(1, Math.floor(t.n)), p: Number.isFinite(t.p) ? clamp(Math.floor(t.p), 0, Math.floor(t.n)) : 0, r, claimed: t.claimed === true });
}
function normalize(G, now) {
  const num = (k, v) => { if (typeof G[k] !== 'number' || !isFinite(G[k])) G[k] = v; };
  num('coins', 0); num('tro', 0); num('best', G.tro); num('xp', 0); num('lvl', 1); num('daily', -1); num('w', 0); num('l', 0); num('tut', 3); num('frame', -1); num('sqi', 0);
  G.coins = Math.max(0, Math.round(G.coins)); G.tro = Math.max(0, Math.round(G.tro)); G.best = Math.max(G.tro, Math.round(G.best)); G.w = Math.max(0, Math.floor(G.w)); G.l = Math.max(0, Math.floor(G.l)); G.lvl = Math.max(1, Math.floor(G.lvl)); G.xp = Math.max(0, Math.min(100 * G.lvl - 1, Math.floor(G.xp))); G.tut = clamp(G.tut | 0, 0, 3); G.frame = clamp(G.frame | 0, -1, 6); G.sqi = clamp(G.sqi | 0, 0, 2);
  G.streak = G.streak && typeof G.streak === 'object' && !Array.isArray(G.streak) ? G.streak : {};
  G.streak.day = clamp(G.streak.day | 0, 0, 28); G.streak.last = Number.isInteger(G.streak.last) ? G.streak.last : -1; G.streak.reward = cleanReward(G.streak.reward);
  { const p = G.streak.pend; G.streak.pend = p && Number.isInteger(p.d) && Number.isInteger(p.day) && p.day >= 1 && p.day <= 28 ? { d: p.d, day: p.day } : null; G.streak.shown = Number.isInteger(G.streak.shown) ? G.streak.shown : -1; }
  G.packs = Object.assign({ basic: 0, pro: 0, elite: 0 }, G.packs && typeof G.packs === 'object' ? G.packs : {});
  for (const k of ['basic', 'pro', 'elite']) G.packs[k] = Number.isFinite(G.packs[k]) ? Math.max(0, Math.floor(G.packs[k])) : 0;
  G.orphans = G.orphans && typeof G.orphans === 'object' && !Array.isArray(G.orphans) ? G.orphans : {};
  for (const id in G.cards) { const o = G.cards[id]; if (!CARDS[id] || !o || !Number.isFinite(+o.n) || !(+o.n >= 1)) { if (o) G.orphans[id] = o; delete G.cards[id]; } else { o.n = Math.floor(o.n); o.lv = clamp(o.lv | 0, 1, 5); } }
  if (!Array.isArray(G.squads)) { const s = (G.squad || []).slice(0, 5); G.squads = [s, s.slice(), s.slice()]; }
  delete G.squad;
  G.squads = [0, 1, 2].map(i => { const seen = new Set(); return [0, 1, 2, 3, 4].map(k => { const id = G.squads[i] && G.squads[i][k], c = id != null && G.cards[id] ? CARDS[id] : null; if (!c || seen.has(c.nick)) return null; seen.add(c.nick); return +id; }); });
  if (!Array.isArray(G.capts)) G.capts = G.squads.map(s => { const id = s[4]; return id != null && G.cards[id] && CARDS[id] && CARDS[id].role === 4 ? +id : null; });
  G.capts = [0, 1, 2].map(i => { const id = G.capts[i]; return id != null && G.squads[i].includes(id) && CARDS[id].role === 4 ? id : null; });
  Object.defineProperty(G, 'squad', { get() { return this.squads[this.sqi]; }, set(v) { this.squads[this.sqi] = v; }, enumerable: false, configurable: true });
  G.inbox = Array.isArray(G.inbox) ? G.inbox.map(x => { const r = x && cleanReward(x.r); return x && typeof x.t === 'string' && r ? { t: x.t, r } : null; }).filter(Boolean) : [];
  G.picks = Array.isArray(G.picks) ? G.picks.filter(p => Array.isArray(p) && p.length === 3 && p.every(id => CARDS[id]) && p.every(id => CARDS[id].rar === CARDS[p[0]].rar)) : [];
  G.season = G.season && typeof G.season === 'object' && !Array.isArray(G.season) ? G.season : {};
  if (!Number.isInteger(G.season.m)) G.season.m = -1;
  G.season.goals = Array.isArray(G.season.goals) ? G.season.goals.map(cleanTask).filter(Boolean) : [];
  G.season.hist = Array.isArray(G.season.hist) ? G.season.hist.filter(x => x && Number.isInteger(x.m) && Number.isInteger(x.lg) && x.lg >= 0 && x.lg < LEAGUES.length && Number.isFinite(x.tro) && Number.isFinite(x.place) && x.place >= 1).map(x => ({ m: x.m, lg: x.lg, tro: Math.max(0, Math.round(x.tro)), place: Math.max(1, Math.floor(x.place)) })).slice(0, 24) : [];
  G.tasks = G.tasks && typeof G.tasks === 'object' && !Array.isArray(G.tasks) ? G.tasks : {};
  if (!Number.isInteger(G.tasks.day)) G.tasks.day = -1;
  G.tasks.d = Array.isArray(G.tasks.d) ? G.tasks.d.map(cleanTask).filter(Boolean) : [];
  if (!Number.isInteger(G.tasks.week)) G.tasks.week = -1;
  G.tasks.w = Array.isArray(G.tasks.w) ? G.tasks.w.map(cleanTask).filter(Boolean) : [];
  G.tasks.s = cleanTask(G.tasks.s);
  if (!Number.isInteger(G.tasks.sStart)) G.tasks.sStart = -99;
  if (now != null) refresh(G, now);
  return G;
}
function newProfile(now) { const G = newGame(); G.tut = 0; return normalize(G, now); }

/* ---------- Составы и капитан ---------- */
const captSlot = G => { const id = G.capts[G.sqi]; return id == null ? -1 : G.squad.indexOf(id); };
function bestCapt(G) { let best = null; for (const id of G.squad) if (id != null && CARDS[id].role === 4) { const v = CARDS[id].st.igl + G.cards[id].lv; if (!best || v > best.v) best = { id, v }; } return best ? best.id : null; }
function setSlot(G, slot, id) {
  const c = CARDS[id], sq = G.squad, j = sq.findIndex(x => x != null && CARDS[x].nick === c.nick), old = sq[slot];
  if (j >= 0 && j !== slot) sq[j] = old; sq[slot] = id;
  if (!sq.includes(G.capts[G.sqi])) G.capts[G.sqi] = null;
}
function dropFromSquads(G, id) { G.squads.forEach((s, i) => { const k = s.indexOf(+id); if (k >= 0) s[k] = null; if (G.capts[i] === +id) G.capts[i] = null; }); }
const inSquads = (G, id) => G.squads.some(s => s.includes(+id));

/* ---------- Продажа: цена зависит от редкости, рейтинга и уровня (формула предложена, не утверждена) ---------- */
function priceOf(c, lv) {
  const pool = POOL[c.rar], mn = Math.min(...pool.map(x => x.ovr)), mx = Math.max(...pool.map(x => x.ovr));
  const rel = mx > mn ? clamp((c.ovr - (c.sp ? 3 : 0) - mn) / (mx - mn), 0, 1) : .5;
  return Math.round(sellVal(c) * (.9 + .2 * rel) * (1 + .25 * ((lv || 1) - 1)));
}
const sellNeedsConfirm = (G, id) => { const o = G.cards[id]; return !!o && o.n === 1 && (inSquads(G, id) || !!CARDS[id].sp); };
function sellOne(G, id) {
  const o = G.cards[id]; if (!o) return 0;
  const last = o.n === 1, v = priceOf(CARDS[id], last ? o.lv : 1);
  if (last) { delete G.cards[id]; dropFromSquads(G, id); } else o.n--;
  G.coins += v; return v;
}

/* ---------- Контракт: 10 обычных карточек одной редкости -> одна карточка (вероятности предложены, не утверждены) ---------- */
function tuInfo(G, ids) {
  if (!Array.isArray(ids) || !ids.length) return { ok: false, why: 'Выберите 10 обычных карточек одной редкости.' };
  const cs = ids.map(id => CARDS[id]);
  if (cs.some(c => !c)) return { ok: false, why: 'В контракте есть неизвестная карточка.' };
  const rar = cs[0].rar, cnt = {};
  for (const c of cs) { if (c.sp) return { ok: false, why: 'Особые версии в контракт не идут.' }; if (c.rar !== rar) return { ok: false, why: 'Все карточки должны быть одной редкости.' }; cnt[c.id] = (cnt[c.id] || 0) + 1; if (!G.cards[c.id] || G.cards[c.id].n < cnt[c.id]) return { ok: false, why: 'Не хватает копий.' }; }
  const avg = cs.reduce((s, c) => s + c.ovr, 0) / cs.length, pool = POOL[rar], mn = Math.min(...pool.map(x => x.ovr)), mx = Math.max(...pool.map(x => x.ovr));
  const p = clamp(.2 + .3 * (mx > mn ? (avg - mn) / (mx - mn) : 0), .2, .5), band = p < .3 ? '20–30%' : p < .4 ? '30–40%' : '40–50%';
  if (rar === 4) return { ok: false, rar, avg, why: 'Для редкости «Тайное» контракт пока закрыт: правило ещё не утверждено.' };
  return { ok: ids.length === 10, rar, avg, p, up: band, same: p < .3 ? '70–80%' : p < .4 ? '60–70%' : '50–60%', why: ids.length < 10 ? `Выбрано ${ids.length} из 10.` : '' };
}
function tuRun(G, ids) {
  const inf = tuInfo(G, ids); if (!inf.ok) return null;
  for (const id of ids) { const o = G.cards[id]; if (--o.n <= 0) { delete G.cards[id]; dropFromSquads(G, id); } }
  let out;
  if (R() < inf.p) { const pool = POOL[inf.rar + 1], mn = Math.min(...pool.map(c => c.ovr)); let tot = 0; const w = pool.map(c => { const x = 1 / (1 + .3 * (c.ovr - mn)); tot += x; return x; }); let r = R() * tot; out = pool[0]; for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) { out = pool[i]; break; } } }
  else { const better = POOL[inf.rar].filter(c => c.ovr >= Math.ceil(inf.avg)); out = pick(better.length ? better : POOL[inf.rar].slice(0, 5)); }
  const isNew = addCard(G, out.id);
  return { c: out, isNew, up: out.rar > inf.rar };
}

/* ---------- Награды ---------- */
function giveReward(G, r) {
  if (r.coins) G.coins += r.coins;
  if (r.pack) for (const k in r.pack) G.packs[k] += r.pack[k];
  if (r.pick != null) { const pool = POOL[r.pick], ids = []; for (let i = 0; i < 3; i++) ids.push(pick(pool).id); G.picks.push(ids); }
}
const rewardText = r => [r.coins ? r.coins + ' монет' : '', r.pack ? Object.keys(r.pack).map(k => 'кейс «' + PACKS[k].n + '»' + (r.pack[k] > 1 ? ' ×' + r.pack[k] : '')).join(', ') : '', r.pick != null ? 'карточка на выбор («' + RAR[r.pick] + '»)' : ''].filter(Boolean).join(' + ');
/* Серия входов: 28 календарных дней по Москве. Пропуск дня сбрасывает цикл.
   Награду дня нужно забрать (окно при первом входе за день или кнопка внизу главной). Монеты растут внутри каждой недели,
   кейсы «Про» на 7, 14 и 21 (×2) день, «Элитный» на 28-й, «Базовый» на 4, 11 и 24 день. */
const STREAK_REWARDS = [
  { coins: 30 }, { coins: 50 }, { coins: 70 }, { pack: { basic: 1 } }, { coins: 90 }, { coins: 110 }, { pack: { pro: 1 } },
  { coins: 40 }, { coins: 60 }, { coins: 80 }, { pack: { basic: 1 } }, { coins: 100 }, { coins: 120 }, { pack: { pro: 1 } },
  { coins: 50 }, { coins: 70 }, { coins: 90 }, { coins: 110 }, { coins: 130 }, { coins: 150 }, { pack: { pro: 2 } },
  { coins: 60 }, { coins: 80 }, { pack: { basic: 1 } }, { coins: 100 }, { coins: 120 }, { coins: 150 }, { pack: { elite: 1 } }
];
/* Отмечает, какой день серии можно забрать сегодня (S.pend). Сама награда выдаётся в claimStreak */
function updateStreak(G, now) {
  const S = G.streak, today = mskDay(now);
  if (S.last >= today) { S.pend = null; return false; }
  const day = S.last === today - 1 ? (S.day % 28) + 1 : 1;
  if (!S.pend || S.pend.d !== today || S.pend.day !== day) S.pend = { d: today, day };
  return true;
}
function claimStreak(G, now) {
  updateStreak(G, now); const S = G.streak, p = S.pend; if (!p) return null;
  const reward = STREAK_REWARDS[p.day - 1]; giveReward(G, reward); S.day = p.day; S.last = p.d; S.reward = reward; S.pend = null;
  return reward;
}
function choosePick(G, i) { const p = G.picks[0]; if (!p || p[i] == null) return null; G.picks.shift(); const isNew = addCard(G, p[i]); return { c: CARDS[p[i]], isNew }; }

/* ---------- Задания: 4 ежедневных, 5 недельных, 1 особое на 7 дней (цели и награды предложены, не утверждены) ---------- */
const T_DAILY = [['match', 'Сыграйте матчей: {n}', 2], ['rounds', 'Сыграйте раундов: {n}', 30], ['kills', 'Сделайте убийств: {n}', 40], ['cards', 'Отдайте приказов: {n}', 20]];
const T_WEEK = [['match', 'Сыграйте матчей: {n}', 12], ['kills', 'Сделайте убийств: {n}', 250], ['awpk', 'Сделайте убийств снайпером: {n}', 45], ['atkw', 'Выиграйте раундов в атаке: {n}', 50], ['winRole', 'Победите составом без штрафов за роль: {n}', 3], ['winCapt', 'Победите с капитаном: {n}', 3], ['open', 'Выиграйте первых дуэлей: {n}', 70]];
const W_REW = [{ pack: { basic: 1 } }, { pack: { basic: 1 } }, { coins: 500 }, { pack: { pro: 1 } }];
const ownsRole = (G, r) => Object.keys(G.cards).some(id => CARDS[id].role === r);
function team3(G) { const t = {}; for (const id in G.cards) { const c = CARDS[id]; (t[c.team] = t[c.team] || new Set()).add(c.nick); } return Object.values(t).some(s => s.size >= 3); }
const feasible = (G, k) => k === 'winCapt' ? ownsRole(G, 4) : k === 'awpk' ? ownsRole(G, 0) : k === 'winRole' ? [0, 1, 2, 3, 4].every(r => ownsRole(G, r)) : k === 'winTeam3' ? team3(G) : true;
const mkTask = (k, text, n, r, x) => Object.assign({ k, t: text.replace('{n}', n), n, p: 0, r, claimed: false }, x);
function genTasks(G, kind) {
  const lg = leagueOf(G.tro), sc = n => Math.max(1, Math.round(n * (1 + .1 * lg)));
  if (kind === 'd') return shuffle(T_DAILY.slice()).slice(0, 4).map(([k, t, n]) => mkTask(k, t, sc(n), { coins: 90 + 10 * lg }));
  if (kind === 'w') {
    const rest = shuffle(T_WEEK.filter(x => feasible(G, x[0]))).slice(0, 4);
    return [mkTask('win', 'Главное: победите в матчах: {n}', sc(6), { pick: clamp(1 + Math.floor(lg / 2), 1, 3) }, { main: true })].concat(rest.map(([k, t, n], i) => mkTask(k, t, sc(n), W_REW[i])));
  }
  const rw = { pick: clamp(2 + Math.floor(lg / 2), 2, 4), pack: { pro: 1 } }, opts = [() => mkTask('winBig', 'Победите с разницей больше 5 раундов: {n}', 4, rw)];
  if (feasible(G, 'winTeam3')) opts.push(() => mkTask('winTeam3', 'Победите с тремя игроками одной команды в составе: {n}', 6, rw));
  const own = Object.keys(G.cards).map(id => CARDS[id]).filter(c => !c.sp).sort((a, b) => b.ovr - a.ovr), c = own.length ? pick(own.slice(0, Math.max(1, Math.ceil(own.length / 2)))) : null;
  if (c) opts.push(() => mkTask('winCard', `Победите с игроком ${c.nick} (${c.team}) в составе: {n}`, 6, rw, { arg: c.id }));
  return pick(opts)();
}
const SEASON_GOALS = [['win', 'Победите в матчах за сезон: {n}', 25, { coins: 600 }], ['match', 'Сыграйте матчей за сезон: {n}', 50, { pack: { pro: 1 } }], ['kills', 'Сделайте убийств за сезон: {n}', 1500, { pack: { pro: 1 } }]];
const S_COINS = [100, 200, 300, 500, 700, 1000, 1500], S_DROP = [0, 40, 80, 130, 180, 250, 350];
const taskDone = t => t.p >= t.n;
function allTasks(G) { const T = G.tasks; return T.d.concat(T.w, T.s ? [T.s] : [], G.season.goals); }
/* Смена суток, недели, особого задания и сезона. Выполненные, но не забранные награды уходят во «Входящие» и не сгорают */
function refresh(G, now) {
  updateStreak(G, now);
  const day = mskDay(now), wk = mskWeek(day), mo = mskMonth(now), T = G.tasks, stash = l => l.forEach(t => { if (t && taskDone(t) && !t.claimed) G.inbox.push({ t: t.t.replace('Главное: ', ''), r: t.r }); });
  if (G.season.m !== mo) {
    if (G.season.m >= 0) {
      const lg = leagueOf(G.tro), place = lbPlace(G, G.season.m, now);
      G.season.hist.unshift({ m: G.season.m, lg, tro: G.tro, place }); G.season.hist = G.season.hist.slice(0, 24);
      stash(G.season.goals); G.frame = Math.max(G.frame, lg);
      G.inbox.push({ t: `Итоги сезона «${monthName(G.season.m)}»: лига «${LEAGUES[lg][0]}», место ${place}`, r: Object.assign({ coins: S_COINS[lg] }, lg >= 5 ? { pack: { elite: 1 } } : lg >= 3 ? { pack: { pro: 1 } } : lg >= 1 ? { pack: { basic: 1 } } : {}) });
      G.tro = Math.max(0, G.tro - S_DROP[lg]);
    }
    G.season.m = mo; G.season.goals = SEASON_GOALS.map(([k, t, n, r]) => mkTask(k, t, n, r));
  }
  if (G.tut < 3) return;                                               // задания открываются после первого матча
  if (T.day !== day) { stash(T.d); T.d = genTasks(G, 'd'); T.day = day; }
  if (T.week !== wk) { stash(T.w); T.w = genTasks(G, 'w'); T.week = wk; }
  if (!T.s || day >= T.sStart + 7) { stash([T.s]); T.s = genTasks(G, 's'); T.sStart = day; }
}
function taskAdd(G, ev) {
  for (const t of allTasks(G)) { if (taskDone(t)) continue; let v = ev[t.k]; if (t.k === 'winCard') v = ev.win && ev.cards5 && ev.cards5.includes(t.arg) ? 1 : 0; if (v) t.p = Math.min(t.n, t.p + v); }
}
function claimTask(G, t) { if (!t || !taskDone(t) || t.claimed) return false; t.claimed = true; giveReward(G, t.r); return true; }
function claimInbox(G, i) { const x = G.inbox[i]; if (!x) return false; G.inbox.splice(i, 1); giveReward(G, x.r); return true; }
/* События матча для заданий: раунд засчитывается сразу, победа и матч — только при завершении */
const roundEvent = L => ({ rounds: 1, rwin: L.win ? 1 : 0, kills: L.kA, cards: L.mine.length, open: L.openMine ? 1 : 0, awpk: L.awpK, atkw: L.win && L.sideA === 'A' ? 1 : 0 });
function matchEvent(G, m) {
  const sq = squadOf(G), info = m.a.info, w = m.won ? 1 : 0;
  return { match: 1, win: w, winRole: w && info.onRole ? 1 : 0, winCapt: w && m.a.capt >= 0 ? 1 : 0, winTeam3: w && info.mx >= 3 ? 1 : 0, winBig: w && m.a.score - m.b.score > 5 ? 1 : 0, cards5: sq.map(x => x.c.id) };
}
const dailyReady = (G, now) => G.daily !== mskDay(now);

/* ---------- Таблицы лидеров: без сервера соперники в таблице — боты ---------- */
function lbBots(month, now) {
  let s = (month * 2654435761) >>> 0; const r = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const A = ['Ka', 'Ro', 'Zi', 'Mo', 'Te', 'Vi', 'Sha', 'No', 'Dre', 'Lu', 'Fen', 'Gri', 'Xa', 'Bo', 'Ti'], B = ['rik', 'zzo', 'man', 'lex', 'tor', 'dan', 'vik', 'sen', 'kov', 'mir', 'tas', 'ron'];
  const d = new Date(now + MSK), prog = mskMonth(now) > month ? 1 : d.getUTCDate() / new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(), out = [];
  for (let i = 0; i < 150; i++) out.push({ name: A[Math.floor(r() * A.length)] + B[Math.floor(r() * B.length)] + Math.floor(r() * 90 + 10), tro: Math.round(3300 * Math.pow(1 - i / 150, 2.4) * (.3 + .7 * prog) + r() * 20) });
  return out;
}
function lbTable(G, scope, now) {
  const lg = leagueOf(G.tro), rows = lbBots(G.season.m, now).filter(b => scope === 'all' || leagueOf(b.tro) === lg).concat([{ name: 'Вы', tro: G.tro, me: true }]).sort((a, b) => b.tro - a.tro || (a.me ? -1 : 1));
  rows.forEach((x, i) => x.place = i + 1); const me = rows.find(x => x.me);
  return { top: rows.slice(0, 10), me, total: rows.length };
}
const lbPlace = (G, month, now) => lbBots(month, now).filter(b => b.tro > G.tro).length + 1;

if (typeof module !== 'undefined') module.exports = { CARDS, ALL, POOL, IFP, MVPP, PACKS, W_ID, M_ID, openPack, newGame, addCard, squadOf, squadInfo, effOf, Match, MAPS, BUY, acVal, applyResult, AC, DECK, STYLES, leagueOf, LEAGUES, canUp, doUp, sellVal, upCost, UP_N, AB_BASE, AB_IND, IND, indOf, indPow, abPow, DIRS, TEMPOS, AI_ERR, WIN_N,
  migrate, normalize, newProfile, captSlot, bestCapt, setSlot, priceOf, sellOne, sellNeedsConfirm, inSquads, tuInfo, tuRun, giveReward, choosePick, genTasks, refresh, taskAdd, claimTask, claimInbox, roundEvent, matchEvent, taskDone, allTasks, dailyReady, lbTable, lbPlace, mskDay, mskWeek, mskMonth, feasible, rewardText, STREAK_REWARDS, updateStreak, claimStreak };
