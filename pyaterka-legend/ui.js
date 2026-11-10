/* ===== Интерфейс ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => Math.round(n).toLocaleString('ru-RU');
const KEY = 'pyaterka-legend-v1', IKEY = KEY + '-img', SKEY = KEY + '-mute';
let G, IMG = {}, tab = 'home', lastTab = null, sub = 'cards', taskTab = 'd', lbScope = 'all', sheet = null, OV = null, askNew = false, askSell = null, colN = 45, imgMsg = '', snd = 'min', tuSel = [], tuRar = 0;
const F = { q: '', rar: 'all', role: 'all', team: 'all', own: 'all', sort: 'ovr' };
const now = () => Date.now();

/* ---------- Сохранение: перед переносом и при нечитаемых данных остаётся копия ---------- */
function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* без хранилища игра идёт до закрытия страницы */ } }
function backup(sfx, raw) { try { localStorage.setItem(KEY + sfx, raw); } catch (e) { /* копия не поместилась */ } }
function load() {
  try { const v = localStorage.getItem(SKEY); snd = v === '1' || v === 'off' ? 'off' : v === 'full' ? 'full' : 'min'; } catch (e) { /* звук по умолчанию */ }
  try { const im = JSON.parse(localStorage.getItem(IKEY)); if (im && typeof im === 'object') IMG = im; } catch (e) { /* нет картинок */ }
  let raw = null; try { raw = localStorage.getItem(KEY); } catch (e) { /* хранилище недоступно */ }
  if (!raw) return 'new';
  let d = null, g = null; try { d = JSON.parse(raw); } catch (e) { /* не JSON */ }
  const old = d && d.v === 1;
  try { g = migrate(d, now()); } catch (e) { g = null; }
  if (!g) { backup('-broken-' + now(), raw); return 'broken'; }
  if (old) backup('-before-v2', raw);
  G = g; return 'ok';
}
const own = id => G.cards[id];
const packCount = () => G.packs.basic + G.packs.pro + G.packs.elite;
const RCOL = ['#b0c3d9', '#6c8cff', '#a274ff', '#e45cf2', '#ff5a5a'];
const glow = c => c.sp === 1 ? '#ff8a3d' : c.sp === 2 ? '#f2c14e' : RCOL[c.rar];
const teamCol = c => `hsl(${hsh(c.team) % 360} 75% 58%)`;
const rarName = c => c.sp ? SPN[c.sp] : RAR[c.rar];
const noMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const claimable = l => l.some(t => t && taskDone(t) && !t.claimed);
const todo = () => G.tut === 3 && (G.inbox.length > 0 || claimable(allTasks(G)));

/* ---------- Звук: три режима — выключен, минимальный (по умолчанию), полный ---------- */
let AUD = null;
function tone(f, d = .06, type = 'square', v = .04, to = 0) {
  try {
    AUD = AUD || new (window.AudioContext || window.webkitAudioContext)();
    const o = AUD.createOscillator(), g = AUD.createGain(), t = AUD.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(AUD.destination); o.start(t); o.stop(t + d);
  } catch (e) { /* звук недоступен */ }
}
const SND = {
  tap: [1, () => tone(900, .03, 'square', .02)], scan: [1, () => tone(1400, .03, 'square', .015)], kill: [1, () => tone(180, .07, 'square', .04, 70)],
  stop: [0, r => { tone(300 + r * 120, .18, 'triangle', .07); if (r >= 3) setTimeout(() => tone(600 + r * 160, .4, 'sawtooth', .05, 1400), 90); }],
  open: [0, () => tone(160, .35, 'sawtooth', .06, 60)], rare: [0, () => { tone(110, .9, 'sawtooth', .07, 440); setTimeout(() => tone(880, .5, 'triangle', .06, 1320), 700); }],
  win: [0, () => { tone(520, .12, 'triangle', .07); setTimeout(() => tone(780, .22, 'triangle', .07), 110); }], lose: [0, () => tone(260, .3, 'triangle', .06, 140)],
  found: [0, () => { tone(440, .1, 'square', .04); setTimeout(() => tone(660, .1, 'square', .04), 120); setTimeout(() => tone(880, .25, 'square', .04), 240); }]
};
function sfx(k, a) { const s = SND[k]; if (snd === 'off' || (s[0] && snd !== 'full')) return; s[1](a); }

