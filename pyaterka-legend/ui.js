/* ===== Интерфейс ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => Math.round(n).toLocaleString('ru-RU');
const KEY = 'pyaterka-legend-v1', IKEY = KEY + '-img', SKEY = KEY + '-mute';
let G, IMG = {}, tab = 'home', lastTab = null, sub = 'cards', taskTab = 'd', lbScope = 'all', sheet = null, OV = null, askNew = false, askSell = null, colN = 45, imgMsg = '', snd = 'min', tuSel = [], tuRar = 0;
const F = { q: '', rar: 'all', role: 'all', team: 'all', own: 'all', sort: 'mine' };
let QS = null; /* быстрая продажа: { id: сколько копий продать } */
const now = () => Date.now();

/* ---------- Сохранение: перед переносом и при нечитаемых данных остаётся копия ---------- */
function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* без хранилища игра идёт до закрытия страницы */ } cloudQueue(); }
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
  const s = slug(c.nick);
  // Используем только точный URL фотографии, сохранённый из профиля HLTV.
  // Не конструируем адрес по profileId: у HLTV CDN URL содержит уникальный токен.
  let u = c.hltv && typeof c.hltv.photo === 'string' && /^https:\/\/(?:img-cdn|static)\.hltv\.org\//.test(c.hltv.photo)
    ? c.hltv.photo : IMG[c.base];
  if (!u && s && typeof PH[s] === 'string') u = PH[s];
  if (!u && s && PH[s] === undefined) { PH[s] = 0; probe(s, 0); }
  if (u) return `<img class="ph" src="${u}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<svg class=&quot;art&quot; viewBox=&quot;0 0 100 100&quot; aria-hidden=&quot;true&quot;><use href=&quot;#sil&quot;/></svg>'">`;
  return `<svg class="art" data-ph="${s}" viewBox="0 0 100 100" aria-hidden="true"><use href="#sil"/></svg>`;
}
function cardH(c, o = {}) {
  const lv = o.lv || 1, add = lv - 1, presentation = c.ovr + add >= 91 ? 'cinema-legend' : c.ovr + add >= 87 ? 'cinema' : 'standard';
  return `<div class="pc ${presentation} r${c.rar} ${c.sp ? 'sp' + c.sp : ''} ${lv >= 5 ? 'l5' : ''} ${o.cls || ''} ${o.no ? 'no' : ''}" style="--tc:${teamCol(c)}"><span class="mg">${esc(c.nick.slice(0, 2))}</span>${faceH(c)}<span class="sh"></span><div class="hd"><span class="ov">${c.ovr + add}</span><span class="rl">${RN[c.role]}</span></div><span class="rk">#${c.t + 1}</span>${c.hist ? '<span class="arc">архив</span>' : ''}<div class="ft">${c.sp ? `<span class="tag">${SPN[c.sp]}</span>` : ''}<span class="nk">${esc(c.nick)}</span><span class="tm">${c.hltv && c.hltv.teamLogo ? `<img class="team-logo" src="${esc(c.hltv.teamLogo)}" alt="" loading="lazy">` : ''}<span class="team-name">${esc(!c.hist && c.hltv && c.hltv.team ? c.hltv.team : c.team)}</span>${c.hltv && /^[A-Z]{2}$/.test(c.hltv.countryCode || "") ? `<span class="country" title="${esc(c.hltv.countryCode)}"><b>${[...c.hltv.countryCode].map(ch => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("")}</b></span>` : ""}</span>${o.stats ? `<span class="sg">${SK.map(k => `<span><b>${c.st[k] + add}</b>${SS[k]}</span>`).join('')}</span>` : ''}${o.pips ? `<span class="lv">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div>${o.n > 1 ? `<span class="cnt">×${o.n}</span>` : ''}</div>`;
}
const ownH = (id, cls) => { const o = own(id); return cardH(CARDS[id], { lv: o ? o.lv : 1, n: o ? o.n : 0, cls, pips: !!o, no: !o }); };
/* значок кейса: снимок 3D-кейса из сцены открытия; если картинок нет (например, в тестах) — прежний рисованный значок */
const pkH = (t, cls) => window.CASE_IMG && CASE_IMG[t] ? `<div class="pk pk-3d ${t} ${cls || ''}"><img src="${CASE_IMG[t]}" alt="" draggable="false"></div>` : `<div class="pk ${t} ${cls || ''}"><i class="lid"><span class="pk-rib"></span></i><i class="lock"></i><div class="box"><span class="pk-side"></span><span class="pk-stamp">5</span><b>${PACKS[t].n}</b></div></div>`;
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
  const prog = nx ? Math.max(0, Math.min(100, (G.tro - LEAGUES[lg][1]) / (nx[1] - LEAGUES[lg][1]) * 100)) : 100, st = G.tut;
  const collectionHave = Object.keys(G.cards).length, collectionTotal = ALL.length, collectionPct = Math.round(collectionHave / Math.max(1, collectionTotal) * 100), xpPct = Math.round(G.xp / Math.max(1, 100 * G.lvl) * 100);
  const ss = stState(), streakReward = !ss.p && G.streak.last === mskDay(now()) && G.streak.reward ? rewardText(G.streak.reward) : '';
  const lineup = G.squad.map((id, i) => id == null
    ? `<button class="lobby-slot" data-act="slot" data-v="${i}" aria-label="Выбрать игрока на роль ${RNAME[i]}"><span class="lobby-slot__plus">+</span><b>${RNAME[i]}</b><small>ВЫБРАТЬ</small></button>`
    : `<button class="lobby-card" data-act="card" data-id="${id}" aria-label="Открыть карточку ${esc(CARDS[id].nick)}"><span class="lobby-card__role">${RNAME[i]}</span>${ownH(id, 'xs')}<span class="lobby-card__open">ОТКРЫТЬ ↗</span></button>`).join('');
  const quickCase = packCount() ? `ДОСТУПНО ${packCount()} КЕЙС.` : 'КЕЙСЫ И НАГРАДЫ';
  const tut = st < 3 ? `<section class="lobby-tutorial"><div><span class="lobby-kicker">ПЕРВЫЙ ВЫХОД НА АРЕНУ</span><b>${st === 0 ? 'Открой стартовые кейсы' : st === 1 ? 'Собери свою пятёрку' : 'Сыграй первый матч'}</b><small>Шаг ${st + 1} из 3 · обучение</small></div>${st === 0 ? '<button class="btn pri s" data-act="tab" data-v="packs">ОТКРЫТЬ КЕЙСЫ ↗</button>' : st === 1 ? '<button class="btn pri s" data-act="auto">СОБРАТЬ СОСТАВ ↗</button>' : '<button class="btn pri s" data-act="fight">СЫГРАТЬ ПЕРВЫЙ МАТЧ ↗</button>'}</section>` : '';
  return `${G.note ? `<div class="note bad">${esc(G.note)} <button class="btn s" data-act="noteOk">Понятно</button></div>` : ''}${tut}
  <section class="lobby-hero">
    <div class="lobby-hero__art" aria-hidden="true">
      <div class="lobby-hero__roof"></div><div class="lobby-hero__beam lobby-hero__beam--a"></div><div class="lobby-hero__beam lobby-hero__beam--b"></div>
      <div class="lobby-hero__crowd"></div><div class="lobby-hero__screen"><span>FIVE</span><b>LEGENDS</b><i>PRO LEAGUE</i></div>
      <div class="lobby-hero__floor"></div><div class="lobby-hero__glow"></div><div class="lobby-hero__particles"></div>
    </div>
    <div class="lobby-hero__content">
      <div class="lobby-hero__eyebrow"><span><i></i> LIVE ARENA</span><b>SEASON ${String(G.season.m % 12 + 1).padStart(2, '0')}</b></div>
      <div class="lobby-hero__headline"><span>СТАНЬ</span><strong>ЛЕГЕНДОЙ</strong><em>СЦЕНЫ</em></div>
      <p class="lobby-hero__sub">Твоя команда. Твоя стратегия. Твой путь к вершине.</p>
      <button class="lobby-hero__rank" data-act="leagues" aria-label="Лиги: где вы сейчас и что дальше"><span class="lobby-hero__rankicon">${rankH(lg)}</span><span><small>ТЕКУЩАЯ ЛИГА</small><b>${LEAGUES[lg][0]}</b></span><span class="lobby-hero__cups"><strong>${G.tro}</strong><small>КУБКОВ</small></span><span class="lobby-hero__more" aria-hidden="true">›</span></button>
    </div>
    <div class="lobby-hero__ribbon"><span>CS2 MANAGER</span><i></i><span>5 PLAYERS · 1 LEGEND</span><i></i><span>COMPETITIVE</span></div>
  </section>
  <section class="lobby-command">
    <div class="lobby-sectionhead"><div><span class="lobby-kicker">YOUR LINEUP</span><h2>БОЕВАЯ ПЯТЁРКА</h2></div><button data-act="goSquad">УПРАВЛЯТЬ СОСТАВОМ <b>↗</b></button></div>
    <div class="lobby-lineup">${lineup}</div>
    <div class="lobby-teamstats">
      <div><small>ОБЩИЙ РЕЙТИНГ</small><b>${info ? info.rating.toFixed(1) : '—'}</b></div>
      <div><small>ХИМИЯ</small><b>${info ? info.chem + '<i>/13</i>' : '—'}</b></div>
      <div><small>СИЛА СОСТАВА</small><b>${info ? (info.atk + info.def).toFixed(1) : '—'}</b></div>
      <button class="lobby-play" data-act="fight" ${info ? '' : 'disabled'}><span>В БОЙ</span><b>↗</b><small>${info ? 'НАЧАТЬ РЕЙТИНГОВЫЙ МАТЧ' : 'ЗАПОЛНИ ПЯТЬ ПОЗИЦИЙ'}</small></button>
    </div>
  </section>
  <section class="lobby-shortcuts">
    <button class="lobby-shortcut lobby-shortcut--packs" data-act="tab" data-v="packs"><span class="lobby-shortcut__art"><i></i><b>5</b><em>DROP</em></span><span><small>SUPPLY DROP</small><strong>КЕЙСЫ</strong><em>${quickCase}</em></span><b class="lobby-shortcut__arrow">↗</b></button>
    <button class="lobby-shortcut lobby-shortcut--collection" data-act="tab" data-v="col"><span class="lobby-shortcut__art"><i></i><b>✦</b><em>PRO</em></span><span><small>PLAYER ARCHIVE</small><strong>КОЛЛЕКЦИЯ</strong><em>${collectionHave} ИЗ ${collectionTotal} ИГРОКОВ</em></span><b class="lobby-shortcut__arrow">↗</b></button>
  </section>
  <section class="lobby-progress">
    <div class="lobby-progress__top"><div><span class="lobby-kicker">COLLECT THEM ALL</span><h3>ПРОГРЕСС КОЛЛЕКЦИИ</h3></div><strong>${collectionPct}<small>%</small></strong></div>
    <div class="lobby-progress__bar"><i style="width:${collectionPct}%"></i><b></b></div>
    <div class="lobby-progress__foot"><span>${collectionHave} / ${collectionTotal} КАРТОЧЕК</span><span>УРОВЕНЬ ${G.lvl} · XP ${xpPct}%</span></div>
  </section>
  <section class="lobby-lower">
    <div class="lobby-season is-link" data-act="leagues" role="button" tabindex="0" aria-label="Путь выше: открыть лиги">
      <div class="lobby-season__head"><span class="lobby-kicker">RANKED ROAD</span><b>ПУТЬ ВЫШЕ</b></div>
      <div class="lobby-season__league">${rankH(lg)}<span><small>ТВОЙ ДИВИЗИОН</small><strong>${LEAGUES[lg][0]}</strong></span></div>
      <div class="lobby-season__bar"><i style="width:${prog}%"></i></div>
      <div class="lobby-season__foot"><span>${G.tro} CP</span><span>${nx ? nx[1] - G.tro + ' ДО ' + nx[0].toUpperCase() : 'МАКСИМАЛЬНЫЙ РАНГ'}</span></div>
      ${low ? `<p class="warn">Опасная зона: до понижения ${G.tro - LEAGUES[lg][1] + 1} кубков.</p>` : ''}
      <span class="lg-link">Все лиги и награды ›</span>
    </div>
    <div class="lobby-daily">
      <div class="lobby-daily__head"><span class="lobby-kicker">DAILY REWARD</span><b>СЕРИЯ ВХОДОВ</b></div>
      <strong>${ss.cur}<small> / 28 ДНЕЙ</small></strong>
      ${stGrid(ss)}
      ${ss.p ? `<div class="st-claim">${stArt(STREAK_REWARDS[ss.p.day - 1])}<span><small>Награда дня ${ss.p.day}</small><b>${esc(rewardText(STREAK_REWARDS[ss.p.day - 1]))}</b></span><button class="btn pri s" data-act="streakClaim">Забрать</button></div>` : `<p>${streakReward ? 'Получено сегодня: ' + esc(streakReward) + '. Следующая награда — завтра.' : 'Заходи каждый день и забирай награды.'} Пропуск дня начинает серию заново.</p>`}
      <button class="lobby-daily__more" data-act="streak">Все награды серии ›</button>
    </div>
  </section>
  ${st === 3 ? `<section class="lobby-missions"><div class="lobby-sectionhead"><div><span class="lobby-kicker">DAILY OBJECTIVES</span><h2>ЗАДАНИЯ</h2></div><button data-act="tab" data-v="play">ВСЕ ЗАДАНИЯ ↗</button></div>${tasksH()}</section>` : ''}
  <section class="lobby-free">
    <div class="lobby-free__art">${pkH('basic')}</div><div class="lobby-free__copy"><span class="lobby-kicker">COMPLIMENTARY DROP</span><h3>БЕСПЛАТНЫЙ КЕЙС</h3><p>${dailyReady(G, now()) ? 'Твоя ежедневная награда уже ждёт.' : 'Следующая награда после 00:00 МСК.'}</p></div>
    ${dailyReady(G, now()) ? '<button class="btn pri s" data-act="daily">ЗАБРАТЬ ↗</button>' : '<button class="btn s" data-act="tab" data-v="packs">К КЕЙСАМ ↗</button>'}
  </section>`;
}
function lbH() {
  const t = lbTable(G, lbScope, now()), row = x => `<div class="lb ${x.me ? 'me' : ''}"><b>${x.place}</b><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.name)}</span><b>${x.tro}</b></div>`;
  return `<section class="pn"><h3>Таблица лидеров</h3>${segH('lb', lbScope, [['all', 'Общая'], ['lg', 'Моя лига']])}<div>${t.top.map(row).join('')}${t.me.place > 10 ? '<div class="lb"><span></span><span class="mut">…</span><span></span></div>' + row(t.me) : ''}</div><p class="sm mut">Мест в таблице: ${t.total}. Пока у игры нет сервера, соперники в таблице — боты.</p></section>`;
}
function sqTabsH() {
  return `<div class="sqtab">${G.squads.map((s, i) => { const inf = squadInfo(s.map(id => id == null ? null : { c: CARDS[id], lv: G.cards[id].lv })); return `<button data-act="sq" data-v="${i}" aria-pressed="${G.sqi === i}"><span>Пятёрка ${i + 1}</span><b>${inf ? inf.rating.toFixed(1) : '—'}</b><span>${inf ? 'химия ' + inf.chem + (G.capts[i] != null ? ' · капитан' : ' · без капитана') : 'не собрана'}</span></button>`; }).join('')}</div>`;
}
function vPlay() {
  const info = squadInfo(squadOf(G)), cs = captSlot(G), h = G.season.hist, lg = leagueOf(G.tro), nx = LEAGUES[lg + 1];
  const prog = nx ? Math.max(0, Math.min(100, (G.tro - LEAGUES[lg][1]) / (nx[1] - LEAGUES[lg][1]) * 100)) : 100;
  const lineup = G.squad.map((id, i) => id == null
    ? `<button class="match-player is-empty" data-act="slot" data-v="${i}"><span class="match-player__empty">+</span><b>${RNAME[i]}</b><small>СЛОТ ПУСТ</small></button>`
    : `<button class="match-player" data-act="card" data-id="${id}"><span class="match-player__role">${RNAME[i]}</span>${ownH(id, 'xs')}<small>${esc(CARDS[id].nick)}</small></button>`).join('');
  return `<section class="match-hero is-link" data-act="leagues" role="button" tabindex="0" aria-label="Путь на арену: открыть лиги">
    <div class="match-hero__light"></div><div class="match-hero__meta"><span><i></i> LIVE COMPETITIVE</span><b>SEASON ${String(G.season.m % 12 + 1).padStart(2, '0')}</b></div>
    <div class="match-hero__title"><small>ТВОЯ СЛЕДУЮЩАЯ ЦЕЛЬ</small><h2>ПУТЬ НА АРЕНУ</h2><p>Побеждай — получай кубки и поднимайся по лигам.</p></div>
    <div class="match-hero__rank">${rankH(lg)}<span><small>ТЕКУЩАЯ ЛИГА</small><b>${LEAGUES[lg][0]}</b></span><strong>${G.tro}<small> КУБКОВ</small></strong></div>
    <div class="match-hero__progress"><i style="width:${prog}%"></i></div>
    <div class="match-hero__next">${nx ? (nx[1]-G.tro)+ ' ДО ' + nx[0].toUpperCase() : 'МАКСИМАЛЬНАЯ ЛИГА'}</div>
    <span class="lg-link">Все лиги и награды ›</span>
  </section>
  <section class="match-roster"><div class="match-heading"><span><small>YOUR ACTIVE ROSTER</small><b>СОСТАВ НА МАТЧ</b></span><button data-act="goSquad">ИЗМЕНИТЬ ↗</button></div>
    <div class="match-roster__grid">${lineup}</div>
    <div class="match-roster__foot"><span>${info ? 'РЕЙТИНГ ' + info.rating.toFixed(1) : 'СОСТАВ НЕ ГОТОВ'}</span><span>${info ? 'ХИМИЯ ' + info.chem + '/13' : 'НУЖНО 5 ИГРОКОВ'}</span><span>${cs >= 0 ? 'КАПИТАН НАЗНАЧЕН' : 'БЕЗ КАПИТАНА'}</span></div>
  </section>
  <section class="match-launch"><div class="match-launch__copy"><small>RANKED MATCH · BO1</small><h3>ГОТОВ К ИГРЕ?</h3><p>Матч до 13 побед. Перед раундом выбираешь план, посреди раунда — решение капитана.</p></div>
    <button class="match-launch__button" data-act="${info ? 'fight' : 'goSquad'}"><span>${info ? 'ВЫЙТИ НА АРЕНУ' : 'СОБРАТЬ ПЯТЁРКУ'}</span><b>↗</b></button>
  </section>
  ${G.tut === 3 ? lbH() + `<section class="pn match-season"><h3>ИСТОРИЯ СЕЗОНОВ</h3><p class="sm mut">Сезон длится месяц. В конце выдаются награды по лиге, часть кубков сбрасывается.</p>${h.length ? '<div class="list">' + h.slice(0,3).map(x => `<div class="prow" style="--rc:${LCOL[x.lg]}"><span>${rankH(x.lg)}</span><span><b>${monthName(x.m)}</b><span class="sm mut" style="display:block">лига «${LEAGUES[x.lg][0]}», ${x.tro} кубков</span></span><span class="num">#${x.place}</span></div>`).join('') + '</div>' : '<p class="sm mut">Завершённых сезонов пока нет.</p>'}</section>` : ''}`;
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
  return F.sort === 'lv' ? l.sort((a, b) => lv(b) - lv(a) || b.ovr - a.ovr) : F.sort === 'low' ? l.slice().reverse() : F.sort === 'mine' ? l.slice().sort((a, b) => !!own(b.id) - !!own(a.id)) : l;
}
function colGrid() {
  const l = colList();
  const mine = l.filter(c => own(c.id)).length;
  return `<p class="sm mut">Найдено: ${l.length} · ваших среди них: <b style="color:var(--accent)">${mine}</b>. Ваши карточки подсвечены, остальные — серые с замком.</p><div class="grid">${l.slice(0, colN).map(c => { const o = own(c.id); return `<button class="cg ${o ? 'cg-own' : 'cg-no'}" data-act="card" data-id="${c.id}" aria-label="${esc(c.nick)}${o ? ', есть в коллекции' : ', нет в коллекции'}">${ownH(c.id)}<span class="cg-tag">${o ? 'есть' + (o.n > 1 ? ' ×' + o.n : '') : '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10V8a5 5 0 0 1 10 0v2h1v11H6V10zm2 0h6V8a3 3 0 0 0-6 0z"/></svg>'}</span></button>`; }).join('')}</div>${l.length > colN ? '<button class="btn" data-act="more">Показать ещё</button>' : ''}`;
}
const selH = (k, opts, label) => `<select data-f="${k}" aria-label="${label}">${opts.map(([v, n]) => `<option value="${esc(v)}" ${String(F[k]) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
function vCards() {
  const have = Object.keys(G.cards).length, teams = [...new Set(ALL.map(c => c.team))].sort((a, b) => a.localeCompare(b));
  const pct = Math.round(have / Math.max(1, ALL.length) * 100);
  const featured = Object.keys(G.cards).map(id => CARDS[id]).filter(Boolean).sort((a,b) => (b.ovr + own(b.id).lv) - (a.ovr + own(a.id).lv)).slice(0,3);
  return `<section class="collection-hero">
    <div class="collection-hero__top"><span>PLAYER ARCHIVE / 2026</span><b>FIVE LEGENDS</b></div>
    <div class="collection-hero__count"><strong>${have.toLocaleString('ru-RU')}</strong><span> / ${ALL.length.toLocaleString('ru-RU')}<small>ИГРОКОВ СОБРАНО</small></span></div>
    <div class="collection-hero__bar"><i style="width:${pct}%"></i></div>
    <div class="collection-hero__foot"><span>КОЛЛЕКЦИЯ ЗАПОЛНЕНА НА ${pct}%</span><span>${ALL.length-have} ДО ЦЕЛИ</span></div>
    <div class="collection-hero__cards">${featured.length ? featured.map(c => `<button data-act="card" data-id="${c.id}">${ownH(c.id,'xs')}</button>`).join('') : '<div class="collection-empty">ТВОЯ ПЕРВАЯ КАРТОЧКА ЖДЁТ В КЕЙСЕ</div>'}</div>
  </section>
  <div class="collection-tools"><div><small>ПОИСК И ФИЛЬТРЫ</small><b>НАЙДИ СВОЕГО ИГРОКА</b></div><span>${have} / ${ALL.length}</span></div>
  <input type="text" id="col-q" placeholder="Поиск по нику" value="${esc(F.q)}" aria-label="Поиск по нику">
  <div class="frow">${selH('rar', [['all', 'Любая редкость']].concat(RAR.map((n, i) => [i, n])), 'Редкость')}${selH('role', [['all', 'Любая роль и способность']].concat(RNAME.map((n, i) => [i, n + ' — «' + AB_BASE[i].n + '»'])), 'Роль и способность')}${selH('team', [['all', 'Любая команда']].concat(teams.map(t => [t, t])), 'Команда')}${selH('sort', [['mine', 'Сначала мои'], ['ovr', 'Сначала сильные'], ['low', 'Сначала слабые'], ['lv', 'По уровню прокачки']], 'Сортировка')}</div>
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
`;
}
function vTu() {
  const inf = tuInfo(G, tuSel), cnt = id => tuSel.filter(x => x === id).length;
  const l = Object.keys(G.cards).map(id => CARDS[id]).filter(c => !c.sp && c.rar === tuRar).sort((a, b) => a.ovr - b.ovr);
  const risky = [...new Set(tuSel)].filter(id => own(id) && cnt(id) >= own(id).n && inSquads(G, id));
  return `<section class="pn"><h3>Контракт</h3><p class="sm mut">Десять обычных карточек одной редкости обмениваются на одну. Выпадет либо карточка следующей редкости, либо карточка той же редкости с рейтингом не ниже среднего по вложенным. Чем выше средний рейтинг, тем вероятнее следующая редкость.</p>
  ${segH('turar', String(tuRar), RAR.map((n, i) => [String(i), n.slice(0, 5) + (n.length > 5 ? '.' : '')]))}
  <div class="kv"><span>Выбрано</span><span><b>${tuSel.length}</b> из 10</span></div><span class="bar"><i style="width:${tuSel.length * 10}%"></i></span>
  <div class="tu-slots" aria-label="Выбранные карточки — нажмите, чтобы убрать">${Array.from({ length: 10 }, (_, i) => tuSel[i] != null ? `<button class="tu-slot is-on" data-act="tuDel" data-id="${tuSel[i]}" aria-label="Убрать ${esc(CARDS[tuSel[i]].nick)}">${cardH(CARDS[tuSel[i]], { cls: 'xs' })}<span class="tu-rm" aria-hidden="true">✕</span></button>` : '<span class="tu-slot"></span>').join('')}</div>
  ${tuSel.length ? '<p class="sm mut">Нажмите на выбранную карточку, чтобы убрать её.</p>' : ''}
  ${inf.avg ? `<p class="sm">Средний рейтинг: <b class="num">${inf.avg.toFixed(1)}</b>${inf.up ? ` · следующая редкость: примерно <b>${inf.up}</b> · та же редкость сильнее: примерно <b>${inf.same}</b>` : ''}</p>` : ''}
  ${inf.why ? `<p class="${tuRar === 4 ? 'warn' : 'sm mut'}">${inf.why}</p>` : ''}${risky.length ? `<p class="warn">В контракт уйдёт последняя копия игрока из состава: ${risky.map(id => esc(CARDS[id].nick)).join(', ')}.</p>` : ''}
  <div class="rowb"><button class="btn s" data-act="tuFill" ${tuRar === 4 ? 'disabled' : ''}>Добавить слабейшие дубликаты</button><button class="btn s" data-act="tuClear" ${tuSel.length ? '' : 'disabled'}>Очистить</button></div>
  <button class="btn pri" data-act="tuGo" ${inf.ok ? '' : 'disabled'}>Исполнить контракт — отменить нельзя</button></section>
  <section class="plain"><h3>Ваши карточки «${RAR[tuRar]}»</h3><p class="sm mut">Нажмите на карточку, чтобы добавить одну копию в контракт.</p>${l.length ? `<div class="grid tu-grid">${l.map(c => { const o = own(c.id), n = cnt(c.id), can = n < o.n && tuSel.length < 10;
    return `<button class="tu-pick ${n ? 'is-sel' : ''} ${can ? '' : 'is-full'}" data-act="tuAdd" data-id="${c.id}" ${can ? '' : 'aria-disabled="true"'} aria-label="${esc(c.nick)}: в контракте ${n} из ${o.n}">${ownH(c.id, 'xs')}<span class="tu-badge">${n}/${o.n}</span></button>`; }).join('')}</div>` : '<p class="sm mut">Обычных карточек этой редкости у вас нет.</p>'}</section>`;
}
/* ---------- Моя коллекция и быстрая продажа ---------- */
/* цена продажи k копий подряд — так же, как sellOne: последняя копия продаётся с учётом уровня */
function qsPrice(id, k) { const o = own(id), c = CARDS[id]; if (!o) return 0; let n = o.n, t = 0; for (let i = 0; i < k && n > 0; i++, n--) t += priceOf(c, n === 1 ? o.lv : 1); return t; }
const qsMax = id => { const o = own(id); return o ? o.n - (inSquads(G, id) ? 1 : 0) : 0; };
function qsSum() { let n = 0, coins = 0, cards = 0; for (const id in QS || {}) { const k = Math.min(QS[id], qsMax(+id)); if (k > 0) { n += k; cards++; coins += qsPrice(+id, k); } } return { n, coins, cards }; }
function vMine() {
  const ids = Object.keys(G.cards).map(Number).filter(id => CARDS[id]), sorted = ids.map(id => CARDS[id]).sort((a, b) => F.sort === 'low' ? a.ovr - b.ovr : F.sort === 'lv' ? own(b.id).lv - own(a.id).lv || b.ovr - a.ovr : F.sort === 'n' ? own(b.id).n - own(a.id).n || b.ovr - a.ovr : (b.ovr + own(b.id).lv) - (a.ovr + own(a.id).lv));
  const copies = ids.reduce((a, id) => a + own(id).n, 0), dups = ids.reduce((a, id) => a + own(id).n - 1, 0), dupCoins = ids.reduce((a, id) => a + qsPrice(id, own(id).n - 1), 0);
  const byRar = RAR.map((n, r) => ids.filter(id => CARDS[id].rar === r).length);
  const q = QS ? qsSum() : null;
  const head = `<section class="mine-hero"><div><small class="eyebrow">Моя коллекция</small><b>${ids.length} ${plural(ids.length, 'игрок', 'игрока', 'игроков')}</b><span class="sm mut">${copies} ${plural(copies, 'карточка', 'карточки', 'карточек')} · дубликатов ${dups}${dups ? ' · можно продать за ' + nf(dupCoins) : ''}</span></div>
    <div class="mine-rar">${byRar.map((n, r) => `<span style="--rc:var(--r${r})"><b>${n}</b><small>${RAR[r]}</small></span>`).join('')}</div></section>`;
  const tools = QS ? `<section class="qs-bar"><div><b>Быстрая продажа</b><span class="sm mut">Нажимайте на карточки, чтобы выбрать. Последняя копия игрока из состава не продаётся.</span></div>
      <div class="rowb"><button class="btn s" data-act="qsDups" ${dups ? '' : 'disabled'}>Все дубликаты</button><button class="btn s" data-act="qsAll">Всё, кроме составов и особых</button><button class="btn s" data-act="qsNone" ${q.n ? '' : 'disabled'}>Сбросить</button></div></section>`
    : `<div class="rowb"><button class="btn" data-act="qsOn">Быстрая продажа</button>${dups ? `<button class="btn pri" data-act="qsDupsGo">Продать дубликаты · +${nf(dupCoins)}</button>` : ''}</div>`;
  const grid = sorted.length ? `<div class="grid">${sorted.map(c => { const o = own(c.id), k = QS ? Math.min(QS[c.id] || 0, qsMax(c.id)) : 0, mx = qsMax(c.id);
      return QS ? `<button class="qs-card ${k ? 'is-sel' : ''} ${mx ? '' : 'is-lock'}" data-act="qsTog" data-id="${c.id}" aria-pressed="${!!k}" aria-label="${esc(c.nick)}${k ? ': продать ' + k : ''}">${ownH(c.id)}${k ? `<span class="qs-badge">−${k} · +${nf(qsPrice(c.id, k))}</span>` : mx ? '' : '<span class="qs-badge is-lock">в составе</span>'}</button>`
        : `<button data-act="card" data-id="${c.id}" aria-label="${esc(c.nick)}">${ownH(c.id)}</button>`; }).join('')}</div>` : '<p class="sm mut">Карточек пока нет — откройте кейс.</p>';
  const sel = QS ? `<div class="qs-foot"><span><b>${q.n}</b> ${plural(q.n, 'карточка', 'карточки', 'карточек')} · <i class="coin"></i> +${nf(q.coins)}</span><button class="btn s" data-act="qsOff">Отмена</button><button class="btn pri" data-act="qsAsk" ${q.n ? '' : 'disabled'}>Продать</button></div>` : '';
  return `${head}${tools}<div class="frow">${selH('sort', [['mine', 'Сначала сильные'], ['low', 'Сначала слабые'], ['lv', 'По уровню прокачки'], ['n', 'Больше копий']], 'Сортировка')}</div>${grid}${sel}`;
}
function vCol() {
  const body = sub === 'squads' ? vSquads() : sub === 'tu' ? vTu() : sub === 'mine' ? vMine() : vCards();
  return `<div class="collection-tabs">${segH('sub', sub, [['cards', 'Все карточки'], ['mine', 'Моя коллекция'], ['squads', 'Составы'], ['tu', 'Контракты']])}</div>${body}`;
}

/* ---------- Профиль ---------- */
/* ---------- Профиль ---------- */
function vProf() {
  const lg = leagueOf(G.tro), fr = G.frame, h = G.season.hist, n = G.w + G.l, xpPct = Math.max(0,Math.min(100,Math.round(G.xp / Math.max(1,100 * G.lvl) * 100)));
  const winPct = n ? Math.round(G.w / n * 100) : 0;
  return `<section class="profile-hero" style="${fr >= 0 ? `--profile-rank:${LCOL[fr]}` : ''}">
    <div class="profile-hero__glow"></div><div class="profile-hero__top"><span>PLAYER DOSSIER / FIVE LEGENDS</span><b>FL-${String(G.lvl).padStart(4,'0')}</b></div>
    <div class="profile-hero__identity is-link" data-act="lvlInfo" role="button" tabindex="0" aria-label="Что такое уровень и лига"><div class="profile-hero__crest">${rankH(lg)}</div><div><small>ЛИГА «${LEAGUES[lg][0].toUpperCase()}» · ${G.tro} КУБКОВ</small><h2>УРОВЕНЬ <em>${G.lvl}</em></h2><span>ОПЫТ ЗА МАТЧИ · КАЖДЫЙ УРОВЕНЬ — КЕЙС ›</span></div></div>
    <div class="profile-hero__xp"><div><span>ОПЫТ УРОВНЯ</span><b>${G.xp} / ${100*G.lvl} XP</b></div><i><b style="width:${xpPct}%"></b></i></div>
    <div class="profile-hero__stats"><div><strong>${G.tro}</strong><small>КУБКИ</small></div><div><strong>${G.best}</strong><small>РЕКОРД</small></div><div><strong>${winPct}%</strong><small>ПОБЕДЫ</small></div></div>
  </section>
  <section class="profile-record"><div class="profile-section-title"><small>CAREER STATISTICS</small><h3>КАРЬЕРА</h3></div><div class="profile-record__grid"><div><strong>${G.w}</strong><small>ПОБЕД</small></div><div><strong>${G.l}</strong><small>ПОРАЖЕНИЙ</small></div><div><strong>${n}</strong><small>МАТЧЕЙ</small></div><div><strong>${G.coins.toLocaleString('ru-RU')}</strong><small>МОНЕТ</small></div></div></section>
  <section class="profile-history"><div class="profile-section-title"><small>SEASON ARCHIVE</small><h3>ИСТОРИЯ СЕЗОНОВ</h3></div>${h.length ? '<div class="list">' + h.map(x => `<div class="prow" style="--rc:${LCOL[x.lg]}"><span>${rankH(x.lg)}</span><span><b>${monthName(x.m)}</b><span class="sm mut" style="display:block">лига «${LEAGUES[x.lg][0]}», ${x.tro} кубков</span></span><span class="num">#${x.place}</span></div>`).join('') + '</div>' : '<p class="sm mut">Завершённых сезонов пока нет. Текущий сезон: «' + monthName(G.season.m) + '».</p>'}</section>
  ${accH()}
  <section class="profile-settings"><div class="profile-section-title"><small>PREFERENCES</small><h3>НАСТРОЙКИ</h3></div><div class="profile-settings__row"><b>Звуковое сопровождение</b>${segH('snd', snd, [['off', 'Выкл.'], ['min', 'Минимум'], ['full', 'Полный']])}</div><p class="sm mut">Минимум — сигналы кейсов и итогов раунда. Полный добавляет щелчки, сканер и выстрелы.</p></section>
  <section class="profile-about"><div class="profile-section-title"><small>SYSTEM INFORMATION</small><h3>ОБ ИГРЕ</h3></div><p class="sm mut">Составы команд взяты из рейтинга Valve от 2 ноября 2026. Показатели карточек пока рассчитаны игрой, это не статистика HLTV. Фото игроков берутся из папки photos рядом с файлом игры. Прогресс хранится в этом браузере.</p>
  ${askNew ? '<p class="sm">Коллекция и прогресс будут удалены, копия сохранения останется в памяти браузера. Начать заново?</p><div class="rowb"><button class="btn dan s" data-act="newYes">Да, начать заново</button><button class="btn s" data-act="newNo">Отмена</button></div>' : '<button class="btn s" data-act="newAsk">Начать заново</button>'}</section>`;
}

/* ---------- Нижний лист: карточка, выбор в слот, сравнение ---------- */
function abH(c, lv) {
  const pw = Math.round(abPow(c, lv) * 100), ipw = Math.round(indPow(c, lv) * 100), i = indOf(c);
  const source = c.hltv && c.hltv.last12m ? `HLTV · ${c.hltv.last12m.maps} карт за 12 мес. · обновлено ${c.hltv.snapshotDate}` : 'Предварительные характеристики: статистика HLTV ещё не подключена.';
  return `<p class="sm mut" style="margin:0 0 8px">${source}</p><div class="ab" style="--rc:${glow(c)}"><b>${AB_BASE[c.role].n} <span class="num mut" style="font-size:12px">${pw}%</span></b>${AB_BASE[c.role].d} Работает только на роли «${RNAME[c.role]}».</div><div class="ab"><b>${i.n} <span class="num mut" style="font-size:12px">${ipw}%</span></b>${i.d}${IND[c.nick] ? '' : ' Индивидуальная способность появится после загрузки статистики HLTV.'}</div>`;
}
/* Лиги: где игрок сейчас, сколько до следующей, награды, доля игроков в каждой лиге */
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return m > 10 && m < 20 ? c : k === 1 ? a : k > 1 && k < 5 ? b : c; };
const seasonPack = i => i >= 5 ? 'elite' : i >= 3 ? 'pro' : i >= 1 ? 'basic' : null;
const cupSvg = '<svg class="lg-cup" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h10v2h4v3a5 5 0 0 1-4.3 5A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 7.3 12 5 5 0 0 1 3 7V4h4zm-2 4v1a3 3 0 0 0 2 2.8V6zm12 0v3.8A3 3 0 0 0 19 7V6z"/></svg>';
const lgCoins = n => `<span class="lg-coins" aria-hidden="true"><i class="coin"></i><i class="coin"></i><i class="coin"></i></span>`;
const lgCase = t => `<span class="lg-case" aria-hidden="true">${pkH(t)}</span>`;
const lgTile = (art, big, small, st) => `<div class="lg-tile ${st || ''}">${art}<b>${big}</b><small>${small}</small></div>`;
/* Лиги: лестница от Легенды (вверху) до Бронзы; при открытии страница плавно опускается к лиге игрока */
function leaguesH() {
  const lg = leagueOf(G.tro), best = leagueOf(G.best), N = LEAGUES.length;
  const pop = lbBots(G.season.m, now()).map(b => b.tro).concat([G.tro]), cnt = LEAGUES.map((_, i) => pop.filter(t => leagueOf(t) === i).length);
  const fmt = v => v > 0 && v < 1 ? '<1' : String(Math.round(v));
  const rows = LEAGUES.map(([n, from], i) => ({ n, from, i })).reverse().map(({ n, from, i }) => {
    const to = LEAGUES[i + 1] ? LEAGUES[i + 1][1] : null, me = i === lg, got = i <= best, sh = cnt[i] / pop.length * 100, pk = seasonPack(i);
    const status = me ? (to ? `<div class="lg-status"><span>Вы здесь: <b>${G.tro}</b> из ${to} до лиги «${LEAGUES[i + 1][0]}»</span><span class="lg-prog"><i style="width:${Math.max(0, Math.min(100, (G.tro - from) / (to - from) * 100))}%"></i></span><span>Осталось <b>${to - G.tro}</b> ${plural(to - G.tro, 'кубок', 'кубка', 'кубков')}</span></div>` : `<div class="lg-status"><span>Вы в высшей лиге: <b>${G.tro}</b> кубков</span></div>`)
      : i > lg ? `<div class="lg-status"><span>Нужно <b>${from}</b> кубков — ещё <b>${from - G.tro}</b></span></div>` : `<div class="lg-status"><span>Лига пройдена${got && i < lg ? '' : ''}</span></div>`;
    const first = i === 0 ? `<p class="sm mut">Стартовая лига — здесь начинают все.</p>` : `<div class="lg-tiles">${lgTile(lgCase('pro'), 'Кейс «Про»', got ? 'уже получен' : 'сразу при входе в лигу', got ? 'is-got' : '')}</div><p class="sm mut">Даётся один раз — когда кубков впервые хватает на эту лигу.</p>`;
    const season = `<div class="lg-tiles">${lgTile(lgCoins(), S_COINS[i] + ' монет', 'на счёт')}${pk ? lgTile(lgCase(pk), 'Кейс «' + PACKS[pk].n + '»', 'во «Входящие»') : ''}</div>`;
    const drop = S_DROP[i] ? `<div class="lg-drop">${cupSvg}<div><b>−${S_DROP[i]} ${plural(S_DROP[i], 'кубок', 'кубка', 'кубков')}</b><small>${me ? `в начале нового сезона: было бы ${G.tro} → ${Math.max(0, G.tro - S_DROP[i])}` : 'снимается в начале нового сезона'}</small></div></div>` : `<div class="lg-drop is-none">${cupSvg}<div><b>Кубки не снимаются</b><small>в Бронзе сезон начинается с тех же кубков</small></div></div>`;
    return `<details class="lg-row ${me ? 'is-me' : ''} ${got ? 'is-got' : ''} ${i > lg ? 'is-up' : ''}" ${me ? 'id="lg-me" open' : ''} style="--lc:${LCOL[i]}">
      <summary><span class="lg-node">${rankH(i)}</span><span class="lg-main"><b>${n}${me ? ' <span class="lg-you">вы здесь</span>' : ''}</b><small>${cupSvg}${to ? from + '–' + (to - 1) : 'от ' + from}</small></span>
        <span class="lg-chips"><span class="lg-chip"><i class="coin"></i>${S_COINS[i]}</span>${pk ? `<span class="lg-chip lg-chip--case">${lgCase(pk)}</span>` : ''}</span>
        <span class="lg-share"><b>${fmt(sh)}%</b><small>игроков</small></span><span class="lg-chev" aria-hidden="true"></span></summary>
      <div class="lg-body">${status}
        <h4>Награда за выход в лигу</h4>${first}
        <h4>Награда за итог сезона</h4><p class="sm mut">Если в последний день месяца вы в этой лиге:</p>${season}
        <h4>Кубки в новом сезоне</h4>${drop}
        <h4>Игроки в лиге</h4><div class="lg-pop"><span class="lg-bar"><i style="width:${Math.max(sh > 0 ? 2 : 0, sh)}%"></i></span><span><b>${fmt(sh)}%</b> · ${cnt[i]} из ${pop.length} в таблице сезона</span></div>
      </div></details>`; }).join('');
  return `<div class="in lg-page"><div class="lg-top"><div><small class="eyebrow">Лиги</small><b>${LEAGUES[lg][0]} · ${G.tro} ${cupSvg}</b></div><button class="lg-x" data-act="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>
    <div class="wrap col lg-sheet"><p class="lg-hint sm mut">Сверху — высшая лига. Нажмите на лигу, чтобы увидеть награды и условия.</p>
    <div class="lg-list">${rows}</div>
    <section class="lg-rules"><h4>Как набираются кубки</h4><p class="sm mut">Победа +25 (+30, если выиграли больше чем на 5 раундов). Поражение −25 (−30 при сухом счёте). Сезон длится месяц.</p>
    <p class="sm mut">Доля игроков посчитана по таблице лидеров сезона (${pop.length} участников). Пока сервера нет, соперники в таблице — боты игры; реальные проценты появятся вместе с онлайном.</p></section>
    <div class="rowb"><button class="btn pri" data-act="close">Закрыть</button></div></div></div>`;
}
/* плавный спуск от верха страницы (Легенда) к лиге игрока; любое касание или прокрутка останавливает его */
function lgScroll() {
  const box = $('#sheet .in.lg-page'), me = $('#lg-me'); if (!box || !me) return;
  box.scrollTop = 0; const target = Math.max(0, Math.min(box.scrollHeight - box.clientHeight, me.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientHeight * .22));
  if (noMotion() || target < 8) { box.scrollTop = target; return; }
  let stop = false, t0 = 0; const quit = () => { stop = true; }; ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(k => box.addEventListener(k, quit, { once: true, passive: true }));
  const D = Math.min(2200, 900 + target * .9), ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const step = ts => { if (stop || !box.isConnected) return; if (!t0) t0 = ts; const k = Math.min(1, (ts - t0) / D); box.scrollTop = target * ease(k); if (k < 1) requestAnimationFrame(step); };
  setTimeout(() => requestAnimationFrame(step), 450);
}
/* ---------- Серия входов: окно дня и сетка наград ---------- */
function stState() { const S = G.streak, p = S.pend; return { S, p, cur: p ? p.day : S.day, done: p ? p.day - 1 : S.day, broke: !!(p && p.day === 1 && S.day > 0 && S.day < 28) }; }
const stArt = (r, big) => { if (r.pack) { const k = Object.keys(r.pack)[0], n = r.pack[k]; return `<span class="st-case ${k}">${pkH(k)}${n > 1 ? `<i class="st-x">×${n}</i>` : ''}</span>`; } return big ? lgCoins() : '<span class="st-coin"><i class="coin"></i></span>'; };
const ST_SH = { basic: 'Баз.', pro: 'Про', elite: 'Элит' };
const stShort = r => r.pack ? (k => r.pack[k] > 1 ? '×' + r.pack[k] : ST_SH[k])(Object.keys(r.pack)[0]) : String(r.coins);
function stGrid(ss) {
  return `<div class="st-grid">${STREAK_REWARDS.map((r, i) => { const d = i + 1, done = d <= ss.done, today = ss.p && d === ss.p.day;
    return `<span class="st-day ${done ? 'is-done' : ''} ${today ? 'is-today' : ''} ${r.pack ? 'is-pack' : ''} ${r.pack && r.pack.elite ? 'is-elite' : ''}"><small>${d}</small>${stArt(r)}<b>${stShort(r)}</b></span>`; }).join('')}</div>`;
}
function streakH() {
  const ss = stState(), got = sheet.got, day = got ? G.streak.day : ss.cur, r = got || (ss.p ? STREAK_REWARDS[ss.p.day - 1] : G.streak.reward);
  const nextPack = STREAK_REWARDS.findIndex((x, i) => i + 1 > day && x.pack), np = nextPack >= 0 ? STREAK_REWARDS[nextPack] : null;
  return `<div class="in st-pop"><button class="lg-x st-x0" data-act="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
    <small class="eyebrow">Серия входов</small><h2>${got ? 'Награда получена' : ss.p ? 'День ' + ss.p.day + ' из 28' : 'День ' + day + ' из 28'}</h2>
    ${ss.broke && !got ? '<p class="sm st-warn">Вчера вход был пропущен — серия начинается заново.</p>' : ''}
    ${r ? `<div class="st-hero ${got ? 'is-got' : ''}">${stArt(r, true)}<b>${esc(rewardText(r))}</b><small>${got ? 'уже у вас' : ss.p ? 'награда за сегодня' : 'получено сегодня'}</small></div>` : ''}
    <span class="st-prog" aria-label="Пройдено дней: ${got ? day : ss.done} из 28"><i style="width:${(got ? day : ss.done) / 28 * 100}%"></i></span>
    ${np ? `<p class="sm mut">До ближайшего кейса (${esc(rewardText(np))}) — ${nextPack + 1 - day} ${plural(nextPack + 1 - day, 'день', 'дня', 'дней')}.</p>` : ''}
    ${stGrid(got ? { done: day, p: null } : ss)}
    <p class="sm mut">Заходите каждый день: пропуск дня начинает серию с первого дня. После 28-го дня цикл повторяется.</p>
    <div class="rowb">${ss.p && !got ? '<button class="btn pri" data-act="streakClaim">Забрать награду</button>' : '<button class="btn pri" data-act="close">Отлично</button>'}</div></div>`;
}
/* окно «Уровень и лига»: чем они отличаются, как растут, что дают следующие уровни */
function lvlH() {
  const lg = leagueOf(G.tro), nx = LEAGUES[lg + 1], need = 100 * G.lvl, xpP = clamp(G.xp / need * 100, 0, 100);
  const next = [1, 2, 3, 4, 5].map(k => G.lvl + k).map(l => `<div class="lv-row"><b>Уровень ${l}</b><span>${100 * (l - 1)} опыта</span>${pkH('basic')}<em>базовый кейс</em></div>`).join('');
  return `<div class="in lg-page lv-page"><div class="lg-top"><div><small class="eyebrow">Профиль</small><b>Уровень ${G.lvl} · лига «${LEAGUES[lg][0]}»</b></div><button class="lg-x" data-act="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>
    <div class="lv-two"><div class="lv-card"><small>УРОВЕНЬ</small><b>${G.lvl}</b><p>Растёт от опыта и никогда не падает. Показывает, сколько ты сыграл.</p><div class="rw-b rw-bx"><i style="width:${xpP.toFixed(1)}%"></i></div><span>${G.xp} / ${need} опыта</span></div>
      <div class="lv-card"><small>ЛИГА</small><b>${LEAGUES[lg][0]}</b><p>Зависит от кубков: за победу +25 (+30 при разгроме), за поражение −25. Показывает силу.</p><div class="rw-b"><i style="width:${nx ? clamp((G.tro - LEAGUES[lg][1]) / (nx[1] - LEAGUES[lg][1]) * 100, 0, 100).toFixed(1) : 100}%"></i></div><span>${nx ? `до «${nx[0]}» ${nx[1] - G.tro} кубков` : 'высшая лига'}</span></div></div>
    <div class="lv-how"><b>Как получить опыт</b><div class="lv-g"><span>Победа в матче</span><em>+40</em></div><div class="lv-g"><span>Поражение</span><em>+15</em></div><p class="sm mut">Для уровня N нужно N×100 опыта. За каждый новый уровень — базовый кейс.</p></div>
    <div class="lv-how"><b>Следующие уровни</b>${next}</div>
    <button class="btn" data-act="leagues">Все лиги и награды</button></div>`;
}
function vSheet() {
  if (!sheet) return '';
  if (sheet.t === 'qsAsk') { const q = qsSum(), l = Object.keys(QS || {}).map(Number).filter(id => Math.min(QS[id], qsMax(id)) > 0);
    return `<div class="in"><div class="wrap col"><h2>Продать ${q.n} ${plural(q.n, 'карточку', 'карточки', 'карточек')}?</h2><p>Вы получите <b><i class="coin"></i> ${nf(q.coins)}</b> монет. Отменить продажу нельзя.</p>
      <div class="qs-list">${l.slice(0, 40).map(id => `<span>${esc(CARDS[id].nick)} <b>×${Math.min(QS[id], qsMax(id))}</b></span>`).join('')}${l.length > 40 ? `<span>и ещё ${l.length - 40}</span>` : ''}</div>
      <div class="rowb"><button class="btn" data-act="close">Отмена</button><button class="btn pri" data-act="qsSell">Продать за ${nf(q.coins)}</button></div></div></div>`; }
  if (sheet.t === 'qsDone') return `<div class="in"><div class="wrap col"><h2>Продано</h2><p>Продано карточек: <b>${sheet.n}</b>. Получено <b><i class="coin"></i> ${nf(sheet.coins)}</b>.</p><div class="rowb"><button class="btn pri" data-act="close">Отлично</button></div></div></div>`;
  if (sheet.t === 'streak') return streakH();
  if (sheet.t === 'leagues') return leaguesH();
  if (sheet.t === 'lvl') return lvlH();
  if (sheet.t === 'auth') return authH();
  if (sheet.t === 'sync') return syncH();
  if (sheet.t === 'top') return topH();
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

/* ---------- Открытие кейса ----------
   Сначала показывается лучшая карточка кейса. Рейтинг 87+ — церемония: разлом кейса, рубашка цвета редкости,
   затем страна, затем команда, затем карточка. Ниже 87 — карточка сразу целиком с лёгкой подсветкой.
   После этого все пять карточек сеткой. Пропустить можно на любом шаге. */
const WALK_OVR = 87;
const topOf = l => l.reduce((b, x) => (x.c.ovr > b.c.ovr || (x.c.ovr === b.c.ovr && x.c.sp > b.c.sp) ? x : b), l[0]);
const ccOf = c => c.hltv && /^[A-Z]{2}$/.test(c.hltv.countryCode || '') ? c.hltv.countryCode : '';
const flagOf = cc => [...cc].map(ch => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('');
const teamOf = c => !c.hist && c.hltv && c.hltv.team ? c.hltv.team : c.team;
function startPack(type) {
  const cards = openPack(type).map(c => ({ c, isNew: addCard(G, c.id) })).sort((a, b) => (a.c.rar + (a.c.sp ? .5 : 0)) - (b.c.rar + (b.c.sp ? .5 : 0)) || a.c.ovr - b.c.ovr);
  if (G.tut === 0) G.tut = 1;
  OV = { t: 'pack', type, cards, phase: 'case', built: false }; save();
}
function packBuild() {
  const o = $('#over'), d3 = rvOk();
  o.innerHTML = `${d3 ? '<iframe class="rv3d" id="rv3d" title="Открытие кейса"></iframe>' : ''}<canvas id="fx"></canvas><div class="po-bg" id="po-bg"></div><div class="wrap po"><p class="eyebrow" id="po-top">Кейс «${PACKS[OV.type].n}» · 5 карточек</p><div class="po-stage" id="po-stage">${d3 ? '' : `<button data-act="poTap" class="po-pk" aria-label="Открыть кейс">${pkH(OV.type)}</button>`}</div><div class="po-name" id="po-name"><span class="mut">${d3 ? 'Кейс загружается…' : 'Нажмите на кейс, чтобы открыть'}</span></div><div class="rowb" id="po-btn" style="width:100%"><button class="btn s" data-act="poSkip">Показать все сразу</button></div></div>`;
  o.classList.toggle('po3d', d3); o.hidden = false; o.scrollTop = 0; OV.built = true;
  if (d3) rvStart();
}
/* ---------- 3D-открытие кейса ----------
   Сцена из reveal-lab встроена в файл игры (RV_SRC) и запускается в отдельном слое (iframe): своя графика, стили и видеопамять,
   после открытия слой удаляется. Игра присылает лучшую карточку кейса и получает шаги: открыт, флаг, команда, раскрытие, готово.
   Если 3D недоступно или не запустилось за 8 с — обычное открытие (walkout / simpleTop). */
let RV = null, RV_URL = '';
const rvOk = () => { if (rvOk.v === undefined) { try { const c = document.createElement('canvas'); rvOk.v = !!(window.RV_SRC && window.Blob && window.TextDecoder && window.URL && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { rvOk.v = false; } } return rvOk.v && !rvOk.bad; };
function rvUrl() {
  if (!RV_URL) { const b = atob(window.RV_SRC), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    const html = new TextDecoder().decode(u).replace('<head>', '<head><script>window.__EMBED=1<\/script>'); RV_URL = URL.createObjectURL(new Blob([html], { type: 'text/html' })); }
  return RV_URL;
}
const hslHex = (h, s, l) => { const f = n => { const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l), v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); };
/* тот же источник фото, что и у карточки в интерфейсе (faceH): HLTV, фото, добавленное в игре, или папка photos */
const rvPhoto = c => { const s = slug(c.nick); let u = c.hltv && typeof c.hltv.photo === 'string' && /^https:\/\/(?:img-cdn|static)\.hltv\.org\//.test(c.hltv.photo) ? c.hltv.photo : IMG[c.base];
  if (!u && s && typeof PH[s] === 'string') u = PH[s]; if (!u) return ''; try { return new URL(u, location.href).href; } catch (e) { return ''; } };
function rvCard(x, type) { const c = x.c; return { box: PACKS[type] && ['basic', 'pro', 'elite'].includes(type) ? type : 'pro', boxN: PACKS[type] ? PACKS[type].n : '', nick: c.nick, team: teamOf(c), cc: ccOf(c), role: RN[c.role] || '', ovr: c.ovr, rar: rarName(c), col: glow(c), tc: hslHex(hsh(c.team) % 360, .75, .58), st: SK.map(k => [SS[k], c.st[k]]), photo: rvPhoto(c) }; }
function rvStart() {
  const f = $('#rv3d'); if (!f) return; OV.top = topOf(OV.cards); const me = OV;
  RV = { f, ov: me, ready: false, quiet: false };
  RV.t = setTimeout(() => { if (RV && RV.ov === me && !RV.ready) rvFallback(); }, 8000);
  try { f.src = rvUrl(); } catch (e) { rvFallback(); }
}
function rvDrop() { if (RV) clearTimeout(RV.t); RV = null; const f = $('#rv3d'); if (f) f.remove(); const o = $('#over'); if (o) o.classList.remove('po3d'); }
function rvFallback() {
  rvOk.bad = true; rvDrop(); if (!OV || OV.t !== 'pack' || OV.phase !== 'case') return;
  $('#po-stage').innerHTML = `<button data-act="poTap" class="po-pk" aria-label="Открыть кейс">${pkH(OV.type)}</button>`; $('#po-name').innerHTML = '<span class="mut">Нажмите на кейс, чтобы открыть</span>';
}
function rvStep(m) {
  if (m.s === 'open') { if (OV.phase !== 'case') return; OV.phase = 'show'; sfx('open'); if (m.w) { sfx('rare'); $('#po-top').textContent = 'Редкий игрок'; }
    $('#po-name').innerHTML = '<span class="mut">Кейс открывается…</span>'; $('#po-btn').innerHTML = '<button class="btn s" data-act="poSkip" style="width:100%">Пропустить</button>'; return; }
  if (RV.quiet || !stageOk()) return;
  if (m.s === 'flag' || m.s === 'team') sfx('scan');
  else if (m.s === 'reveal') { const c = OV.top.c; sfx('stop', c.sp ? Math.max(3, c.rar) : c.rar); }
}
addEventListener('message', e => {
  const m = e.data; if (!m || !m.rv3d || !RV || !RV.f || e.source !== RV.f.contentWindow) return;
  if (RV.ov !== OV || !OV || OV.t !== 'pack') { rvDrop(); return; }
  if (m.t === 'boot') RV.f.contentWindow.postMessage({ t: 'play', p: rvCard(OV.top, OV.type) }, '*');
  else if (m.t === 'ready') { RV.ready = true; clearTimeout(RV.t); if (OV.phase === 'case') $('#po-name').innerHTML = '<span class="mut">Нажмите на кейс, чтобы открыть</span>'; }
  else if (m.t === 'fail') { if (OV.phase === 'case') rvFallback(); else poDone(); }
  else if (m.t === 'step') rvStep(m);
  else if (m.t === 'done') { if (stageOk()) topDone(OV.top); }
});
const stageOk = () => OV && OV.t === 'pack' && OV.phase === 'show';
function poTap() {
  if (!OV || OV.t !== 'pack' || OV.phase !== 'case') return false;
  OV.phase = 'show'; OV.top = topOf(OV.cards); sfx('open');
  const p = $('.po-pk .pk'); if (p) { p.classList.add('shake'); setTimeout(() => p.classList.add('open'), noMotion() ? 0 : 380); }
  $('#po-name').innerHTML = '<span class="mut">Кейс открывается…</span>';
  $('#po-btn').innerHTML = '<button class="btn s" data-act="poSkip" style="width:100%">Пропустить</button>';
  later(800, () => { if (stageOk()) (OV.top.c.ovr >= WALK_OVR ? walkout : simpleTop)(OV.top); });
  return false;
}
function topDone(x) {
  if (!stageOk()) return;
  OV.phase = 'top'; $('#po-name').innerHTML = nameH(x);
  $('#po-btn').innerHTML = '<button class="btn pri" data-act="poSkip" style="width:100%">Все карточки кейса</button>';
}
/* Обычное открытие: карточка целиком, страна и команда уже на ней */
function simpleTop(x) {
  const c = x.c, r = c.sp ? Math.max(3, c.rar) : c.rar;
  $('#po-bg').style.setProperty('--gl', glow(c));
  $('#po-stage').innerHTML = `<div class="top1" style="--gl:${glow(c)}">${cardH(c, { stats: true })}</div>`;
  sfx('stop', r); burst(glow(c), [10, 16, 28, 40, 60][r], $('.top1'));
  later(700, () => topDone(x));
}
/* Церемония 87+: разлом → рубашка → страна → команда → карточка */
function walkout(x) {
  const c = x.c, cc = ccOf(c), col = glow(c), tc = teamCol(c), team = teamOf(c);
  const st = $('#po-stage'); st.classList.add('wo-on'); $('#po-top').textContent = 'Редкий игрок';
  $('#po-bg').style.setProperty('--gl', '#000');
  st.innerHTML = `<div class="wo" id="wo" style="--rc:${col};--fc:#7d8794"><i class="wo-rays"></i><i class="wo-floor"></i>
    <div class="wo-plate" id="wo-plate"></div>
    <div class="wo-crack">${pkH(OV.type)}<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 50L8 6M50 50L96 14M50 50L92 88M50 50L12 94M50 50L50 0M50 50L0 54M50 50L100 58"/></svg></div>
    <div class="wo-card" id="wo-card"></div></div>`;
  $('#po-name').innerHTML = ''; sfx('rare');
  const plate = html => { const p = $('#wo-plate'); p.className = 'wo-plate'; void p.offsetWidth; p.innerHTML = html; p.className = 'wo-plate in'; };
  const floor = v => { const w = $('#wo'); w.style.setProperty('--fc', v); w.classList.remove('pulse'); void w.offsetWidth; w.classList.add('pulse'); };
  const woCountry = () => { if (!stageOk()) return; floor(`hsl(${hsh(cc) % 360} 70% 52%)`);
    plate(`<span class="wo-flag" role="img" aria-label="${esc(c.hltv.country || cc)}">${flagOf(cc)}</span>`);
    $('#wo-cc').textContent = flagOf(cc); sfx('scan'); later(1500, woTeam); };
  const woTeam = () => { if (!stageOk()) return; floor(tc);
    plate(`<span class="wo-k">Команда</span><b>${esc(team)}</b>`);
    const t = $('#wo-tm'); t.textContent = team; t.style.background = tc; sfx('scan'); later(1500, woCard); };
  const woCard = () => { if (!stageOk()) return; floor(col); $('#wo-plate').className = 'wo-plate';
    $('#wo-card').classList.add('rim');
    later(450, () => { if (!stageOk()) return; flashNow();
      $('#wo-card').innerHTML = `<div class="wo-face">${cardH(c, { stats: true })}</div>`; $('#wo').classList.add('done');
      burst(col, 160, $('#wo-card')); sfx('stop', 4); later(900, () => topDone(x)); }); };
  later(900, () => { if (!stageOk()) return; flashNow(); $('.wo-crack').classList.add('gone'); burst('#ffffff', 40, $('#wo'));
    $('#wo-card').innerHTML = `<div class="wo-back pc r${c.rar} ${c.sp ? 'sp' + c.sp : ''}"><span class="wo-cc" id="wo-cc"></span><span class="wo-tm" id="wo-tm"></span></div>`;
    later(1000, () => cc ? woCountry() : woTeam());
  });
}
const nameH = x => `<b style="color:${glow(x.c)}">${esc(x.c.nick)}</b><span class="sm mut">${rarName(x.c)} · ${esc(teamOf(x.c))} · <span class="bdg ${x.isNew ? 'new' : 'dup'}">${x.isNew ? 'новая' : 'дубль'}</span></span>`;
function poDone() {
  if (!OV || OV.t !== 'pack') return; OV.phase = 'done'; rvDrop();
  const l = [...OV.cards].sort((a, b) => b.c.ovr - a.c.ovr), top = l[0], st = $('#po-stage');
  st.classList.remove('wo-on'); $('#po-top').textContent = `Кейс «${PACKS[OV.type].n}» · 5 карточек`;
  $('#po-bg').style.setProperty('--gl', glow(top.c));
  st.innerHTML = `<div class="grid" style="width:100%">${l.map((x, i) => `<div class="plain big" style="gap:4px;animation-delay:${i * 90}ms"><button data-act="card" data-id="${x.c.id}" aria-label="${esc(x.c.nick)}">${cardH(x.c, { lv: own(x.c.id).lv, pips: true })}</button><span class="bdg ${x.isNew ? 'new' : 'dup'}" style="align-self:flex-start">${x.isNew ? 'новая' : 'дубль'}</span></div>`).join('')}</div>`;
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
const T_BUY = 12000, T_BUY1 = 16000, T_KILL = 150, T_END = 2200, T_HALF = 2200;   /* план 12 с (первый раунд 16 с), раунд на радаре 15–20 с */
let LV = null;
const sideName = s => s === 'A' ? 'в атаке' : 'в защите';
function matchBuild() {
  const o = $('#over'), m = OV.m, q = m.opp;
  o.innerHTML = `<div class="mt"><div class="mt-bg"></div><div class="wrap mt-in" id="mt"><div class="splash"><h1>Матч найден</h1><div class="pn" style="width:100%;text-align:left"><div class="kv"><span>Соперник</span><span>${rankH(q.lg)}</span></div><h2>${esc(q.name)}</h2><div class="stats"><div class="stat"><b>${q.rating.toFixed(1)}</b><span>рейтинг состава</span></div><div class="stat"><b>${LEAGUES[q.lg][0]}</b><span>лига</span></div><div class="stat"><b>${q.tro}</b><span>кубки</span></div></div></div><span class="vs"><span class="x">VS</span></span><p class="eyebrow">Вы · рейтинг ${m.a.info.rating.toFixed(1)} · ${G.tro} кубков</p></div></div></div>`;
  o.hidden = false; o.scrollTop = 0; OV.built = true; sfx('found');
  later(2000, vetoBuild);
}
function vetoBuild() {
  OV.st = 'veto'; OV.vt = 0;
  $('#mt').innerHTML = `<div class="splash"><p class="eyebrow">Выбор карты</p><h2 id="veto-t">Забаньте карту</h2><div class="maps maps5">${OV.maps.map((x, i) => `<button class="map" id="map${i}" data-act="ban" data-v="${i}" style="--h:${x.hue}"><span class="map-rd" aria-hidden="true"><img src="${rdArt(x.n, 512)}" alt=""></span><b>${x.n}</b><span>${x.d}</span></button>`).join('')}</div><p class="sm mut" id="veto-d">Баните по очереди с соперником: вы, соперник, вы, соперник. Играем на оставшейся карте.</p></div>`;
}
/* баны по очереди: игрок, соперник, игрок, соперник — остаётся одна карта */
function vetoBan(i) {
  if (OV.st !== 'veto' || OV.vt % 2 || OV.ban.includes(i)) return;
  const mark = k => { OV.ban.push(k); $('#map' + k).classList.add('ban'); sfx('tap'); OV.vt++; };
  mark(i); const left = () => OV.maps.map((_, k) => k).filter(k => !OV.ban.includes(k));
  const next = () => {
    if (left().length === 1) { const p = left()[0], m = OV.m; m.map = OV.maps[p]; $('#map' + p).classList.add('pick'); $('#veto-t').textContent = 'Играем ' + m.map.n; $('#veto-d').textContent = `Вы начинаете ${sideName(m.sideA)}. Перед каждым раундом выберите точку, темп и приказы — план появится на радаре.`; sfx('win'); later(1900, liveGo); return; }
    if (OV.vt % 2) { $('#veto-t').textContent = 'Соперник банит…'; later(800, () => { mark(pick(left())); next(); }); }
    else $('#veto-t').textContent = 'Забаньте ещё одну карту';
  };
  next();
}
function finishMatch() {
  const m = OV.m; OV.st = 'end'; OV.reward = applyResult(G, m.won, m.a.score, m.b.score);
  taskAdd(G, matchEvent(G, m)); delete G.live; if (G.tut < 3) G.tut = 3; refresh(G, now()); save(); endBuild();
}
/* награда за матч: монеты, кубки с прогрессом лиги, опыт с прогрессом уровня, кейсы, выполненные задания */
function rwBlock(r) {
  const lg = leagueOf(G.tro), nx = LEAGUES[lg + 1], from = LEAGUES[lg][1], pct = nx ? clamp((G.tro - from) / (nx[1] - from) * 100, 0, 100) : 100;
  const need = 100 * G.lvl, xpP = clamp(G.xp / need * 100, 0, 100), lv0 = OV.lv0 || {};
  const tasks = allTasks(G).filter(t => taskDone(t) && !t.claimed && !(OV.tk0 && OV.tk0.has(t.t + '|' + t.n)));
  const caseOf = p => /Про/.test(p) ? 'pro' : /Элит/i.test(p) ? 'elite' : 'basic';
  return `<div class="pn rw-box"><h3>Награда за матч</h3>
    <div class="rw-top"><div class="rw-t rw-c"><svg class="rw-ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#e9b949"/><circle cx="12" cy="12" r="7" fill="none" stroke="#a8761c" stroke-width="1.6"/><path d="M12 7.5v9M9.6 9.6h3.6a1.6 1.6 0 0 1 0 3.2h-2.4a1.6 1.6 0 0 0 0 3.2h3.6" fill="none" stroke="#7a5310" stroke-width="1.5" stroke-linecap="round"/></svg><b>+${r.coins}</b><span>монет · всего ${nf(G.coins)}</span></div>
      <div class="rw-t ${r.tro >= 0 ? 'up' : 'dn'}">${cupSvg}<b>${r.tro >= 0 ? '+' : '−'}${Math.abs(r.tro)}</b><span>кубков · всего ${G.tro}</span></div>
      <div class="rw-t rw-e"><i class="rw-xp">XP</i><b>+${r.xp}</b><span>опыта</span></div></div>
    <div class="rw-bar"><div class="rw-bh"><span>Лига «${LEAGUES[lg][0]}»</span><span>${nx ? `до «${nx[0]}» ${nx[1] - G.tro} кубков` : 'высшая лига'}</span></div><div class="rw-b"><i style="width:${pct.toFixed(1)}%"></i></div></div>
    <div class="rw-bar"><div class="rw-bh"><span>Уровень ${G.lvl}${lv0.lvl && G.lvl > lv0.lvl ? ' · новый!' : ''}</span><span>${G.xp} / ${need} опыта</span></div><div class="rw-b rw-bx"><i style="width:${xpP.toFixed(1)}%"></i></div></div>
    ${r.packs.length ? `<div class="rw-cases">${r.packs.map(p => `<div class="rw-case">${pkH(caseOf(p))}<span>${esc(p[0].toUpperCase() + p.slice(1))}</span></div>`).join('')}</div><p class="sm mut">Кейсы уже во вкладке «Кейсы».</p>` : ''}
    ${AU ? '' : '<div class="rw-acc"><span>Прогресс хранится только на этом устройстве.</span><button class="btn s" data-act="authOpen">Сохранить в аккаунт</button></div>'}
    ${tasks.length ? `<div class="rw-tasks"><b>Выполнены задания</b>${tasks.map(t => `<div class="rw-task"><span>${esc(t.t)}</span><em>${rewardText(t.r)}</em></div>`).join('')}<p class="sm mut">Заберите награду в заданиях на главной.</p></div>` : ''}
  </div>`;
}
function endBuild() {
  const m = OV.m, r = OV.reward, mv = m.mvp(), rep = m.report(), by = rep.eco.buys, bq = k => by[k] ? by[k][1] + ' из ' + by[k][0] : '—';
  const mine = `<table class="tbl sd-${m.sideA}"><tr><th>Вы</th><th>У</th><th>С</th><th>MVP</th><th>1-е</th></tr>${rep.players.slice().sort((p, q) => q.k - p.k).map(p => `<tr class="${m.won && p.nick === mv.nick ? 'star' : ''}"><td>${esc(p.nick)}</td><td>${p.k}</td><td>${p.d}</td><td>${p.mv}</td><td>${p.op}</td></tr>`).join('')}</table>`;
  const opp = `<table class="tbl sd-${other(m.sideA)}"><tr><th>${esc(m.b.name)}</th><th>У</th><th>С</th><th>MVP</th></tr>${m.b.info.e.map((x, i) => ({ n: x.c.nick, k: m.b.k[i], d: m.b.d[i], v: m.b.mv[i] })).sort((p, q) => q.k - p.k).map(p => `<tr class="${!m.won && p.n === mv.nick ? 'star' : ''}"><td>${esc(p.n)}</td><td>${p.k}</td><td>${p.d}</td><td>${p.v}</td></tr>`).join('')}</table>`;
  $('#mt').innerHTML = `<p class="res-t ${m.won ? 'w' : 'l'}">${m.won ? 'Победа' : 'Поражение'}</p><p class="eyebrow" style="text-align:center">${m.a.score}:${m.b.score} · ${m.map.n} · лучший игрок ${esc(mv.nick)}, ${mv.k} уб.</p>
  ${rwBlock(r)}
  ${rep.moments.length ? `<div class="pn rep"><h3>Ключевые моменты</h3><ul>${rep.moments.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
  <div class="pn rep"><h3>Выводы</h3><ul>${rep.notes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div class="pn">${mine}<p class="sm mut">У — убийства, С — смерти, MVP — лучший в раунде, 1-е — первые убийства.</p></div><div class="pn">${opp}</div>
  <div class="pn"><h3>Экономика</h3><p class="sm">Потрачено: $${nf(rep.eco.spent)}. Выиграно раундов: с полной закупкой ${bq('full')}, на форсе ${bq('force')}, на эко ${bq('eco')}, пистолетных ${bq('pistol')}.</p></div>
  <div class="rw-act"><button class="btn pri" data-act="ovClose">Продолжить</button></div>`;
  $('#over').scrollTop = 0; sfx(m.won ? 'win' : 'lose');
}

const TABS = {
  home: ['Главная', vHome, '<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"/>'],
  play: ['Матчи', vPlay, '<path d="M3 10 12 4l9 6v10H3z"/><path d="M6 11h12M6 14h12M8 17h8"/><path d="M12 4v16" stroke-dasharray="1.5 2"/>'],
  col: ['Коллекция', vCol, '<g stroke-width="1.55"><path d="M4 5.5h11.5v15H4z"/><path d="M8 3.5h12v15"/><path d="M7 10h5.5M7 13h5.5"/><circle cx="9.7" cy="8" r="1.1"/></g>'],
  packs: ['Кейсы', vPacks, '<g stroke-width="1.55"><path d="M3 8.5l2-4h14l2 4v11H3z"/><path d="M3 8.5h18M8 4.5l1 4M16 4.5l-1 4M9 13h6v6H9z"/><path d="M11 13v-2h2v2"/></g>'],
  prof: ['Профиль', vProf, '<g stroke-width="1.55"><path d="M12 2.5l8 3v5.7c0 5.2-3.4 8.5-8 10.3-4.6-1.8-8-5.1-8-10.3V5.5z"/><circle cx="12" cy="9" r="2.3"/><path d="M7.8 16.2c.8-2.1 2.2-3.1 4.2-3.1s3.4 1 4.2 3.1"/></g>']
};

function tabMastH() {
  const meta = {
    play: ['COMPETITIVE ARENA / 5V5','МАТЧИ','Собери боевой состав, выбери тактику и выходи на арену.','01'],
    col: ['PLAYER ARCHIVE / COLLECTION','КОЛЛЕКЦИЯ','Полный архив игроков, редкостей, ролей и улучшений.','02'],
    packs: ['ARMORY / SUPPLY DROP','КЕЙСЫ','Открой контейнеры и пополни состав новыми игроками.','03'],
    prof: ['OPERATOR DOSSIER / CAREER','ПРОФИЛЬ','Твой ранг, результаты, сезонная история и достижения.','04']
  }[tab];
  if (!meta) return '';
  return '<section class="section-mast mast-'+tab+'"><div class="section-mast__icon"><svg viewBox="0 0 24 24" aria-hidden="true">'+TABS[tab][2]+'</svg></div><div class="section-mast__copy"><p class="section-mast__eyebrow">'+meta[0]+'</p><h1>'+meta[1]+'</h1><p class="section-mast__desc">'+meta[2]+'</p></div><span class="section-mast__serial">FL / '+meta[3]+'</span></section>';
}

function render() {
  if (!G) return;
  try { refresh(G, now()); } catch (e) { /* задания обновятся при следующем действии */ }
  $('#hud .wrap').innerHTML = hudH();
  const app = $('#app'); app.dataset.tab = tab; app.innerHTML = TABS[tab][1](); if (tab !== 'home') app.insertAdjacentHTML('afterbegin', tabMastH());
  if (tab !== lastTab) {
    const ks = Object.keys(TABS), i = ks.indexOf(tab), j = ks.indexOf(lastTab);
    app.style.setProperty('--dir', j < 0 || i >= j ? 1 : -1); app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
    sceneTo(tab); lastTab = tab;
  } else app.classList.remove('enter');
  const dots = { home: todo(), packs: packCount() > 0 || dailyReady(G, now()) };
  $('#tabs .wrap').innerHTML = Object.keys(TABS).map(k => `<button data-act="tab" data-v="${k}" ${tab === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${TABS[k][2]}</svg>${TABS[k][0]}${dots[k] ? '<span class="dot"></span>' : ''}</button>`).join('');
  if (!sheet && !OV && tab === 'home' && !G.picks.length && G.streak.pend && G.streak.shown !== mskDay(now())) { G.streak.shown = mskDay(now()); sheet = { t: 'streak' }; save(); }
  const sh = $('#sheet'); sh.innerHTML = vSheet(); sh.hidden = !sheet;
  if (sheet && sheet.t === 'leagues' && sheet.go) { sheet.go = 0; lgScroll(); }
  const ov = $('#over');
  if (!OV && G.picks.length && !sheet) OV = { t: 'pick', built: false };
  if (!OV) { if (RV) rvDrop(); ov.innerHTML = ''; ov.hidden = true; ov.classList.remove('po3d'); }
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
  sub(v) { sub = v; colN = 45; QS = null; }, ttab(v) { taskTab = v; }, lb(v) { lbScope = v; }, fown(v) { F.own = v; colN = 45; },
  snd(v) { snd = v; try { localStorage.setItem(SKEY, v); } catch (e) { /* не сохранится */ } sfx('win'); },
  noteOk() { delete G.note; },
  close() { sheet = null; imgMsg = ''; askSell = null; },
  leagues() { sheet = { t: 'leagues', go: 1 }; },
  lvlInfo() { sheet = { t: 'lvl' }; },
  streak() { sheet = { t: 'streak' }; },
  streakClaim() { const r = claimStreak(G, now()); if (!r) return; sfx('stop', r.pack ? (r.pack.elite ? 4 : r.pack.pro ? 3 : 1) : 0); if (sheet && sheet.t === 'streak') sheet.got = r; else sheet = { t: 'streak', got: r }; },
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
  qsOn() { QS = {}; }, qsOff() { QS = null; }, qsNone() { QS = {}; },
  qsTog(v, d) { const id = +d.id, mx = qsMax(id); if (!QS || !mx) return false; if (QS[id]) delete QS[id]; else QS[id] = mx; },
  qsDups() { QS = {}; for (const id in G.cards) if (own(+id).n > 1) QS[id] = own(+id).n - 1; },
  qsAll() { QS = {}; for (const id in G.cards) { const c = CARDS[id]; if (c && !c.sp && qsMax(+id) > 0) QS[id] = qsMax(+id); } },
  qsDupsGo() { QS = {}; for (const id in G.cards) if (own(+id).n > 1) QS[id] = own(+id).n - 1; sheet = { t: 'qsAsk' }; },
  qsAsk() { if (QS && qsSum().n) sheet = { t: 'qsAsk' }; },
  qsSell() { if (!QS) { sheet = null; return; } let n = 0, coins = 0; for (const id in QS) { const k = Math.min(QS[id], qsMax(+id)); for (let i = 0; i < k; i++) { coins += sellOne(G, +id); n++; } } QS = null; sheet = { t: 'qsDone', n, coins }; if (n) sfx('stop', 1); },
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
  poTap() { return poTap(); },
  poSkip() { if (OV && OV.t === 'pack' && OV.phase === 'show' && RV && RV.ready) { RV.quiet = true; RV.f.contentWindow.postMessage({ t: 'skip' }, '*'); return false; } if (OV && OV.t === 'pack' && OV.phase !== 'done') poDone(); return false; },
  ovClose() { OV = null; LV = null; window.scrollTo(0, 0); },
  fight() { const sq = squadOf(G), info = squadInfo(sq); if (!info) return; OV = { t: 'match', st: 'found', m: new Match(sq, G.tro, info.rating, { capt: captSlot(G) }), maps: RD_POOL.map(n => MAPS.find(x => x.n === n)).filter(Boolean), ban: [], vt: 0, sel: [], plan: { dir: 'S', tempo: 'norm', focus: -1, buy: null }, reward: null, askQuit: false, built: false, tk0: new Set(allTasks(G).filter(taskDone).map(t => t.t + '|' + t.n)), lv0: { tro: G.tro, lvl: G.lvl, xp: G.xp, coins: G.coins } }; G.live = { sa: 0, sb: 0 }; },
  ban(v) { vetoBan(+v); return false; },
  focus(v) { if (OV && OV.st === 'live' && LV && LV.ph === 'buy') { OV.plan.focus = OV.plan.focus === +v ? -1 : +v; planDraw(); } return false; },
  skipRound() { if (LV && LV.ph === 'round' && !LV.ask) LV.rt = LV.pre ? LV.callT : LV.S.T; return false; },
  pause() { if (LV) { LV.paused = !LV.paused; lvBtns(); } return false; },
  mc(v) { if (LV && LV.ask) callPick(+v); return false; },
  qp(v) { if (OV && OV.st === 'live' && LV && LV.ph === 'buy' && QP[OV.m.sideA][+v]) { qpApply(+v); LV.tuned = true; LV.t = 0; sfx('tap'); } return false; },
  goRound() { if (LV && LV.ph === 'buy' && OV && OV.st === 'live') LV.t = 0; return false; },
  spd() { if (LV) { LV.spd = LV.spd === 1 ? 2 : 1; lvBtns(); } return false; },
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
document.addEventListener('keydown', e => { const t = e.target; if ((e.key === 'Enter' || e.key === ' ') && t && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset.act && t.tagName !== 'BUTTON') { e.preventDefault(); t.click(); } });
document.addEventListener('input', e => {
  if (e.target.id === 'col-q') { F.q = e.target.value; colN = 45; const g = $('#col-grid'); if (g) g.innerHTML = colGrid(); }
  if (e.target.id === 'cmp-q' && sheet && sheet.t === 'cmpPick') { sheet.q = e.target.value; const tmp = document.createElement('div'); tmp.innerHTML = vSheet(); const nl = tmp.querySelector('#cmp-list'), l = $('#cmp-list'); if (nl && l) l.innerHTML = nl.innerHTML; }
});
document.addEventListener('change', e => {
  if (e.target.id === 'img-in' && e.target.files && e.target.files[0]) addImage(e.target.files[0], +e.target.dataset.base);
  if (e.target.dataset && e.target.dataset.f) { F[e.target.dataset.f] = e.target.value; colN = 45; const g = $('#col-grid'); if (g) g.innerHTML = colGrid(); else if (tab === 'col' && sub === 'mine') render(); }
});
function start() {
  const r = load();
  if (r !== 'ok') { G = newProfile(now()); if (r === 'broken') G.note = 'Сохранение не удалось прочитать. Его копия оставлена в памяти браузера, начата новая игра.'; }
  if (G.live) { applyResult(G, false, G.live.sa || 0, G.live.sb || 0); delete G.live; G.note = 'Прошлый матч был прерван и засчитан как поражение.'; }
  cloudStart(); save(); render();
}