/* ---------- Фото игроков: файл photos/<ник>.png|jpg рядом с игрой либо картинка, добавленная на экране карточки ---------- */
const PH = {}, EXT = ['png', 'jpg', 'jpeg', 'webp'];
const slug = n => n.toLowerCase().replace(/[^a-z0-9а-яё_-]/g, '');
function probe(s, i) {
  if (i >= EXT.length) return;
  const im = new Image(), u = 'photos/' + s + '.' + EXT[i];
  im.onload = () => { PH[s] = u; document.querySelectorAll('[data-ph="' + s + '"]').forEach(el => { el.outerHTML = `<img class="ph" src="${u}" alt="" loading="lazy">`; }); };
  im.onerror = () => probe(s, i + 1); im.src = u;
}
function faceH(c) {
  const s = slug(c.nick); let u = IMG[c.base];
  if (!u && s) { if (typeof PH[s] === 'string') u = PH[s]; else if (PH[s] === undefined) { PH[s] = 0; probe(s, 0); } }
  return u ? `<img class="ph" src="${u}" alt="" loading="lazy">` : `<svg class="art" data-ph="${s}" viewBox="0 0 100 100" aria-hidden="true"><use href="#sil"/></svg>`;
}
function cardH(c, o = {}) {
  const lv = o.lv || 1, add = lv - 1;
  return `<div class="pc r${c.rar} ${c.sp ? 'sp' + c.sp : ''} ${lv >= 5 ? 'l5' : ''} ${o.cls || ''} ${o.no ? 'no' : ''}" style="--tc:${teamCol(c)}"><span class="mg">${esc(c.nick.slice(0, 2))}</span>${faceH(c)}<span class="sh"></span><div class="hd"><span class="ov">${c.ovr + add}</span><span class="rl">${RN[c.role]}</span></div><span class="rk">#${c.t + 1}</span>${c.hist ? '<span class="arc">архив</span>' : ''}<div class="ft">${c.sp ? `<span class="tag">${SPN[c.sp]}</span>` : ''}<span class="nk">${esc(c.nick)}</span><span class="tm">${esc(c.team)}</span>${o.stats ? `<span class="sg">${SK.map(k => `<span><b>${c.st[k] + add}</b>${SS[k]}</span>`).join('')}</span>` : ''}${o.pips ? `<span class="lv">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div>${o.n > 1 ? `<span class="cnt">×${o.n}</span>` : ''}</div>`;
}
const ownH = (id, cls) => { const o = own(id); return cardH(CARDS[id], { lv: o ? o.lv : 1, n: o ? o.n : 0, cls, pips: !!o, no: !o }); };
const pkH = (t, cls) => `<div class="pk ${t} ${cls || ''}"><i class="lid"></i><i class="lock"></i><div class="box"><b>${PACKS[t].n}</b></div></div>`;
const LCOL = ['#b98a5a', '#b9c2cc', '#f2c14e', '#7fe0d0', '#8fb8ff', '#e45cf2', '#ff5a5a'];
const rankH = i => `<svg class="rank" viewBox="0 0 44 30" aria-hidden="true"><path d="M2 2h40v17L22 28 2 19z" fill="#101215" stroke="${LCOL[i]}" stroke-width="1.6"/>${[0, 1, 2].slice(0, i % 3 + 1).map(k => `<path d="M12 ${7 + k * 5}l10 4 10-4" fill="none" stroke="${LCOL[i]}" stroke-width="2.2"/>`).join('')}</svg>`;
const segH = (act, cur, opts) => `<div class="seg">${opts.map(([v, n, dot]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${n}${dot ? '<span class="dot"></span>' : ''}</button>`).join('')}</div>`;
function hudH() {
  const lg = leagueOf(G.tro);
  return `<div class="who">${rankH(lg)}<div style="min-width:0"><b>${LEAGUES[lg][0]} · ${G.tro}</b><span class="sm mut">уровень ${G.lvl}</span><span class="xp" aria-label="Опыт ${G.xp} из ${100 * G.lvl}"><i style="width:${G.xp / G.lvl}%"></i></span></div></div><div class="pill"><i class="coin"></i>${nf(G.coins)}</div>`;
}

/* ---------- Главная ---------- */
function taskRowH(t, key) {
  const done = taskDone(t);
  return `<div class="task ${done ? 'done' : ''} ${t.main ? 'main' : ''} ${t.claimed ? 'got' : ''}"><div style="min-width:0"><p>${esc(t.t)}</p><span class="rw">${rewardText(t.r)}</span></div>${t.claimed ? '<span class="sm mut">получено</span>' : done ? `<button class="btn pri s" data-act="claim" data-v="${key}">Забрать награду</button>` : `<span class="num sm">${t.p}/${t.n}</span>`}<span class="bar"><i style="width:${Math.min(100, t.p / t.n * 100)}%"></i></span></div>`;
}
function tasksH() {
  const T = G.tasks, day = mskDay(now()), lists = { d: T.d, w: T.w, s: T.s ? [T.s] : [], m: G.season.goals }, l = lists[taskTab];
  const foot = { d: 'Новые задания каждый день в 00:00 по Москве. Невыполненные сгорают.', w: 'Новая неделя начинается в понедельник в 00:00 по Москве.', s: `До смены особого задания: ${Math.max(1, T.sStart + 7 - day)} дн.`, m: `Сезон «${monthName(G.season.m)}». Цели действуют до конца месяца.` }[taskTab];
  return `<section class="pn"><h3>Задания</h3>${G.inbox.map((x, i) => `<div class="task done"><div style="min-width:0"><p>${esc(x.t)}</p><span class="rw">${rewardText(x.r)}</span></div><button class="btn pri s" data-act="inbox" data-v="${i}">Забрать награду</button></div>`).join('')}
  ${segH('ttab', taskTab, [['d', 'День', claimable(T.d)], ['w', 'Неделя', claimable(T.w)], ['s', 'Особое', claimable(lists.s)], ['m', 'Сезон', claimable(lists.m)]])}
  <div class="list">${l.map((t, i) => taskRowH(t, taskTab + ':' + i)).join('')}</div><p class="sm mut">${foot} Засчитываются только рейтинговые матчи.</p></section>`;
}
function vHome() {
  const lg = leagueOf(G.tro), nx = LEAGUES[lg + 1], info = squadInfo(squadOf(G)), low = lg > 0 && G.tro - LEAGUES[lg][1] < 30;
  const prog = nx ? (G.tro - LEAGUES[lg][1]) / (nx[1] - LEAGUES[lg][1]) * 100 : 100, st = G.tut;
  const streak = G.streak || { day: 0, last: -1, reward: null }, streakReward = streak.last === mskDay(now()) && streak.reward ? rewardText(streak.reward) : '';
  const streakCells = Array.from({ length: 28 }, (_, i) => { const d = i + 1, done = d <= streak.day, milestone = [7, 14, 21, 28].includes(d); return `<span style="display:grid;place-items:center;min-height:27px;border:1px solid ${milestone ? 'var(--gold)' : 'var(--line)'};border-radius:6px;background:${done ? 'var(--accent)' : 'var(--panel2)'};color:${done ? '#141414' : 'var(--mut)'};font:600 11px var(--f-m)">${d}</span>`; }).join('');
  const tut = st < 3 ? `<section class="pn"><h3>Первые шаги</h3><div class="steps"><div class="${st > 0 ? 'ok' : 'now'}"><i>${st > 0 ? '✓' : 1}</i>Откройте стартовые кейсы</div><div class="${st > 1 ? 'ok' : st === 1 ? 'now' : ''}"><i>${st > 1 ? '✓' : 2}</i>Соберите пятёрку из лучших карточек</div><div class="${st === 2 ? 'now' : ''}"><i>3</i>Сыграйте первый матч</div></div>${st === 0 ? '<button class="btn pri" data-act="tab" data-v="packs">К кейсам</button>' : st === 1 ? '<button class="btn pri" data-act="auto">Собрать лучший состав</button>' : '<p class="sm mut">Нажмите «Играть». После первого матча откроются задания, сезон и таблица лидеров.</p>'}</section>` : '';
  return `${G.note ? `<div class="note bad">${esc(G.note)} <button class="btn s" data-act="noteOk" style="margin-top:8px">Понятно</button></div>` : ''}${tut}
  <section class="lobby"><div class="kv"><span>Пятёрка ${G.sqi + 1}</span><span>Рейтинг <b>${info ? info.rating.toFixed(1) : '—'}</b></span></div>
  <div class="lineup">${G.squad.map((id, i) => id == null ? `<button data-act="slot" data-v="${i}" aria-label="Пустой слот: ${RNAME[i]}"><div class="slot empty" style="display:block;padding:0"><div class="ph0">+</div></div></button>` : `<button data-act="card" data-id="${id}" aria-label="${esc(CARDS[id].nick)}">${ownH(id, 'xs')}</button>`).join('')}</div>
  ${info ? '<button class="btn pri go" data-act="fight">Играть</button>' : '<button class="btn go" data-act="goSquad">Соберите пятёрку</button>'}
  ${info ? `<div class="stats"><div class="stat"><b>${info.atk.toFixed(1)}</b><span>атака</span></div><div class="stat"><b>${info.def.toFixed(1)}</b><span>защита</span></div><div class="stat"><b>${info.chem}/13</b><span>химия</span></div></div>` : ''}</section>
  <section class="pn"><div class="kv"><span>Лига «${LEAGUES[lg][0]}»</span><span>Кубки <b>${G.tro}</b></span></div><span class="bar"><i style="width:${prog}%"></i></span><p class="sm mut">${nx ? `До лиги «${nx[0]}» ещё ${nx[1] - G.tro} кубков.` : 'Высшая лига достигнута.'}</p>${low ? `<p class="warn">До понижения в лигу «${LEAGUES[lg - 1][0]}» осталось ${G.tro - LEAGUES[lg][1] + 1} кубков.</p>` : ''}</section>
  <section class="pn"><div class="kv"><span>Серия ежедневных входов</span><b>День ${streak.day} / 28</b></div><span class="bar"><i style="width:${streak.day / 28 * 100}%"></i></span><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin-top:10px">${streakCells}</div><p class="sm mut" style="margin-top:10px">${streakReward ? 'Сегодня получено: ' + esc(streakReward) : 'Заходите каждый календарный день по Москве — пропуск сбрасывает серию.'}</p><p class="sm mut">Большие награды: день 7 — базовый кейс + 150 монет; 14 — кейс «Про» + 200; 21 — кейс «Про» + 250; 28 — элитный кейс + 400.</p></section>
  ${st === 3 ? tasksH() : ''}
  <section class="pn"><div class="shop">${pkH('basic')}<div class="plain"><h3>Бесплатный кейс</h3>${dailyReady(G, now()) ? '<button class="btn" data-act="daily">Забрать</button>' : '<p class="sm mut">Следующий — после 00:00 по Москве.</p>'}${packCount() ? `<button class="btn s" data-act="tab" data-v="packs">Неоткрытых кейсов: ${packCount()}</button>` : ''}</div></div></section>`;
}

/* ---------- Матчи ---------- */
function lbH() {
  const t = lbTable(G, lbScope, now()), row = x => `<div class="lb ${x.me ? 'me' : ''}"><b>${x.place}</b><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)}</span><b>${x.tro}</b></div>`;
  return `<section class="pn"><h3>Таблица лидеров</h3>${segH('lb', lbScope, [['all', 'Общая'], ['lg', 'Моя лига']])}<div>${t.top.map(row).join('')}${t.me.place > 10 ? '<div class="lb"><span></span><span class="mut">…</span><span></span></div>' + row(t.me) : ''}</div><p class="sm mut">Мест в таблице: ${t.total}. Пока у игры нет сервера, соперники в таблице — боты.</p></section>`;
}
function sqTabsH() {
  return `<div class="sqtab">${G.squads.map((s, i) => { const inf = squadInfo(s.map(id => id == null ? null : { c: CARDS[id], lv: G.cards[id].lv })); return `<button data-act="sq" data-v="${i}" aria-pressed="${G.sqi === i}"><span>Пятёрка ${i + 1}</span><b>${inf ? inf.rating.toFixed(1) : '—'}</b><span>${inf ? 'химия ' + inf.chem + (G.capts[i] != null ? ' · капитан' : ' · без капитана') : 'не собрана'}</span></button>`; }).join('')}</div>`;
}
function vPlay() {
  const info = squadInfo(squadOf(G)), cs = captSlot(G), h = G.season.hist;
  return `<section class="plain"><h3>Состав на матч</h3>${sqTabsH()}<p class="sm mut">${info ? (cs >= 0 ? `Капитан: ${esc(CARDS[G.squad[cs]].nick)}. Он даёт разведку и стартовый импульс 3.` : 'Капитан не назначен: нет разведки, стартовый импульс 2.') : 'В этой пятёрке есть пустые слоты.'}</p>
  ${info ? '<button class="btn pri go" data-act="fight">Играть</button>' : '<button class="btn go" data-act="goSquad">Соберите пятёрку</button>'}<p class="sm mut">Рейтинговый матч до 13 побед. Победа: +40 монет и +25 кубков, с разницей больше 5 раундов +30. Поражение: +10 монет и −25 кубков, при 0:13 −30.</p></section>
  ${G.tut === 3 ? lbH() + `<section class="pn"><h3>Сезон «${monthName(G.season.m)}»</h3><p class="sm mut">Сезон длится месяц. В конце выдаются монеты и кейсы по лиге, а часть кубков сбрасывается: чем выше лига, тем больше.</p>${h.length ? '<div class="list">' + h.slice(0, 3).map(x => `<div class="prow" style="--rc:${LCOL[x.lg]}"><span>${rankH(x.lg)}</span><span><b>${monthName(x.m)}</b><span class="sm mut" style="display:block">лига «${LEAGUES[x.lg][0]}», ${x.tro} кубков</span></span><span class="num">#${x.place}</span></div>`).join('') + '</div>' : '<p class="sm mut">Завершённых сезонов пока нет.</p>'}</section>` : ''}`;
}

/* ---------- Кейсы ---------- */
function vPacks() {
  const inv = Object.keys(PACKS).filter(k => G.packs[k] > 0);
  return `${dailyReady(G, now()) ? `<section class="pn"><div class="shop">${pkH('basic')}<div class="plain"><h3>Бесплатный кейс</h3><button class="btn pri" data-act="daily">Забрать</button></div></div></section>` : ''}
  ${inv.length ? `<section class="plain"><h3>Ваши кейсы</h3>${inv.map(k => `<div class="pn"><div class="shop">${pkH(k)}<div class="plain"><h2>${PACKS[k].n} <span class="num mut" style="font-size:15px">×${G.packs[k]}</span></h2><button class="btn pri" data-act="open" data-v="${k}">Открыть</button></div></div></div>`).join('')}</section>` : ''}
  <section class="plain"><h3>Магазин</h3>${Object.keys(PACKS).map(k => { const P = PACKS[k]; return `<div class="pn"><div class="shop">${pkH(k)}<div class="plain"><h2>${P.n}</h2><p class="sm mut">${P.d}</p><div class="pill" style="align-self:flex-start"><i class="coin"></i>${nf(P.price)}</div></div></div><div class="odds">${P.odds.map((o, i) => `<span style="--rc:var(--r${i})">${o}%</span>`).join('')}</div><button class="btn" data-act="buy" data-v="${k}" ${G.coins < P.price ? 'disabled' : ''}>${G.coins < P.price ? 'Не хватает монет' : 'Купить и открыть'}</button></div>`; }).join('')}</section>
  <p class="sm mut">В кейсе пять карточек. Проценты показывают шанс редкости каждой из них: ${RAR.map(x => x.toLowerCase()).join(', ')}. Внутри редкости реже выпадают игроки с высоким рейтингом и из команд выше в таблице. С шансом 7% вместо обычной версии выпадает «${SPN[1]}» (+3 к рейтингу), с шансом 12% вместо высшей редкости выпадает «${SPN[2]}».</p>`;
}

/* ---------- Коллекция: карточки, составы, контракты ---------- */
function colList() {
  const q = F.q.trim().toLowerCase();
  const l = ALL.filter(c => (F.rar === 'all' || c.rar === +F.rar) && (F.role === 'all' || c.role === +F.role) && (F.team === 'all' || c.team === F.team)
    && (F.own === 'all' || (F.own === 'mine' ? own(c.id) : F.own === 'sp' ? c.sp : F.own === 'hist' ? c.hist : !own(c.id))) && (!q || c.nick.toLowerCase().includes(q)));
  const lv = c => own(c.id) ? own(c.id).lv : 0;
  return F.sort === 'lv' ? l.sort((a, b) => lv(b) - lv(a) || b.ovr - a.ovr) : F.sort === 'low' ? l.slice().reverse() : l;
}
function colGrid() {
  const l = colList();
  return `<p class="sm mut">Найдено: ${l.length}</p><div class="grid">${l.slice(0, colN).map(c => `<button data-act="card" data-id="${c.id}" aria-label="${esc(c.nick)}">${ownH(c.id)}</button>`).join('')}</div>${l.length > colN ? '<button class="btn" data-act="more">Показать ещё</button>' : ''}`;
}
const selH = (k, opts, label) => `<select data-f="${k}" aria-label="${label}">${opts.map(([v, n]) => `<option value="${esc(v)}" ${String(F[k]) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
function vCards() {
  const have = Object.keys(G.cards).length, teams = [...new Set(ALL.map(c => c.team))].sort((a, b) => a.localeCompare(b));
  return `<section class="pn"><div class="kv"><span>Собрано</span><span><b>${have}</b> из ${ALL.length}</span></div><span class="bar"><i style="width:${have / ALL.length * 100}%"></i></span></section>
  <input type="text" id="col-q" placeholder="Поиск по нику" value="${esc(F.q)}" aria-label="Поиск по нику">
  <div class="frow">${selH('rar', [['all', 'Любая редкость']].concat(RAR.map((n, i) => [i, n])), 'Редкость')}${selH('role', [['all', 'Любая роль и способность']].concat(RNAME.map((n, i) => [i, n + ' — «' + AB_BASE[i].n + '»'])), 'Роль и способность')}${selH('team', [['all', 'Любая команда']].concat(teams.map(t => [t, t])), 'Команда')}${selH('sort', [['ovr', 'Сначала сильные'], ['low', 'Сначала слабые'], ['lv', 'По уровню прокачки']], 'Сортировка')}</div>
  ${segH('fown', F.own, [['all', 'Все'], ['mine', 'Мои'], ['none', 'Нет'], ['sp', 'Особые'], ['hist', 'Архив']])}
  <div class="plain" id="col-grid">${colGrid()}</div>`;
}
function vSquads() {
  const sq = squadOf(G), info = squadInfo(sq), rec = bestCapt(G), cap = G.capts[G.sqi], igls = G.squad.filter(id => id != null && CARDS[id].role === 4);
  const mates = id => G.squad.filter(x => x != null && x !== id && CARDS[x].team === CARDS[id].team).length;
  return `${sqTabsH()}
  ${info ? `<div class="stats"><div class="stat"><b>${info.rating.toFixed(1)}</b><span>рейтинг</span></div><div class="stat"><b>${info.atk.toFixed(1)}</b><span>сила в атаке</span></div><div class="stat"><b>${info.def.toFixed(1)}</b><span>сила в защите</span></div></div>` : '<div class="note">В пятёрке есть пустые слоты. Заполните их, чтобы играть.</div>'}
  <section class="plain">${G.squad.map((id, i) => { if (id == null) return `<button class="slot empty" data-act="slot" data-v="${i}"><span><div class="ph0">+</div></span><span><span class="eyebrow">${RNAME[i]}</span><b style="display:block;font:600 17px/1.2 var(--f-d);text-transform:uppercase">Слот пуст</b></span><span class="sm mut">Выбрать</span></button>`;
    const c = CARDS[id], off = c.role !== i, m = mates(id); return `<button class="slot" data-act="slot" data-v="${i}"><span>${ownH(id, 'xs')}</span><span style="min-width:0"><span class="eyebrow">${RNAME[i]}</span><b style="display:block;font:600 19px/1.1 var(--f-d);text-transform:uppercase;overflow-wrap:anywhere">${esc(c.nick)} ${cap === id ? '<span class="cap">капитан</span>' : ''}</b><span class="sm mut">${esc(c.team)} · ${m ? 'партнёров по команде: ' + m : 'без партнёров по команде'}</span><span class="${off ? 'warn' : 'sm mut'}" style="display:block">${off ? 'Не своя роль: −5 ко всем показателям, способности отключены' : '«' + AB_BASE[c.role].n + '» и «' + indOf(c).n + '»'}</span></span><span class="sm mut">Сменить</span></button>`; }).join('')}</section>
  <section class="pn"><h3>Капитан</h3><p class="sm mut">Капитаном может быть только игрок с естественной ролью «Капитан». Он даёт разведку, усиливает «Тайм-аут» и добавляет стартовый импульс.</p>${igls.length ? '<div class="list">' + igls.map(id => `<div class="prow" style="--rc:${glow(CARDS[id])}"><span class="o">${CARDS[id].st.igl + own(id).lv - 1}</span><span><b>${esc(CARDS[id].nick)}</b>${id === rec ? ' <span class="sm" style="color:var(--good)">рекомендуем</span>' : ''}<span class="sm mut" style="display:block">тактика · ${esc(CARDS[id].team)}</span></span>${cap === id ? '<span class="cap">капитан</span>' : `<button class="btn s" data-act="capt" data-id="${id}">Назначить</button>`}</div>`).join('') + '</div>' : '<p class="warn">В пятёрке нет игрока с ролью «Капитан».</p>'}${cap != null ? '<button class="btn s" data-act="capt" data-id="">Играть без капитана</button>' : ''}</section>
  ${info ? `<section class="pn"><h3>Химия ${info.chem} из 13</h3><p class="sm mut">Игроков из одной команды: ${info.mx}. Два дают +2, три +4, четыре +7, пять +10. ${info.onRole ? 'Все на своих ролях: +3.' : 'Если все пятеро на своих ролях, добавится ещё +3.'} Каждые 4 очка химии дают +1 к силе состава. Химия не растёт от числа матчей.</p></section>` : ''}
  <button class="btn" data-act="auto">Собрать лучший состав</button>
  <section class="pn"><h3>Тактические приказы</h3>${DECK.map(k => `<p class="sm"><b>${AC[k].n}</b> <span class="num mut">${AC[k].cost}</span> <span class="mut">— ${AC[k].d}</span></p>`).join('')}</section>`;
}
function vTu() {
  const inf = tuInfo(G, tuSel), cnt = id => tuSel.filter(x => x === id).length;
  const l = Object.keys(G.cards).map(id => CARDS[id]).filter(c => !c.sp && c.rar === tuRar).sort((a, b) => a.ovr - b.ovr);
  const risky = [...new Set(tuSel)].filter(id => own(id) && cnt(id) >= own(id).n && inSquads(G, id));
  return `<section class="pn"><h3>Контракт</h3><p class="sm mut">Десять обычных карточек одной редкости обмениваются на одну. Выпадет либо карточка следующей редкости, либо карточка той же редкости с рейтингом не ниже среднего по вложенным. Чем выше средний рейтинг, тем вероятнее следующая редкость.</p>
  ${segH('turar', String(tuRar), RAR.map((n, i) => [String(i), n.slice(0, 5) + (n.length > 5 ? '.' : '')]))}
  <div class="kv"><span>Выбрано</span><span><b>${tuSel.length}</b> из 10</span></div><span class="bar"><i style="width:${tuSel.length * 10}%"></i></span>
  ${tuSel.length ? `<div class="grid g5">${tuSel.map(id => cardH(CARDS[id], { cls: 'xs' })).join('')}</div>` : ''}
  ${inf.avg ? `<p class="sm">Средний рейтинг: <b class="num">${inf.avg.toFixed(1)}</b>${inf.up ? ` · следующая редкость: примерно <b>${inf.up}</b> · та же редкость сильнее: примерно <b>${inf.same}</b>` : ''}</p>` : ''}
  ${inf.why ? `<p class="${tuRar === 4 ? 'warn' : 'sm mut'}">${inf.why}</p>` : ''}${risky.length ? `<p class="warn">В контракт уйдёт последняя копия игрока из состава: ${risky.map(id => esc(CARDS[id].nick)).join(', ')}.</p>` : ''}
  <div class="rowb"><button class="btn s" data-act="tuFill" ${tuRar === 4 ? 'disabled' : ''}>Добавить слабейшие дубликаты</button><button class="btn s" data-act="tuClear" ${tuSel.length ? '' : 'disabled'}>Очистить</button></div>
  <button class="btn pri" data-act="tuGo" ${inf.ok ? '' : 'disabled'}>Исполнить контракт — отменить нельзя</button></section>
  <section class="list">${l.length ? l.map(c => { const o = own(c.id), n = cnt(c.id); return `<div class="tu-row"><span class="num" style="font-weight:700;color:${glow(c)}">${c.ovr}</span><span style="min-width:0"><b>${esc(c.nick)}</b><span class="sm mut" style="display:block">${RN[c.role]} · ${esc(c.team)} · копий ${o.n}${o.lv > 1 ? ' · ур. ' + o.lv : ''}</span></span><span class="cnt-b"><button data-act="tuDel" data-id="${c.id}" ${n ? '' : 'disabled'} aria-label="Убрать">−</button><span class="num">${n}</span><button data-act="tuAdd" data-id="${c.id}" ${n < o.n && tuSel.length < 10 ? '' : 'disabled'} aria-label="Добавить">+</button></span></div>`; }).join('') : '<p class="sm mut">Обычных карточек этой редкости у вас нет.</p>'}</section>`;
}
function vCol() {
  const body = sub === 'squads' ? vSquads() : sub === 'tu' ? vTu() : vCards();
  return `${segH('sub', sub, [['cards', 'Карточки'], ['squads', 'Составы'], ['tu', 'Контракты']])}${body}`;
}

/* ---------- Профиль ---------- */
function vProf() {
  const lg = leagueOf(G.tro), fr = G.frame, h = G.season.hist, n = G.w + G.l;
  return `<section class="pn" style="${fr >= 0 ? `box-shadow:inset 0 0 0 2px ${LCOL[fr]}` : ''}"><div class="kv"><span>Профиль</span><span>${fr >= 0 ? `рамка сезона: «${LEAGUES[fr][0]}»` : 'рамка сезона появится после первого сезона'}</span></div>
  <div class="stats"><div class="stat"><b>${G.lvl}</b><span>уровень</span></div><div class="stat"><b>${G.tro}</b><span>кубки, лучший ${G.best}</span></div><div class="stat"><b>${n ? Math.round(G.w / n * 100) + '%' : '—'}</b><span>побед: ${G.w} из ${n}</span></div></div></section>
  <section class="pn"><h3>История сезонов</h3>${h.length ? '<div class="list">' + h.map(x => `<div class="prow" style="--rc:${LCOL[x.lg]}"><span>${rankH(x.lg)}</span><span><b>${monthName(x.m)}</b><span class="sm mut" style="display:block">лига «${LEAGUES[x.lg][0]}», ${x.tro} кубков</span></span><span class="num">#${x.place}</span></div>`).join('') + '</div>' : '<p class="sm mut">Завершённых сезонов пока нет. Текущий: «' + monthName(G.season.m) + '».</p>'}</section>
  <section class="pn"><h3>Звук</h3>${segH('snd', snd, [['off', 'Выключен'], ['min', 'Минимум'], ['full', 'Полный']])}<p class="sm mut">Минимум — только сигналы кейсов и итогов раунда. Полный добавляет щелчки, сканер и выстрелы.</p></section>
  <section class="pn"><h3>Об игре</h3><p class="sm mut">Составы команд взяты из рейтинга Valve от 2 ноября 2026. Показатели карточек пока рассчитаны игрой, это не статистика HLTV. Фото игроков берутся из папки photos рядом с файлом игры: имя файла — ник маленькими буквами, например zywoo.png. Прогресс хранится в этом браузере.</p>
  ${askNew ? '<p class="sm">Коллекция и прогресс будут удалены, копия сохранения останется в памяти браузера. Начать заново?</p><div class="rowb"><button class="btn dan s" data-act="newYes">Да, начать заново</button><button class="btn s" data-act="newNo">Отмена</button></div>' : '<button class="btn s" data-act="newAsk">Начать заново</button>'}</section>`;
}

/* ---------- Нижний лист: карточка, выбор в слот, сравнение ---------- */
function abH(c, lv) {
  const pw = Math.round(abPow(c, lv) * 100), ipw = Math.round(indPow(c, lv) * 100), i = indOf(c);
  const source = c.hltv ? `HLTV · ${c.hltv.last12m.maps} карт за 12 мес. · обновлено ${c.hltv.snapshotDate}` : 'Предварительные характеристики: статистика HLTV ещё не подключена.';
  return `<p class="sm mut" style="margin:0 0 8px">${source}</p><div class="ab" style="--rc:${glow(c)}"><b>${AB_BASE[c.role].n} <span class="num mut" style="font-size:12px">${pw}%</span></b>${AB_BASE[c.role].d} Работает только на роли «${RNAME[c.role]}».</div><div class="ab"><b>${i.n} <span class="num mut" style="font-size:12px">${ipw}%</span></b>${i.d}${IND[c.nick] ? '' : ' Индивидуальная способность появится после загрузки статистики HLTV.'}</div>`;
}
function vSheet() {
  if (!sheet) return '';
  if (sheet.t === 'slot') {
    const i = sheet.slot, used = new Set(G.squad.filter((x, k) => k !== i && x != null).map(id => CARDS[id].nick));
    const l = Object.keys(G.cards).map(id => CARDS[id]).filter(c => !used.has(c.nick)).sort((a, b) => (b.role === i) - (a.role === i) || (b.ovr + own(b.id).lv) - (a.ovr + own(a.id).lv)).slice(0, 60);
    return `<div class="in"><div class="wrap col"><h2>${RNAME[i]}: кого поставить</h2><p class="sm mut">Сначала показаны игроки этой роли. Чужая роль даёт −5 ко всем показателям и отключает способности.</p><div class="list">${l.map(c => `<button class="prow" style="--rc:${glow(c)}" data-act="put" data-id="${c.id}" data-v="${i}"><span class="o" style="color:${glow(c)}">${c.ovr + own(c.id).lv - 1 - (c.role === i ? 0 : 5)}</span><span style="min-width:0"><b>${esc(c.nick)}</b>${c.sp ? ` <span class="sm" style="color:${glow(c)}">${SPN[c.sp]}</span>` : ''}${c.hist ? ' <span class="sm mut">архив</span>' : ''}<span class="sm mut" style="display:block">${RN[c.role]} · ${esc(c.team)}</span></span><span class="sm mut">${G.squad[i] === c.id ? 'в составе' : ''}</span></button>`).join('')}</div><button class="btn" data-act="close">Закрыть</button></div></div>`;
  }
  if (sheet.t === 'cmpPick') {
    const a = CARDS[sheet.id], q = (sheet.q || '').toLowerCase(), l = ALL.filter(c => c.id !== a.id && (!q || c.nick.toLowerCase().includes(q))).sort((x, y) => !!own(y.id) - !!own(x.id) || (y.role === a.role) - (x.role === a.role) || y.ovr - x.ovr).slice(0, 40);
    return `<div class="in"><div class="wrap col"><h2>С кем сравнить ${esc(a.nick)}</h2><input type="text" id="cmp-q" placeholder="Поиск по нику" value="${esc(sheet.q || '')}" aria-label="Поиск по нику"><div class="list" id="cmp-list">${l.map(c => `<button class="prow" style="--rc:${glow(c)}" data-act="cmp" data-id="${c.id}"><span class="o" style="color:${glow(c)}">${c.ovr + (own(c.id) ? own(c.id).lv - 1 : 0)}</span><span style="min-width:0"><b>${esc(c.nick)}</b>${c.sp ? ` <span class="sm" style="color:${glow(c)}">${SPN[c.sp]}</span>` : ''}<span class="sm mut" style="display:block">${RN[c.role]} · ${esc(c.team)}</span></span><span class="sm mut">${own(c.id) ? 'есть' : ''}</span></button>`).join('')}</div><button class="btn" data-act="card" data-id="${a.id}">Назад</button></div></div>`;
  }
  if (sheet.t === 'cmp') {
    const A = CARDS[sheet.a], B = CARDS[sheet.b], la = own(A.id) ? own(A.id).lv : 1, lb = own(B.id) ? own(B.id).lv : 1;
    const row = (k, x, y) => `<span class="v ${x > y ? 'hi' : ''}">${x}</span><span class="k">${k}</span><span class="v ${y > x ? 'hi' : ''}">${y}</span>`;
    return `<div class="in"><div class="wrap col"><h2>Сравнение</h2><div class="cmp2"><div>${cardH(A, { lv: la, pips: true })}</div><div>${cardH(B, { lv: lb, pips: true })}</div></div>
    <div class="cmp">${row('Рейтинг', A.ovr + la - 1, B.ovr + lb - 1)}${SK.map(k => row(SN[k], A.st[k] + la - 1, B.st[k] + lb - 1)).join('')}${row('Сила способностей, %', Math.round(abPow(A, la) * 100), Math.round(abPow(B, lb) * 100))}</div>
    <div class="cmp2"><div class="plain"><p class="eyebrow">${RNAME[A.role]}</p>${abH(A, la)}</div><div class="plain"><p class="eyebrow">${RNAME[B.role]}</p>${abH(B, lb)}</div></div>
    <p class="sm mut">Показатели учитывают уровень прокачки ваших копий.</p><div class="rowb"><button class="btn s" data-act="cmpPick" data-id="${A.id}">Другой игрок</button><button class="btn s" data-act="close">Закрыть</button></div></div></div>`;
  }
  const c = CARDS[sheet.id], o = own(c.id), lv = o ? o.lv : 1, add = lv - 1;
  let act = '';
  if (o) {
    if (o.lv < 5) { const need = UP_N[o.lv - 1], cost = upCost(c, o.lv); act += `<div class="ab"><b>Уровень ${o.lv} → ${o.lv + 1}</b>Рейтинг ${c.ovr + add} → ${c.ovr + add + 1}, все шесть показателей +1, сила способностей ${Math.round(abPow(c, o.lv) * 100)}% → ${Math.round(abPow(c, o.lv + 1) * 100)}%.${o.lv === 4 ? ' На пятом уровне карточка получает золотое оформление.' : ''}</div><button class="btn pri" data-act="up" data-id="${c.id}" ${canUp(G, c.id) ? '' : 'disabled'}>Улучшить: ${need} дубл. и ${nf(cost)} мон.</button><p class="sm mut">Дубликатов: ${o.n - 1}.</p>`; }
    else act += '<p class="sm" style="color:var(--gold)">Максимальный уровень.</p>';
    const last = o.n === 1, price = priceOf(c, last ? o.lv : 1);
    act += askSell === c.id ? `<p class="warn">Это последняя копия${c.sp ? ' особой версии' : ''}${inSquads(G, c.id) ? ', игрок стоит в составе — слот освободится' : ''}. Прокачка пропадёт. Продать за ${nf(price)} монет?</p><div class="rowb"><button class="btn dan s" data-act="sellYes" data-id="${c.id}">Да, продать</button><button class="btn s" data-act="sellNo">Отмена</button></div>` : `<button class="btn s" data-act="sell" data-id="${c.id}">${last ? 'Продать последнюю копию' : 'Продать дубликат'} за ${nf(price)}</button>`;
    if (!G.squad.includes(c.id)) act += `<button class="btn" data-act="put" data-id="${c.id}" data-v="${c.role}">Поставить в пятёрку ${G.sqi + 1} на роль «${RNAME[c.role]}»</button>`;
  } else act = '<p class="sm mut">Этой карточки у вас пока нет. Она выпадает из кейсов.</p>';
  const pic = `<div class="rowb"><label class="btn s" for="img-in" tabindex="0">${IMG[c.base] ? 'Заменить фото' : 'Добавить фото'}</label>${IMG[c.base] ? `<button class="btn s" data-act="imgDel" data-id="${c.base}">Убрать фото</button>` : ''}</div><input type="file" id="img-in" accept="image/*" data-base="${c.base}" hidden><p class="sm mut">${imgMsg || `Фото хранится в этом браузере. Чтобы оно было у всех, положите файл ${esc(slug(c.nick))}.png в папку photos.`}</p>`;
  return `<div class="in"><div class="wrap col"><div class="insp"><div class="tilt">${cardH(c, { lv, pips: !!o, stats: true })}</div></div><div class="plain" style="text-align:center;gap:4px"><p class="eyebrow" style="color:${glow(c)}">${rarName(c)}${c.hist ? ' · архивная версия' : ''}</p><h2 style="overflow-wrap:anywhere">${esc(c.nick)}</h2><p class="sm mut">${RNAME[c.role]} · ${esc(c.team)} · ${o ? 'копий ' + o.n + ', уровень ' + o.lv : 'нет в коллекции'}</p></div>
  <div class="plain" style="--rc:${glow(c)}">${SK.map(k => `<div class="attr"><span class="mut">${SN[k]}</span><span class="bar"><i style="width:${c.st[k] + add}%"></i></span><b>${c.st[k] + add}</b></div>`).join('')}</div>
  ${abH(c, lv)}${act}<button class="btn s" data-act="cmpPick" data-id="${c.id}">Сравнить с другой карточкой</button>${pic}<button class="btn" data-act="close">Закрыть</button></div></div>`;
}

/* ---------- Сцена за интерфейсом ---------- */
function buildScene() {
  const mk = (seed, far) => {
    let s = seed, p = '', w2 = ''; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
    for (let d = 0; d < 4; d++) {
      let x = d * 500 - 20; const end = d * 500 + 500;
      while (x < end) {
        const w = 34 + r() * 70, h = (far ? 110 : 46) + r() * (far ? 150 : 110), y = 300 - h;
        if (d === 0) { p += `M${x} 300V${y}h${w}V300z`; if (r() < .4) p += `M${x + w * .2} ${y}a${w * .3} ${w * .3} 0 0 1 ${w * .6} 0z`; if (!far && r() < .6) w2 += `M${x + w * .3} ${y + 14}h${w * .16}v${w * .3}h-${w * .16}z`; }
        else if (d === 1) { const n = 1 + Math.floor(r() * (far ? 5 : 3)); for (let k = 0; k < n; k++) p += `M${x + k % 2 * 8} ${300 - k * 34}v-32h${w + 24}v32z`; if (r() < .22) p += `M${x + 10} 300V${30 + r() * 40}h6V300zM${x - 50} 46h140v6h-140z`; x += 26; }
        else if (d === 2) { p += `M${x} 300V${y + w / 2}a${w / 2} ${w / 2} 0 0 1 ${w} 0V300z`; if (r() < .5) p += `M${x + w - 2} ${y + 70}h46v9h-46z`; }
        else { p += `M${x} 300V${y}h${w}V300z`; if (r() < .5) { const a = 30 + r() * 60; p += `M${x + w / 2 - 2} ${y}v-${a}h4v${a}z`; } if (!far && r() < .5) w2 += `M${x + 8} ${y + 10}h${w - 16}v4h-${w - 16}z`; }
        x += w + 4 + r() * 22;
      }
    }
    return `<svg viewBox="0 0 2000 300" preserveAspectRatio="none" aria-hidden="true"><path d="${p}" fill="${far ? '#232a33' : '#0a0c0f'}"/><path d="${w2}" fill="#f0a93a" opacity=".5"/></svg>`;
  };
  $('#pan-far').innerHTML = mk(7, true); $('#pan-near').innerHTML = mk(31, false);
  let d = ''; for (let i = 0; i < 10; i++) d += `<i style="left:${ri(0, 100)}%;top:${ri(40, 100)}%;--dx:${ri(-60, 60)}px;animation-duration:${ri(9, 20)}s;animation-delay:-${ri(0, 18)}s"></i>`;
  $('#dust').innerHTML = d;
}
function sceneTo(t) {
  const i = Math.max(0, Object.keys(TABS).indexOf(t));
  $('#scene').dataset.s = { home: 'home', play: 'squad', col: 'col', packs: 'packs', prof: 'home' }[t]; $('#pan-near').style.transform = `translate3d(${-i * 18.75}%,0,0)`; $('#pan-far').style.transform = `translate3d(${-i * 12.5}%,0,0)`;
}

/* ---------- Частицы и вспышка ---------- */
let FX = [], fxOn = false;
function burst(col, n, el) {
  const cv = $('#fx'); if (!cv || !el || !n || noMotion()) return;
  const b = el.getBoundingClientRect(); cv.width = innerWidth; cv.height = innerHeight;
  for (let i = 0; i < n; i++) { const a = R() * 6.283, s = rnd(2, 12); FX.push({ x: b.left + b.width / 2, y: b.top + b.height / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, l: rnd(.6, 1.4), t: 0, c: R() < .25 ? '#ffffff' : col, z: rnd(2, 5) }); }
  if (!fxOn) { fxOn = true; requestAnimationFrame(fxLoop); }
}
function fxLoop() {
  const cv = $('#fx'); if (!cv) { FX = []; fxOn = false; return; }
  const c = cv.getContext('2d'); c.clearRect(0, 0, cv.width, cv.height);
  FX = FX.filter(p => p.t < p.l);
  for (const p of FX) { p.t += 1 / 60; p.x += p.vx; p.y += p.vy; p.vy += .25; p.vx *= .985; c.globalAlpha = 1 - p.t / p.l; c.fillStyle = p.c; c.fillRect(p.x, p.y, p.z, p.z * 1.6); }
  c.globalAlpha = 1; if (FX.length) requestAnimationFrame(fxLoop); else fxOn = false;
}
function flashNow() { if (noMotion()) return; const f = document.createElement('div'); f.className = 'flash'; $('#over').appendChild(f); setTimeout(() => f.remove(), 600); }
const later = (ms, fn) => { const me = OV; setTimeout(() => { if (OV === me) fn(); }, noMotion() ? Math.min(ms, 150) : ms); };

/* ---------- Открытие кейса: голографический сканер; для редкой карточки — выход на арену ---------- */
const ARENAS = ['Championship Arena', 'Cyber Arena', 'Underground Arena', 'World Finals'];
const isRare = (type, c) => !!c.sp || PACKS[type].odds[c.rar] < 5;
function startPack(type) {
  const cards = openPack(type).map(c => ({ c, isNew: addCard(G, c.id) })).sort((a, b) => (a.c.rar + (a.c.sp ? .5 : 0)) - (b.c.rar + (b.c.sp ? .5 : 0)) || a.c.ovr - b.c.ovr);
  if (G.tut === 0) G.tut = 1;
  OV = { t: 'pack', type, cards, phase: 'case', built: false }; save();
}
function packBuild() {
  const o = $('#over');
  o.innerHTML = `<canvas id="fx"></canvas><div class="po-bg" id="po-bg"></div><div id="arena"></div><div class="wrap po"><p class="eyebrow" id="po-top">Кейс «${PACKS[OV.type].n}» · 5 карточек</p><div class="po-stage" id="po-stage"><button data-act="poTap" class="po-pk" aria-label="Открыть кейс">${pkH(OV.type)}</button></div><div class="po-name" id="po-name"><span class="mut">Выберите способ открытия</span></div><div class="tray" id="tray">${OV.cards.map(() => '<div></div>').join('')}</div><div class="rowb" id="po-btn" style="width:100%;display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn pri" data-act="poAll">Открыть все</button><button class="btn" data-act="poTap">По одной</button></div></div>`;
  o.hidden = false; o.scrollTop = 0; OV.built = true;
}
function poStart(mode) {
  if (!OV || OV.t !== 'pack' || OV.phase !== 'case') return false;
  OV.mode = mode; OV.phase = 'scan'; OV.index = 0;
  const p = $('.po-pk .pk'); sfx('open');
  if (p) { p.classList.add('shake'); setTimeout(() => p.classList.add('open'), noMotion() ? 0 : 420); }
  $('#po-name').innerHTML = '<span class="mut">Кейс открывается…</span>';
  $('#po-btn').innerHTML = '<button class="btn s" data-act="poSkip" style="width:100%">Пропустить анимацию</button>';
  if (mode === 'all') later(700, poRevealAll);
  else later(720, () => scanStep(0));
  return false;
}
function poTap() { return poStart('single'); }
function poAll() { return poStart('all'); }
function poNext() {
  if (!OV || OV.t !== 'pack' || OV.phase !== 'next') return false;
  OV.phase = 'scan'; scanStep(OV.index); return false;
}
function scanStep(i) {
  if (!OV || OV.phase !== 'scan') return;
  $('#po-btn').innerHTML = '<span class="sm mut">Подготовка следующей карточки…</span>';
  if (i >= OV.cards.length) { poDone(); return; }
  const c = OV.cards[i].c, lines = ['РОЛЬ / ' + RNAME[c.role], 'КОМАНДА / ' + c.team, 'РЕЙТИНГ / ' + c.ovr];
  $('#po-bg').style.setProperty('--gl', '#8fa3b8');
  $('#po-stage').innerHTML = `<div class="scan" id="scan" style="--gl:#8fd8ff"><div class="scan-fr"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#sil"/></svg><i class="scan-ln"></i><div class="scan-tx" id="scan-tx"></div></div></div>`;
  $('#po-name').innerHTML = `<span class="mut">Сканирование ${i + 1} из ${OV.cards.length}</span>`;
  lines.forEach((t, k) => later(180 + k * 190, () => { if (OV.phase !== 'scan') return; const x = $('#scan-tx'); if (x) { x.insertAdjacentHTML('beforeend', `<span>${esc(t)}</span>`); sfx('scan'); } }));
  const rare = i === OV.cards.length - 1 && isRare(OV.type, c);
  later(950, () => rare ? rareSeq(i) : reveal(i));
}
function trayPut(i) { const t = $('#tray'); if (t && t.children[i]) { t.children[i].className = 'on'; t.children[i].innerHTML = cardH(OV.cards[i].c, { cls: 'xs' }); } }
const nameH = x => `<b style="color:${glow(x.c)}">${esc(x.c.nick)}</b><span class="sm mut">${rarName(x.c)} · ${esc(x.c.team)} · <span class="bdg ${x.isNew ? 'new' : 'dup'}">${x.isNew ? 'новая' : 'дубль'}</span></span>`;
function afterOne(i) {
  trayPut(i); OV.index = i + 1;
  if (OV.index >= OV.cards.length) { later(420, poDone); return; }
  OV.phase = 'next';
  $('#po-btn').innerHTML = `<button class="btn pri" data-act="poNext" style="width:100%">Следующая карточка · ${OV.index + 1} из 5</button><button class="btn s" data-act="poSkip" style="width:100%;margin-top:6px">Показать остальные</button>`;
  $('#po-name').innerHTML += '<span class="sm mut">Нажмите, когда будете готовы</span>';
}
function reveal(i) {
  if (OV.phase !== 'scan') return;
  const x = OV.cards[i], r = x.c.sp ? Math.max(3, x.c.rar) : x.c.rar;
  $('#po-stage').innerHTML = `<div class="scan out" id="scan" style="--gl:${glow(x.c)}">${cardH(x.c, { stats: true })}</div>`;
  $('#po-bg').style.setProperty('--gl', glow(x.c)); $('#po-name').innerHTML = nameH(x);
  sfx('stop', r); burst(glow(x.c), [8, 14, 30, 70, 120][r], $('#scan')); if (r >= 3) flashNow();
  later(1050, () => { if (OV && OV.phase === 'scan') afterOne(i); });
}
function actorH(c) {
  const kind = c.role === 4 ? 'igl' : c.role === 0 ? 'awp' : 'rifle';
  const weapon = kind === 'igl'
    ? '<g class="prop"><path d="M126 174l44-8 8 66-44 8z" fill="#c9a66b" stroke="#33271c" stroke-width="5"/><path d="M134 185l32-6M137 198l30-6M140 211l30-6" stroke="#55422e" stroke-width="3"/><path d="M130 174l-8-12 44-8 7 12" fill="#e6d3a7" stroke="#33271c" stroke-width="4"/></g>'
    : kind === 'awp'
      ? '<g class="prop"><path d="M104 164l100-7 4 9-103 10z" fill="#252b30" stroke="#090b0d" stroke-width="4"/><path d="M160 160l4-17 25 0 3 17" fill="#3d4548" stroke="#090b0d" stroke-width="4"/><path d="M108 171l-7 24 22 2 9-25" fill="#6c5032" stroke="#090b0d" stroke-width="4"/><path d="M194 163l25-2" stroke="#aab3b8" stroke-width="3"/><path class="muzzle-flash" d="M219 159l12-8-4 10 9 5-14 0-6 7 1-9-8-3z" fill="#fff3b0"/></g>'
      : '<g class="prop"><path d="M103 164l84-5 4 9-86 10z" fill="#283238" stroke="#090b0d" stroke-width="4"/><path d="M150 168l-3 27 13 3 8-27" fill="#795532" stroke="#090b0d" stroke-width="4"/><path d="M182 164l22-1 8 6-25 3" fill="#795532" stroke="#090b0d" stroke-width="4"/><path d="M120 164l-3-12 27-2 6 13" fill="#4b5558" stroke="#090b0d" stroke-width="3"/></g>';
  return `<svg viewBox="0 0 240 340" role="img" aria-label="${kind === 'igl' ? 'Тактический капитан с блокнотом' : kind === 'awp' ? 'Снайпер с AWP' : 'Штурмовик с автоматом'}">
    <defs><linearGradient id="suit" x2="1" y2="1"><stop stop-color="#68716d"/><stop offset=".5" stop-color="#303b39"/><stop offset="1" stop-color="#151c1c"/></linearGradient><linearGradient id="vest" x2="0" y2="1"><stop stop-color="#8b7956"/><stop offset="1" stop-color="#35372d"/></linearGradient></defs>
    <ellipse cx="120" cy="326" rx="76" ry="10" fill="#000" opacity=".55"/>
    <g class="actor-body"><path d="M88 224l-8 93 28 0 16-75 12 75 30 0-8-98" fill="#202729" stroke="#111719" stroke-width="7"/><path d="M81 309l-2 20 38 0 5-11-21-9M151 309l-1 20 40 0-1-12-24-9" fill="#101619" stroke="#07090a" stroke-width="5"/>
    <path d="M82 116q38-28 77 0l24 106q-55 31-113 0z" fill="url(#suit)" stroke="#111719" stroke-width="7"/><path d="M91 132l28 10 28-10 20 86q-42 20-84 0z" fill="url(#vest)" stroke="#252a25" stroke-width="5"/><path d="M101 153h43v17h-43zM98 181h50v18H98z" fill="#252d2b" stroke="#9c8a60" stroke-width="3"/><path d="M115 111l2-20h25l4 21" fill="#9a775d" stroke="#1a1d1c" stroke-width="5"/>
    <path d="M105 44q14-21 34 0l12 43-12 29h-34l-12-29z" fill="#c4a187" stroke="#111719" stroke-width="6"/><path d="M92 77q24-24 56 0l-5 28q-23 17-46 0z" fill="#1a2223"/><path d="M98 84h44l-4 12h-36z" fill="#77817c"/><path d="M91 54q-4-34 27-39 35 1 35 38l-12-12-40 2z" fill="#303a38" stroke="#111719" stroke-width="6"/><path d="M104 45h37" stroke="#a9b09d" stroke-width="4"/>
    <path d="M83 128q-20 17-25 54l18 11 31-51M158 126q25 11 31 37l-19 15-28-34" fill="none" stroke="#303b39" stroke-width="20" stroke-linecap="round"/><path d="M59 180l-12 18 18 13 17-20M183 164l20 13-8 19-19-10" fill="#b28c6f" stroke="#111719" stroke-width="5"/>
    ${weapon}
    <path d="M83 229q39 19 88-1" fill="none" stroke="#c0a06b" stroke-width="5"/><path d="M105 218l-4 20 17 4 5-22M137 219l2 21 18-3-4-20" fill="#202a29" stroke="#111" stroke-width="3"/></g>
  </svg>`;
}
function walkSceneH(x) {
  const c=x.c, kind=c.role===4?'igl':c.role===0?'awp':'rifle';
  return `<div class="walk-scene"><div class="walk-card">${cardH(c,{stats:true})}</div><div class="operator op-${kind}">${actorH(c)}</div><div class="walk-caption">${kind==='igl'?'КАПИТАН · ТАКТИЧЕСКИЙ РАЗБОР':kind==='awp'?'СНАЙПЕР · КОНТРОЛЬ ДИСТАНЦИИ':'БОЕЦ · ПРОВЕРКА ПОЗИЦИЙ'}</div></div>`;
}

/* ---------- 3D-презентация редкой карточки в открытии кейса ---------- */
let CASE3D_RUN = 0;
async function showCase3D(x, showAll = false) {
  const token = ++CASE3D_RUN, c = x.c, stage = $('#po-stage');
  if (!stage || c.ovr < 87) return false;
  const allHtml = showAll ? `<div class="case3d-all">${OV.cards.map((v,i)=>`<div class="case3d-mini">${cardH(v.c,{cls:'xs'})}<span>${esc(v.c.nick)}</span></div>`).join('')}</div>` : '';
  stage.innerHTML = `<div class="case3d-wrap" style="position:relative;width:100%;height:${showAll?'min(54vh,430px)':'min(58vh,470px)'};min-height:300px;overflow:hidden;border-radius:14px;background:radial-gradient(ellipse at 50% 75%,#263544 0,#111923 48%,#070b11 100%);isolation:isolate">
    <canvas id="case3d-canvas" style="position:absolute;inset:0;width:100%;height:100%;display:block"></canvas>
    <div style="position:absolute;z-index:2;left:16px;top:15px;pointer-events:none;text-shadow:0 2px 12px #000">
      <div style="font:700 10px/1.2 var(--f-m);letter-spacing:.2em;color:#d8b16d">FIVE LEGENDS · ${c.ovr>=91?'ELITE INTRO':'CINEMATIC 3D'}</div>
      <div style="font:700 clamp(18px,4vw,27px)/1.05 var(--f-d);letter-spacing:.05em;color:#f4f1e9;margin-top:5px">${esc(c.nick)}</div>
      <div style="font:600 10px/1.3 var(--f-m);letter-spacing:.12em;color:#aebdca;margin-top:4px">${esc(RNAME[c.role])} · ${esc(c.team)} · OVR ${c.ovr}</div>
    </div>
    ${c.ovr>=91?'<div style="position:absolute;z-index:2;right:14px;top:14px;border:1px solid #d6ad6280;background:#15130dcc;color:#e8c37c;padding:7px 9px;font:700 9px var(--f-m);letter-spacing:.12em">ELITE PLAYER</div>':''}
    ${allHtml}
  </div>`;
  let THREE;
  try { THREE = await import('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js'); }
  catch (err) { if (token === CASE3D_RUN && $('#po-stage')) $('#po-stage').innerHTML = showAll ? `<div class="all-reveal">${walkSceneH(x)}<div class="all-cards">${OV.cards.map((v,i)=>`<div class="all-card" style="--delay:${i*130}ms">${cardH(v.c,{cls:'xs'})}<span>${esc(v.c.nick)}</span></div>`).join('')}</div></div>` : walkSceneH(x); return false; }
  const canvas = $('#case3d-canvas');
  if (token !== CASE3D_RUN || !canvas || !canvas.isConnected) return false;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    renderer.setSize(canvas.clientWidth||stage.clientWidth,canvas.clientHeight||360,false);
    renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.12;
  } catch (err) { if (token === CASE3D_RUN) stage.innerHTML=walkSceneH(x); return false; }
  const scene=new THREE.Scene(); scene.fog=new THREE.FogExp2(0x090e16,.045);
  const camera=new THREE.PerspectiveCamera(34,(canvas.clientWidth||360)/(canvas.clientHeight||360),.1,60);
  camera.position.set(0,2.9,9.8);
  scene.add(new THREE.HemisphereLight(0xa9c4df,0x17131b,1.5));
  const key=new THREE.DirectionalLight(0xffdfb0,3.1); key.position.set(-4,7,5); key.castShadow=true; key.shadow.mapSize.set(1024,1024); scene.add(key);
  const rim=new THREE.SpotLight(0x5598dc,75,22,Math.PI/5,.55,1.2); rim.position.set(5,7,-3); rim.target.position.set(0,1,0); scene.add(rim,rim.target);
  const warm=new THREE.SpotLight(0xffbd68,65,20,Math.PI/5,.6,1.3); warm.position.set(-5,6,2); warm.target.position.set(0,1,0); scene.add(warm,warm.target);
  const mat=(color,rough=.7,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
  const cloth=mat(0x303c43,.9), cloth2=mat(0x46545a,.85), armor=mat(0x151e26,.48,.35), pants=mat(0x202a30,.95), boots=mat(0x0a0e12,.8), skin=mat(0x98745e,.8), visor=mat(0x101c28,.2,.7), gold=mat(0xc39a57,.4,.55), gun=mat(0x11171d,.3,.72), edge=mat(0x52606a,.35,.65);
  const box=new THREE.BoxGeometry(1,1,1), sphere=new THREE.SphereGeometry(1,16,12);
  const root=new THREE.Group(); scene.add(root);
  const mesh=(g,ma,p,s)=>{const o=new THREE.Mesh(g,ma);o.position.set(...p);if(s)o.scale.set(...s);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;};
  const limb=(a,b,r,ma)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A);const o=mesh(new THREE.CylinderGeometry(r*.78,r,v.length(),10),ma,A.clone().add(B).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return o;};
  // Full-body tactical operator built from lit 3D meshes; weapon/prop is role-specific.
  mesh(new THREE.CapsuleGeometry(.34,.62,5,10),cloth,[0,1.55,0],[1.18,1.1,.78]);
  mesh(box,armor,[0,1.55,.34],[.82,.78,.22]);
  mesh(box,cloth2,[0,1.96,0],[.7,.18,.68]);
  mesh(box,gold,[0,1.58,.465],[.13,.2,.025]);
  for(const s of [-1,1]){mesh(sphere,armor,[s*.49,1.9,0],[.36,.25,.37]);mesh(box,cloth2,[s*.48,1.48,.45],[.2,.32,.07]);}
  mesh(box,edge,[0,1.08,.02],[.9,.14,.6]); for(const s of [-1,1])mesh(box,armor,[s*.31,1.02,.31],[.2,.25,.16]);
  mesh(new THREE.CylinderGeometry(.15,.15,.22,12),skin,[0,2.17,0]);
  mesh(new THREE.SphereGeometry(.29,18,14),skin,[0,2.42,0],[1,1.22,.92]);
  mesh(new THREE.SphereGeometry(.34,18,12,0,Math.PI*2,0,Math.PI*.54),armor,[0,2.5,0],[1.08,.83,1]);
  mesh(box,visor,[0,2.45,.255],[.49,.11,.06]); mesh(box,gold,[0,2.72,.12],[.22,.045,.08]);
  mesh(box,armor,[0,1.62,-.43],[.58,.72,.28]);
  for(const s of [-1,1]){limb([s*.22,1.04,0],[s*.25,.49,.02],.16,pants);limb([s*.25,.49,.02],[s*.27,.14,.12],.13,boots);mesh(box,boots,[s*.27,.1,.22],[.32,.18,.52]);}
  const role = c.role===0?'awp':c.role===4?'tablet':c.role===3?'grenade':'rifle';
  limb([-.53,1.92,.02],[-.46,1.58,.48],.14,cloth); limb([-.46,1.58,.48],[-.18,1.55,.58],.1,cloth2);
  limb([.53,1.92,.02],[.48,1.7,.42],.14,cloth); limb([.48,1.7,.42],[.22,1.55,.58],.1,cloth2);
  mesh(sphere,skin,[-.18,1.55,.58],[.12,.12,.12]); mesh(sphere,skin,[.22,1.55,.58],[.12,.12,.12]);
  if(role==='tablet'){
    mesh(box,armor,[.02,1.58,.72],[.58,.78,.08]);mesh(box,gold,[.02,1.58,.77],[.48,.64,.018]);mesh(box,gun,[.02,1.58,.785],[.4,.53,.012]);
    for(let i=0;i<4;i++)mesh(box,gold,[-.12+i*.085,1.72-i*.08,.8],[.23,.012,.008]);
  } else if(role==='grenade'){
    mesh(new THREE.SphereGeometry(.2,16,12),mat(0x68734c,.6),[.22,1.58,.72],[.85,1.15,.85]);mesh(new THREE.CylinderGeometry(.09,.09,.12,10),edge,[.22,1.82,.72]);mesh(box,gold,[.24,1.9,.72],[.25,.07,.1]);
  } else {
    const awp=role==='awp';
    mesh(box,gun,[.02,1.58,.72],[awp?1.65:1.2,.13,.16]);
    mesh(box,edge,[awp?-.4:-.3,1.53,.72],[.35,.2,.18]);
    mesh(box,gun,[.12,awp?1.77:1.69,.72],[awp?.12:.25,awp?.42:.22,.12]);
    mesh(box,gun,[.1,1.84,.72],[awp?.78:.35,.07,.08]);
    mesh(box,cloth2,[-.32,1.43,.72],[.24,.22,.18]);
  }
  const floor= new THREE.Mesh(new THREE.PlaneGeometry(40,40),mat(0x151d26,.9,.12));floor.rotation.x=-Math.PI/2;floor.position.y=-.035;floor.receiveShadow=true;scene.add(floor);
  const disc=new THREE.Mesh(new THREE.CircleGeometry(2.5,64),new THREE.MeshBasicMaterial({color:c.ovr>=91?0xd3a75f:0x4c83ae,transparent:true,opacity:.12,side:THREE.DoubleSide}));disc.rotation.x=-Math.PI/2;disc.position.y=.006;scene.add(disc);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.35,.018,8,96),new THREE.MeshBasicMaterial({color:c.ovr>=91?0xe4bd76:0x79a9d0,transparent:true,opacity:.6}));ring.rotation.x=Math.PI/2;ring.position.y=.015;scene.add(ring);
  if(c.ovr>=91){const aura=new THREE.PointLight(0xd5a75f,3.2,5);aura.position.set(0,2,0);root.add(aura);const halo=new THREE.Mesh(new THREE.TorusGeometry(.95,.02,8,64),new THREE.MeshBasicMaterial({color:0xe4b967,transparent:true,opacity:.45}));halo.rotation.x=Math.PI/2;halo.position.y=.03;scene.add(halo);}
  const particlesN=100, pg=new THREE.BufferGeometry(), pp=new Float32Array(particlesN*3);
  for(let i=0;i<particlesN;i++){pp[i*3]=(Math.random()-.5)*12;pp[i*3+1]=Math.random()*4;pp[i*3+2]=-2-Math.random()*8;}
  pg.setAttribute('position',new THREE.BufferAttribute(pp,3));scene.add(new THREE.Points(pg,new THREE.PointsMaterial({color:0xa9b8c8,size:.07,transparent:true,opacity:.24,depthWrite:false})));
  const start=performance.now(), duration=noMotion()?0:2450, fromZ=-4.8;
  let raf=0,disposed=false;
  const resize=()=>{if(disposed||!canvas.isConnected)return;const w=canvas.clientWidth||360,h=canvas.clientHeight||360;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const onResize=()=>resize(); window.addEventListener('resize',onResize);
  const dispose=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',onResize);renderer.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(v=>v.dispose());else o.material.dispose();}});};
  const draw=()=>{
    if(disposed)return;
    if(token!==CASE3D_RUN||!canvas.isConnected){dispose();return;}
    const t=performance.now()-start,q=duration?Math.min(1,t/duration):1,e=1-Math.pow(1-q,3);
    root.position.z=THREE.MathUtils.lerp(fromZ,0,e);root.rotation.y=THREE.MathUtils.lerp(Math.PI,0,Math.min(1,q*1.25));
    root.position.y=Math.sin(t*.002)*.018;
    if(c.ovr>=91)root.rotation.y+=Math.sin(t*.001)*.025;
    const a=pg.attributes.position;for(let i=0;i<particlesN;i++){a.array[i*3+1]+=.12/60;if(a.array[i*3+1]>4)a.array[i*3+1]=0;}a.needsUpdate=true;
    camera.lookAt(0,1.25,0);renderer.render(scene,camera);
    raf=requestAnimationFrame(draw);
  };
  resize(); draw();
  return new Promise(resolve=>setTimeout(()=>resolve(true),showAll?2700:2550));
}

function rareSeq(i, done) {
  const x=OV.cards[i], c=x.c, k=hsh(c.nick)%4;
  if (c.ovr < 87) { reveal(i); return; }
  const sc=$('#scan'); if(sc) sc.classList.add('glitch');
  later(500,()=>{if(!OV||OV.phase!=='scan')return;$('#po-stage').innerHTML='';$('#po-name').innerHTML='';
    later(500,()=>{if(!OV||OV.phase!=='scan')return;sfx('rare');$('#arena').innerHTML=`<div class="arena a${k}" style="--tc:${teamCol(c)}"><i></i><i></i><i></i><b></b></div>`;$('#po-top').textContent=ARENAS[k];
      showCase3D(x,false).then(()=>{if(!OV||OV.phase!=='scan')return;flashNow();burst(glow(c),100,$('#po-stage'));sfx('stop',4);$('#po-name').innerHTML=nameH(x);later(500,()=>afterOne(i));});
    });
  });
}
function poRevealAll() {
  if(!OV||OV.phase!=='scan')return;
  const rareIndex=OV.cards.length-1, rare=isRare(OV.type,OV.cards[rareIndex].c);
  $('#po-top').textContent='ПЯТЬ КАРТОЧЕК · ПОЛНОЕ ОТКРЫТИЕ';
  if(rare && OV.cards[rareIndex].c.ovr>=87) showCase3D(OV.cards[rareIndex],true);
  else $('#po-stage').innerHTML=`<div class="all-reveal">${rare?walkSceneH(OV.cards[rareIndex]):''}<div class="all-cards">${OV.cards.map((x,i)=>`<div class="all-card" style="--delay:${i*130}ms">${cardH(x.c,{cls:'xs'})}<span>${esc(x.c.nick)}</span></div>`).join('')}</div></div>`;
  $('#po-bg').style.setProperty('--gl',glow(OV.cards[rareIndex].c));
  $('#po-name').innerHTML='<b>Все пять карточек открыты</b><span class="sm mut">Нажмите «Забрать», чтобы продолжить</span>';
  OV.phase='done';sfx(rare?'rare':'stop',rare?null:2);if(rare)flashNow();
  $('#po-btn').innerHTML='<button class="btn pri" data-act="ovClose" style="width:100%">Забрать карточки</button>';
}
function poDone() {
  if (!OV || OV.t !== 'pack') return; CASE3D_RUN++; OV.phase = 'done';
  const l = [...OV.cards].sort((a, b) => b.c.ovr - a.c.ovr), top = l[0];
  $('#arena').innerHTML = ''; $('#tray').innerHTML = ''; $('#po-top').textContent = `Кейс «${PACKS[OV.type].n}» · 5 карточек`;
  $('#po-bg').style.setProperty('--gl', glow(top.c));
  $('#po-stage').innerHTML = `<div class="grid" style="width:100%">${l.map((x, i) => `<div class="plain big" style="gap:4px;animation-delay:${i * 90}ms"><button data-act="card" data-id="${x.c.id}" aria-label="${esc(x.c.nick)}">${cardH(x.c, { lv: own(x.c.id).lv, pips: true })}</button><span class="bdg ${x.isNew ? 'new' : 'dup'}" style="align-self:flex-start">${x.isNew ? 'новая' : 'дубль'}</span></div>`).join('')}</div>`;
  $('#po-name').innerHTML = `<b style="color:${glow(top.c)}">Лучшая: ${esc(top.c.nick)}</b><span class="sm mut">Новых карточек: ${l.filter(x => x.isNew).length} из 5</span>`;
  $('#po-btn').innerHTML = '<button class="btn pri" data-act="ovClose">Забрать</button>';
}
/* Выбор карточки в награду: одна из трёх, пропустить нельзя */
function pickBuild() {
  const o = $('#over'), ids = G.picks[0];
  o.innerHTML = `<canvas id="fx"></canvas><div class="po-bg" id="po-bg" style="--gl:${RCOL[CARDS[ids[0]].rar]}"></div><div class="wrap po"><p class="eyebrow">Награда</p><div class="po-name"><b>Выберите одну карточку</b><span class="sm mut">Остальные две пропадут. Изменить выбор нельзя.</span></div><div class="po-stage" id="po-stage"><div class="grid" style="width:100%">${ids.map((id, i) => `<div class="plain big" style="gap:6px;animation-delay:${i * 80}ms">${cardH(CARDS[id], { stats: true })}<span class="bdg ${own(id) ? 'dup' : 'new'}" style="align-self:flex-start">${own(id) ? 'есть' : 'новая'}</span><button class="btn pri s" data-act="pick" data-v="${i}">Взять</button></div>`).join('')}</div></div><div id="po-btn"></div></div>`;
  o.hidden = false; o.scrollTop = 0; OV.built = true;
}
/* Контракт: результат уже записан, анимацию нельзя отменить или пропустить */
function tuBuild() {
  const o = $('#over'), x = OV.res;
  o.innerHTML = `<canvas id="fx"></canvas><div class="po-bg" id="po-bg"></div><div class="wrap po"><p class="eyebrow">Контракт</p><div class="po-stage" id="po-stage"><div class="scan glitch" id="scan" style="--gl:${RCOL[OV.rar]}"><div class="scan-fr"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#sil"/></svg><i class="scan-ln"></i></div></div></div><div class="po-name" id="po-name"><span class="mut">Десять карточек обмениваются на одну…</span></div><div id="po-btn" class="rowb" style="width:100%"></div></div>`;
  o.hidden = false; o.scrollTop = 0; OV.built = true; sfx('open');
  later(1700, () => { $('#po-stage').innerHTML = `<div class="scan out" id="scan" style="--gl:${glow(x.c)}">${cardH(x.c, { stats: true })}</div>`; $('#po-bg').style.setProperty('--gl', glow(x.c)); $('#po-name').innerHTML = `<b style="color:${glow(x.c)}">${esc(x.c.nick)}</b><span class="sm mut">${x.up ? 'Следующая редкость: ' : 'Та же редкость: '}${rarName(x.c)} · ${x.isNew ? 'новая' : 'дубль'}</span>`; flashNow(); burst(glow(x.c), x.up ? 120 : 40, $('#scan')); sfx('stop', x.c.rar); $('#po-btn').innerHTML = '<button class="btn pri" data-act="ovClose">Забрать</button>'; });
}
function addImage(file, base) {
  const rd = new FileReader();
  rd.onload = () => { const im = new Image(); im.onload = () => {
    const W = 300, H = 360, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s;
    cv.getContext('2d').drawImage(im, (W - w) / 2, (H - h) * .15, w, h);
    IMG[base] = cv.toDataURL('image/jpeg', .82);
    try { localStorage.setItem(IKEY, JSON.stringify(IMG)); imgMsg = ''; } catch (e) { imgMsg = 'Фото показано, но не сохранится: хранилище браузера заполнено или недоступно.'; }
    render();
  }; im.onerror = () => { imgMsg = 'Не удалось прочитать файл. Подойдёт JPG или PNG.'; render(); }; im.src = rd.result; };
  rd.readAsDataURL(file);
}

/* ---------- Матч: заставка, бан карты, раунды в реальном времени, отчёт ---------- */
const T_BUY = 3000, T_BUY1 = 6000, T_KILL = 150, T_END = 850, T_HALF = 1700;
let LV = null;
const sideName = s => s === 'A' ? 'в атаке' : 'в защите';
function matchBuild() {
  const o = $('#over'), m = OV.m, q = m.opp;
  o.innerHTML = `<div class="mt"><div class="mt-bg"></div><div class="wrap mt-in" id="mt"><div class="splash"><h1>Матч найден</h1><div class="pn" style="width:100%;text-align:left"><div class="kv"><span>Соперник</span><span>${rankH(q.lg)}</span></div><h2>${esc(q.name)}</h2><div class="stats"><div class="stat"><b>${q.rating.toFixed(1)}</b><span>рейтинг состава</span></div><div class="stat"><b>${LEAGUES[q.lg][0]}</b><span>лига</span></div><div class="stat"><b>${q.tro}</b><span>кубки</span></div></div></div><span class="vs"><span class="x">VS</span></span><p class="eyebrow">Вы · рейтинг ${m.a.info.rating.toFixed(1)} · ${G.tro} кубков</p></div></div></div>`;
  o.hidden = false; o.scrollTop = 0; OV.built = true; sfx('found');
  later(2000, vetoBuild);
}
function vetoBuild() {
  OV.st = 'veto';
  $('#mt').innerHTML = `<div class="splash"><p class="eyebrow">Выбор карты</p><h2 id="veto-t">Забаньте одну карту</h2><div class="maps">${OV.maps.map((x, i) => `<button class="map" id="map${i}" data-act="ban" data-v="${i}" style="--h:${x.hue}"><b>${x.n}</b><span>${x.d}</span></button>`).join('')}</div><p class="sm mut" id="veto-d">Соперник забанит вторую, играть будем на оставшейся.</p></div>`;
}
function vetoBan(i) {
  if (OV.st !== 'veto' || OV.ban.length) return;
  OV.ban.push(i); $('#map' + i).classList.add('ban'); sfx('tap'); $('#veto-t').textContent = 'Соперник банит…';
  later(700, () => {
    const rest = [0, 1, 2].filter(k => k !== i), b = pick(rest), p = rest.find(k => k !== b), m = OV.m;
    $('#map' + b).classList.add('ban'); sfx('tap');
    later(600, () => { m.map = OV.maps[p]; $('#map' + p).classList.add('pick'); $('#veto-t').textContent = 'Играем ' + m.map.n; $('#veto-d').textContent = `Вы начинаете ${sideName(m.sideA)}. Перед каждым раундом выбирайте точку и темп, нажатие на своего игрока делает на него ставку.`; sfx('win'); later(1800, liveBuild); });
  });
}
const chipH = (x, id, i, mine) => `<div class="chipp" id="${id}" ${mine ? `data-act="focus" data-v="${i}" role="button" aria-label="Ставка на ${esc(x.c.nick)}"` : ''}><div class="f">${faceH(x.c).replace('class="art"', '')}<span class="k">0</span></div><span class="n">${esc(x.c.nick)}</span></div>`;
function liveBuild() {
  const m = OV.m; OV.st = 'live';
  document.querySelector('.mt').style.setProperty('--mh', m.map.hue);
  $('#mt').innerHTML = `<div class="sbar"><div class="t" id="tA"><b>Вы</b><span id="monA"></span></div><div class="c"><b id="scA">0</b><div><span id="rn"></span><span>${m.map.n}</span></div><b id="scB">0</b></div><div class="t r" id="tB"><b>${esc(m.b.name)}</b><span id="monB"></span></div></div>
  <div class="hist" id="hist"></div>
  <div class="arena-m"><div class="trow" id="rowB">${m.b.info.e.map((x, i) => chipH(x, 'cB' + i, i, false)).join('')}</div><div class="mid"><div class="mm" id="mm"><div data-d="A">A</div><div data-d="S"></div><div data-d="B">B</div></div><div class="played" id="played"></div><div class="feed" id="feed" aria-live="off"></div><div id="bn"></div></div><div class="trow mine" id="rowA">${m.a.info.e.map((x, i) => chipH(x, 'cA' + i, i, true)).join('')}</div></div>
  <div class="phase"><b id="phl"></b><span class="bar"><i id="phb"></i></span><span id="buyl"></span></div>
  <div class="plan" id="plan"></div><div class="en" id="en"></div><div class="hand" id="hand"></div><div class="rowb" id="mbtn"></div>`;
  LV = { ph: 'buy', t: 0, T: 1, q: [], paused: false, last: null, ts: 0, kc: { A: [0, 0, 0, 0, 0], B: [0, 0, 0, 0, 0] } };
  lvBuy(true); lvBtns(); requestAnimationFrame(lvTick);
}
function lvBtns() { $('#mbtn').innerHTML = OV.askQuit ? '<button class="btn dan s" data-act="quitYes">Сдаться, засчитать поражение</button><button class="btn s" data-act="quitNo">Играть дальше</button>' : `<button class="btn s" data-act="pause">${LV.paused ? 'Продолжить' : 'Пауза'}</button><button class="btn s" data-act="quitAsk">Сдаться</button>`; }
function lvHud() {
  const m = OV.m, a = m.a, b = m.b, sn = s => s === 'A' ? 'T' : 'CT';
  $('#rn').textContent = m.over ? 'Финал' : m.decider ? 'Решающий' : 'Раунд ' + m.round;
  $('#tA').className = 't sd-' + m.sideA; $('#rowA').className = 'trow mine sd-' + m.sideA; $('#tB').className = 't r sd-' + other(m.sideA); $('#rowB').className = 'trow sd-' + other(m.sideA);
  $('#monA').textContent = '$' + nf(a.money) + ' · ' + sn(m.sideA); $('#monB').textContent = sn(other(m.sideA)) + ' · $' + nf(b.money);
  $('#scA').textContent = a.score; $('#scB').textContent = b.score;
  let h = ''; for (let i = 0; i < 24; i++) { if (i === 12) h += '<i class="h"></i>'; const x = m.hist[i]; h += `<i class="${x ? (x.win ? 'w' : 'l') : ''}"></i>`; } $('#hist').innerHTML = h;
}
/* Мини-карта: ваша точка подсвечена цветом стороны, точка соперника появляется после раунда */
function mmDraw(opp) {
  const m = OV.m, side = LV.ph === 'buy' ? m.sideA : LV.last.sideA, mine = LV.ph === 'buy' ? OV.plan.dir : LV.last.plan.dir, mm = $('#mm');
  mm.style.setProperty('--mc', side === 'D' ? 'var(--ct)' : 'var(--tt)'); mm.style.setProperty('--oc', side === 'D' ? 'var(--tt)' : 'var(--ct)');
  mm.querySelectorAll('div').forEach(d => { d.className = (d.dataset.d === mine ? 'me ' : '') + (opp && d.dataset.d === opp ? 'op' : ''); });
}
function planDraw() {
  const m = OV.m, atk = m.sideA === 'A';
  $('#plan').innerHTML = m.over ? '' : segH('dir', OV.plan.dir, [['A', atk ? 'Идём на A' : 'Держим A'], ['S', atk ? 'Центр' : 'Ровно'], ['B', atk ? 'Идём на B' : 'Держим B']]) + segH('tempo', OV.plan.tempo, [['fast', 'Быстро'], ['norm', 'Обычно'], ['slow', 'Медленно']]);
  document.querySelectorAll('#rowA .chipp').forEach((c, i) => c.classList.toggle('foc', OV.plan.focus === i));
  mmDraw(null);
}
function handDraw() {
  const m = OV.m, a = m.a, hd = $('#hand'), en = $('#en');
  if (m.over) { hd.innerHTML = ''; en.innerHTML = ''; $('#buyl').textContent = ''; return; }
  OV.sel = OV.sel.filter(k => a.hand.includes(k)); if (!m.canPlay(a, OV.sel)) OV.sel = [];
  const cost = OV.sel.reduce((s, k) => s + AC[k].cost, 0), ctx = { side: m.sideA, behind: a.score < m.b.score, cap: m.capIgl(a) };
  en.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(i => `<i class="${i <= a.en - cost ? 'on' : i <= a.en ? 'use' : ''}"></i>`).join('') + `<span>${a.en - cost}/8</span>`;
  en.setAttribute('aria-label', `Импульс ${a.en - cost} из 8`);
  hd.innerHTML = a.hand.map(k => { const on = OV.sel.includes(k), v = acVal(k, a, ctx), dis = !on && cost + AC[k].cost > a.en; return `<button class="ac ${dis ? 'dis' : ''}" data-act="sel" data-v="${k}" aria-pressed="${on}" ${dis ? 'aria-disabled="true"' : ''}><span class="h"><span class="n">${AC[k].n}</span><span class="c" aria-label="Стоит ${AC[k].cost} импульса">${AC[k].cost}</span></span>${k === 'fake' || k === 'eco' ? '' : `<span class="v ${v < 0 ? 'neg' : 'pos'}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}</span>`}<span class="d">${AC[k].d}</span></button>`; }).join('');
  $('#buyl').textContent = m.decider ? 'Полная закупка' : BUY[m.buyOf(a, OV.sel)].n;
}
function lvBuy(first) {
  const m = OV.m; LV.ph = 'buy'; LV.T = LV.t = first ? T_BUY1 : T_BUY;
  document.querySelectorAll('.chipp').forEach(c => c.classList.remove('dead', 'hit'));
  const it = m.nx.intel, head = m.isPistol() ? 'Пистолетный раунд' : m.decider ? 'Счёт 12:12 — решающий раунд' : m.a.ws >= 2 ? 'Серия побед: +1,5 к силе' : '';
  $('#feed').innerHTML = ''; $('#bn').innerHTML = ''; $('#played').innerHTML = `<span>${it ? '<b>Разведка:</b> ' + esc(it.t) : head}</span><span>${m.decider || m.isPistol() ? '' : 'Соперник: ' + BUY[m.buyOf(m.b, [])].n.toLowerCase()}</span>`;
  $('#phl').textContent = (m.sideA === 'A' ? 'Атака' : 'Защита') + ' · закупка'; lvHud(); planDraw(); handDraw();
}
function lvPlay() {
  const m = OV.m, sel = m.canPlay(m.a, OV.sel) ? OV.sel : [], L = m.play(sel, OV.plan);
  OV.sel = []; LV.last = L; LV.q = [...L.kills]; LV.ph = 'kills'; LV.t = 340;
  taskAdd(G, roundEvent(L)); G.live = { sa: m.a.score, sb: m.b.score }; save();
  const tg = (pl, vals, cut) => pl.length ? pl.map(k => { const v = vals.find(x => x.k === k); return k === cut ? `<s>${AC[k].n}</s>` : `<b>${AC[k].n}${v && k !== 'fake' ? ' ' + (v.v >= 0 ? '+' : '−') + Math.abs(v.v).toFixed(1) : ''}</b>`; }).join(', ') : 'без приказов';
  $('#played').innerHTML = `<span>Вы: ${tg(L.mine, L.va, L.cutA)}</span><span>Соперник: ${tg(L.theirs, L.vb, L.cutB)}</span>`;
  $('#phl').textContent = 'Раунд идёт'; $('#phb').style.width = '0%'; $('#buyl').textContent = `шанс ${Math.round(L.p * 100)}%`;
  mmDraw(L.planB.dir); handDraw(); $('#plan').innerHTML = `<p class="sm mut" style="grid-column:1/-1">Соперник: ${DIRN[L.planB.dir]}, ${TEMPON[L.planB.tempo]}. Вы: ${DIRN[L.plan.dir]}, ${TEMPON[L.plan.tempo]}.</p>`;
}
function lvKill(k) {
  const L = LV.last, kt = k.byA ? 'A' : 'B', vt = k.byA ? 'B' : 'A', m = OV.m, K = k.byA ? m.a : m.b, V = k.byA ? m.b : m.a;
  const ks = k.byA ? L.sideA : other(L.sideA), col = s => s === 'D' ? 'var(--ct)' : 'var(--tt)', f = $('#feed');
  f.insertAdjacentHTML('beforeend', `<div class="${k.byA ? '' : 'me'}"><span class="ka" style="--ka:${col(ks)}">${esc(K.info.e[k.k].c.nick)}</span><svg aria-hidden="true"><use href="#${k.awp ? 'awp' : 'gun'}"/></svg>${k.hs ? '<i class="hs"></i>' : ''}<span class="va" style="--vc:${col(other(ks))}">${esc(V.info.e[k.v].c.nick)}</span></div>`);
  while (f.children.length > 4) f.firstChild.remove();
  $('#c' + vt + k.v).classList.add('dead');
  const kc = $('#c' + kt + k.k); kc.classList.remove('hit'); void kc.offsetWidth; kc.classList.add('hit'); kc.querySelector('.k').textContent = ++LV.kc[kt][k.k];
  sfx('kill');
}
function lvEnd() {
  const L = LV.last; LV.ph = 'end'; LV.t = T_END;
  const rd = { good: 'вы переиграли соперника по направлению', bad: 'соперник прочитал ваше направление', fake: 'фейк спас атаку' }[L.read];
  $('#bn').innerHTML = `<div class="banner ${L.win ? 'w' : 'l'}"><b>${L.win ? 'Раунд ваш' : 'Раунд проигран'}</b><span>${END[L.end]} · ${esc(L.mvp)}: ${L.ace ? 'эйс' : L.clutch ? 'клатч, ' + L.frags + ' фр.' : L.frags + ' фр.'}</span>${rd ? `<span>${rd}</span>` : ''}</div>`;
  lvHud(); sfx(L.win ? 'win' : 'lose');
}
function finishMatch() {
  const m = OV.m; OV.st = 'end'; OV.reward = applyResult(G, m.won, m.a.score, m.b.score);
  taskAdd(G, matchEvent(G, m)); delete G.live; if (G.tut < 3) G.tut = 3; refresh(G, now()); save(); endBuild();
}
function lvNext() {
  const m = OV.m, L = LV.last;
  if (m.over) { finishMatch(); return; }
  if (LV.ph === 'end' && L.swap) { LV.ph = 'half'; LV.t = T_HALF; $('#bn').innerHTML = `<div class="banner n"><b>Смена сторон</b><span>Вы теперь ${sideName(m.sideA)} · деньги сброшены</span></div>`; lvHud(); return; }
  if (LV.ph === 'end' && m.decider) { LV.ph = 'half'; LV.t = T_HALF; $('#bn').innerHTML = '<div class="banner n"><b>12:12</b><span>Решающий раунд, полная закупка у обеих команд</span></div>'; return; }
  lvBuy(false);
}
function lvTick(ts) {
  if (!OV || OV.t !== 'match' || OV.st !== 'live' || !LV) return;
  const dt = Math.min(100, ts - (LV.ts || ts)); LV.ts = ts;
  if (!LV.paused) {
    LV.t -= dt;
    if (LV.ph === 'buy') { $('#phb').style.width = (100 * Math.max(0, LV.t) / LV.T) + '%'; if (LV.t <= 0) lvPlay(); }
    else if (LV.ph === 'kills') { if (LV.t <= 0) { if (LV.q.length) { lvKill(LV.q.shift()); LV.t = T_KILL; } else lvEnd(); } }
    else if (LV.t <= 0) lvNext();
  }
  requestAnimationFrame(lvTick);
}
function endBuild() {
  const m = OV.m, r = OV.reward, mv = m.mvp(), rep = m.report(), by = rep.eco.buys, bq = k => by[k] ? by[k][1] + ' из ' + by[k][0] : '—';
  const mine = `<table class="tbl sd-${m.sideA}"><tr><th>Вы</th><th>У</th><th>С</th><th>MVP</th><th>1-е</th></tr>${rep.players.slice().sort((p, q) => q.k - p.k).map(p => `<tr class="${m.won && p.nick === mv.nick ? 'star' : ''}"><td>${esc(p.nick)}</td><td>${p.k}</td><td>${p.d}</td><td>${p.mv}</td><td>${p.op}</td></tr>`).join('')}</table>`;
  const opp = `<table class="tbl sd-${other(m.sideA)}"><tr><th>${esc(m.b.name)}</th><th>У</th><th>С</th><th>MVP</th></tr>${m.b.info.e.map((x, i) => ({ n: x.c.nick, k: m.b.k[i], d: m.b.d[i], v: m.b.mv[i] })).sort((p, q) => q.k - p.k).map(p => `<tr class="${!m.won && p.n === mv.nick ? 'star' : ''}"><td>${esc(p.n)}</td><td>${p.k}</td><td>${p.d}</td><td>${p.v}</td></tr>`).join('')}</table>`;
  $('#mt').innerHTML = `<p class="res-t ${m.won ? 'w' : 'l'}">${m.won ? 'Победа' : 'Поражение'}</p><p class="eyebrow" style="text-align:center">${m.a.score}:${m.b.score} · ${m.map.n} · лучший игрок ${esc(mv.nick)}, ${mv.k} уб.</p>
  <div class="stats"><div class="stat"><b>${r.tro >= 0 ? '+' : '−'}${Math.abs(r.tro)}</b><span>кубки</span></div><div class="stat"><b>+${r.coins}</b><span>монеты</span></div><div class="stat"><b>+${r.xp}</b><span>опыт</span></div></div>${r.packs.map(p => `<p class="sm">Награда: ${p}.</p>`).join('')}
  ${rep.moments.length ? `<div class="pn rep"><h3>Ключевые моменты</h3><ul>${rep.moments.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
  <div class="pn rep"><h3>Выводы</h3><ul>${rep.notes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="pn">${mine}<p class="sm mut">У — убийства, С — смерти, MVP — лучший в раунде, 1-е — первые убийства.</p></div><div class="pn">${opp}</div>
  <div class="pn"><h3>Экономика</h3><p class="sm">Потрачено: $${nf(rep.eco.spent)}. Выиграно раундов: с полной закупкой ${bq('full')}, на форсе ${bq('force')}, на эко ${bq('eco')}, пистолетных ${bq('pistol')}.</p></div>
  <button class="btn pri" data-act="ovClose">Продолжить</button>`;
  $('#over').scrollTop = 0; sfx(m.won ? 'win' : 'lose');
}

const TABS = {
  home: ['Главная', vHome, '<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"/>'],
  play: ['Матчи', vPlay, '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>'],
  col: ['Коллекция', vCol, '<rect x="3" y="7" width="11" height="14"/><path d="M8 3h13v14"/>'],
  packs: ['Кейсы', vPacks, '<path d="M3 9h18v11H3zM5 9l2-4h10l2 4M12 9v4"/><path d="M10 13h4"/>'],
  prof: ['Профиль', vProf, '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7"/>']
};
function render() {
  if (!G) return;
  try { refresh(G, now()); } catch (e) { /* задания обновятся при следующем действии */ }
  $('#hud .wrap').innerHTML = hudH();
  const app = $('#app'); app.innerHTML = TABS[tab][1]();
  if (tab !== lastTab) {
    const ks = Object.keys(TABS), i = ks.indexOf(tab), j = ks.indexOf(lastTab);
    app.style.setProperty('--dir', j < 0 || i >= j ? 1 : -1); app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
    sceneTo(tab); lastTab = tab;
  } else app.classList.remove('enter');
  const dots = { home: todo(), packs: packCount() > 0 || dailyReady(G, now()) };
  $('#tabs .wrap').innerHTML = Object.keys(TABS).map(k => `<button data-act="tab" data-v="${k}" ${tab === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${TABS[k][2]}</svg>${TABS[k][0]}${dots[k] ? '<span class="dot"></span>' : ''}</button>`).join('');
  const sh = $('#sheet'); sh.innerHTML = vSheet(); sh.hidden = !sheet;
  const ov = $('#over');
  if (!OV && G.picks.length && !sheet) OV = { t: 'pick', built: false };
  if (!OV) { ov.innerHTML = ''; ov.hidden = true; }
  else if (!OV.built) { ({ pack: packBuild, match: matchBuild, pick: pickBuild, tu: tuBuild })[OV.t](); }
}
function autoSquad() {
  const used = new Set(), sq = [null, null, null, null, null];
  for (let i = 0; i < 5; i++) {
    const c = Object.keys(G.cards).map(id => CARDS[id]).filter(c => !used.has(c.nick)).sort((x, y) => (y.ovr + own(y.id).lv - (y.role === i ? 0 : 5)) - (x.ovr + own(x.id).lv - (x.role === i ? 0 : 5)))[0];
    if (c) { sq[i] = c.id; used.add(c.nick); }
  }
  G.squads[G.sqi] = sq; G.capts[G.sqi] = bestCapt(G);
}
const taskByKey = v => { const [k, i] = v.split(':'); return ({ d: G.tasks.d, w: G.tasks.w, s: [G.tasks.s], m: G.season.goals })[k][+i]; };
const ACT = {
  tab(v) { tab = v; colN = 45; askSell = null; window.scrollTo(0, 0); sfx('tap'); },
  sub(v) { sub = v; colN = 45; }, ttab(v) { taskTab = v; }, lb(v) { lbScope = v; }, fown(v) { F.own = v; colN = 45; },
  snd(v) { snd = v; try { localStorage.setItem(SKEY, v); } catch (e) { /* не сохранится */ } sfx('win'); },
  noteOk() { delete G.note; },
  close() { sheet = null; imgMsg = ''; askSell = null; },
  card(v, d) { sheet = { t: 'card', id: +d.id }; imgMsg = ''; askSell = null; },
  slot(v) { sheet = { t: 'slot', slot: +v }; },
  goSquad() { tab = 'col'; sub = 'squads'; window.scrollTo(0, 0); },
  sq(v) { G.sqi = +v; },
  put(v, d) { setSlot(G, +v, +d.id); if (G.capts[G.sqi] == null) G.capts[G.sqi] = bestCapt(G); if (G.tut === 1 && squadInfo(squadOf(G))) G.tut = 2; sheet = null; },
  capt(v, d) { G.capts[G.sqi] = d.id === '' ? null : +d.id; },
  auto() { autoSquad(); if (G.tut === 1) G.tut = 2; },
  up(v, d) { doUp(G, +d.id); },
  sell(v, d) { const id = +d.id; if (sellNeedsConfirm(G, id)) { askSell = id; return; } const last = own(id).n === 1; sellOne(G, id); if (last) sheet = null; },
  sellYes(v, d) { sellOne(G, +d.id); askSell = null; sheet = null; }, sellNo() { askSell = null; },
  cmpPick(v, d) { sheet = { t: 'cmpPick', id: +d.id, q: '' }; }, cmp(v, d) { sheet = { t: 'cmp', a: sheet.id, b: +d.id }; },
  imgDel(v, d) { delete IMG[d.id]; try { localStorage.setItem(IKEY, JSON.stringify(IMG)); } catch (e) { /* хранилище недоступно */ } },
  more() { colN += 45; },
  claim(v) { claimTask(G, taskByKey(v)); sfx('win'); }, inbox(v) { claimInbox(G, +v); sfx('win'); },
  pick(v) { const r = choosePick(G, +v); if (!r) return; save(); $('#po-stage').innerHTML = `<div class="scan out" id="scan" style="--gl:${glow(r.c)}">${cardH(r.c, { stats: true })}</div>`; $('.po-name').innerHTML = `<b style="color:${glow(r.c)}">${esc(r.c.nick)}</b><span class="sm mut">${r.isNew ? 'Новая карточка в коллекции' : 'Дубликат: пригодится для прокачки'}</span>`; $('#po-btn').innerHTML = '<button class="btn pri" data-act="ovClose" style="width:100%">Забрать</button>'; burst(glow(r.c), 80, $('#scan')); sfx('stop', r.c.rar); return false; },
  turar(v) { tuRar = +v; tuSel = []; }, tuClear() { tuSel = []; },
  tuAdd(v, d) { const id = +d.id; if (tuSel.length < 10 && tuSel.filter(x => x === id).length < own(id).n) tuSel.push(id); },
  tuDel(v, d) { const i = tuSel.lastIndexOf(+d.id); if (i >= 0) tuSel.splice(i, 1); },
  tuFill() { const l = Object.keys(G.cards).map(id => CARDS[id]).filter(c => !c.sp && c.rar === tuRar).sort((a, b) => a.ovr - b.ovr); for (const c of l) { let free = own(c.id).n - 1 - tuSel.filter(x => x === c.id).length; while (free-- > 0 && tuSel.length < 10) tuSel.push(c.id); } },
  tuGo() { const rar = tuRar, res = tuRun(G, tuSel); if (!res) return; tuSel = []; OV = { t: 'tu', res, rar, built: false }; },
  daily() { if (dailyReady(G, now())) { G.daily = mskDay(now()); G.packs.basic++; tab = 'packs'; } },
  open(v) { if (G.packs[v] > 0) { G.packs[v]--; startPack(v); } },
  buy(v) { const P = PACKS[v]; if (G.coins >= P.price) { G.coins -= P.price; startPack(v); } },
  poTap() { return poTap(); }, poAll() { return poAll(); }, poNext() { return poNext(); },
  poSkip() { if (OV && OV.t === 'pack' && OV.phase !== 'done') poDone(); return false; },
  ovClose() { OV = null; LV = null; window.scrollTo(0, 0); },
  fight() { const sq = squadOf(G), info = squadInfo(sq); if (!info) return; OV = { t: 'match', st: 'found', m: new Match(sq, G.tro, info.rating, { capt: captSlot(G) }), maps: shuffle([...MAPS]).slice(0, 3), ban: [], sel: [], plan: { dir: 'S', tempo: 'norm', focus: -1 }, reward: null, askQuit: false, built: false }; G.live = { sa: 0, sb: 0 }; },
  ban(v) { vetoBan(+v); return false; },
  sel(v) { if (!OV || OV.st !== 'live') return false; const m = OV.m, i = OV.sel.indexOf(v); if (i >= 0) OV.sel.splice(i, 1); else if (m.canPlay(m.a, OV.sel.concat(v))) OV.sel.push(v); else return false; sfx('tap'); handDraw(); return false; },
  dir(v) { if (OV && OV.st === 'live' && LV.ph === 'buy') { OV.plan.dir = v; planDraw(); } else if (OV && OV.st === 'live') OV.plan.dir = v; return false; },
  tempo(v) { if (OV && OV.st === 'live') { OV.plan.tempo = v; if (LV.ph === 'buy') planDraw(); } return false; },
  focus(v) { if (OV && OV.st === 'live') { OV.plan.focus = OV.plan.focus === +v ? -1 : +v; document.querySelectorAll('#rowA .chipp').forEach((c, i) => c.classList.toggle('foc', OV.plan.focus === i)); } return false; },
  pause() { if (LV) { LV.paused = !LV.paused; lvBtns(); } return false; },
  quitAsk() { OV.askQuit = true; lvBtns(); return false; }, quitNo() { OV.askQuit = false; lvBtns(); return false; },
  quitYes() { applyResult(G, false, OV.m.a.score, OV.m.b.score); delete G.live; OV = null; LV = null; },
  newAsk() { askNew = true; }, newNo() { askNew = false; },
  newYes() { askNew = false; try { backup('-before-reset', localStorage.getItem(KEY) || ''); } catch (e) { /* копия не сохранилась */ } G = newProfile(now()); tab = 'home'; tuSel = []; }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) { if (e.target.id === 'sheet') { sheet = null; askSell = null; render(); } return; }
  if (b.disabled) return;
  const fn = ACT[b.dataset.act]; if (!fn) return;
  if (fn(b.dataset.v, b.dataset) === false) return;
  save(); render();
});
document.addEventListener('input', e => {
  if (e.target.id === 'col-q') { F.q = e.target.value; colN = 45; const g = $('#col-grid'); if (g) g.innerHTML = colGrid(); }
  if (e.target.id === 'cmp-q' && sheet && sheet.t === 'cmpPick') { sheet.q = e.target.value; const tmp = document.createElement('div'); tmp.innerHTML = vSheet(); const nl = tmp.querySelector('#cmp-list'), l = $('#cmp-list'); if (nl && l) l.innerHTML = nl.innerHTML; }
});
document.addEventListener('change', e => {
  if (e.target.id === 'img-in' && e.target.files && e.target.files[0]) addImage(e.target.files[0], +e.target.dataset.base);
  if (e.target.dataset && e.target.dataset.f) { F[e.target.dataset.f] = e.target.value; colN = 45; const g = $('#col-grid'); if (g) g.innerHTML = colGrid(); }
});
/* Осмотр карточки: наклон и блик за пальцем */
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('.tilt'); if (!t || noMotion()) return;
  const b = t.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
  t.style.setProperty('--ry', ((x - .5) * 28).toFixed(1) + 'deg'); t.style.setProperty('--rx', ((.5 - y) * 22).toFixed(1) + 'deg');
  t.style.setProperty('--gx', (x * 100).toFixed(0) + '%'); t.style.setProperty('--gy', (y * 100).toFixed(0) + '%');
});
document.addEventListener('pointerout', e => { const t = e.target.closest && e.target.closest('.tilt'); if (t && !t.contains(e.relatedTarget)) { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); } });
function start() {
  const r = load();
  if (r !== 'ok') { G = newProfile(now()); if (r === 'broken') G.note = 'Сохранение не удалось прочитать. Его копия оставлена в памяти браузера, начата новая игра.'; }
  if (G.live) { applyResult(G, false, G.live.sa || 0, G.live.sb || 0); delete G.live; G.note = 'Прошлый матч был прерван и засчитан как поражение.'; }
  save(); buildScene(); render();
}
