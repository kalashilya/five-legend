/* ===== Интерфейс ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => Math.round(n).toLocaleString('ru-RU');
const KEY = 'pyaterka-legend-v1', IKEY = KEY + '-img', SKEY = KEY + '-mute';
let G, IMG = {}, tab = 'home', lastTab = null, sheet = null, OV = null, askNew = false, colF = 'all', colQ = '', colN = 45, imgMsg = '', mute = false;

function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* без хранилища игра идёт до закрытия страницы */ } }
function load() {
  try { mute = localStorage.getItem(SKEY) === '1'; } catch (e) { /* звук включён */ }
  try { const im = JSON.parse(localStorage.getItem(IKEY)); if (im && typeof im === 'object') IMG = im; } catch (e) { /* нет картинок */ }
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === 1 && d.cards && d.squad) { G = d; return true; } } catch (e) { /* пусто */ }
  return false;
}
const own = id => G.cards[id];
const packCount = () => G.packs.basic + G.packs.pro + G.packs.elite;
const dailyReady = () => Date.now() - G.daily >= DAY;
const RCOL = ['#b0c3d9', '#6c8cff', '#a274ff', '#e45cf2', '#ff5a5a'];
const glow = c => c.sp === 1 ? '#ff8a3d' : c.sp === 2 ? '#f2c14e' : RCOL[c.rar];
const rarName = c => c.sp ? SPN[c.sp] : RAR[c.rar];
const noMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/* ---------- Звук: короткие синтезированные сигналы ---------- */
let AUD = null;
function snd(f, d = .06, type = 'square', v = .04, to = 0) {
  if (mute) return;
  try {
    AUD = AUD || new (window.AudioContext || window.webkitAudioContext)();
    const o = AUD.createOscillator(), g = AUD.createGain(), t = AUD.currentTime;
    o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(AUD.destination); o.start(t); o.stop(t + d);
  } catch (e) { /* звук недоступен */ }
}
const SFX = {
  tap: () => snd(900, .03, 'square', .02), tick: () => snd(1400, .02, 'square', .015),
  stop: r => { snd(300 + r * 120, .18, 'triangle', .07); if (r >= 3) setTimeout(() => snd(600 + r * 160, .4, 'sawtooth', .05, 1400), 90); },
  open: () => snd(160, .35, 'sawtooth', .06, 60), kill: () => snd(180, .07, 'square', .04, 70),
  win: () => { snd(520, .12, 'triangle', .07); setTimeout(() => snd(780, .22, 'triangle', .07), 110); },
  lose: () => snd(260, .3, 'triangle', .06, 140), found: () => { snd(440, .1, 'square', .04); setTimeout(() => snd(660, .1, 'square', .04), 120); setTimeout(() => snd(880, .25, 'square', .04), 240); }
};

/* ---------- Фото игроков: файл photos/<ник>.png|jpg рядом с игрой либо картинка, добавленная на экране карточки ---------- */
const PH = {}, EXT = ['png', 'jpg', 'jpeg', 'webp'];
const slug = n => n.toLowerCase().replace(/[^a-z0-9а-яё_-]/g, '');
function probe(s, i) {
  if (i >= EXT.length) return;
  const im = new Image(), u = 'photos/' + s + '.' + EXT[i];
  im.onload = () => { PH[s] = u; document.querySelectorAll('[data-ph="' + s + '"]').forEach(el => { el.outerHTML = `<img class="ph" src="${u}" alt="">`; }); };
  im.onerror = () => probe(s, i + 1); im.src = u;
}
function faceH(c) {
  const s = slug(c.nick); let u = IMG[c.base];
  if (!u && s) { if (typeof PH[s] === 'string') u = PH[s]; else if (PH[s] === undefined) { PH[s] = 0; probe(s, 0); } }
  return u ? `<img class="ph" src="${u}" alt="">` : `<svg class="art" data-ph="${s}" viewBox="0 0 100 100" aria-hidden="true"><use href="#sil"/></svg>`;
}

function cardH(c, o = {}) {
  const lv = o.lv || 1, add = lv - 1;
  return `<div class="pc r${c.rar} ${c.sp ? 'sp' + c.sp : ''} ${o.cls || ''} ${o.no ? 'no' : ''}" style="--tc:hsl(${hsh(c.team) % 360} 75% 58%)"><span class="mg">${esc(c.nick.slice(0, 2))}</span>${faceH(c)}<span class="sh"></span><div class="hd"><span class="ov">${c.ovr + add}</span><span class="rl">${RN[c.role]}</span></div><span class="rk">#${c.t + 1}</span><div class="ft">${c.sp ? `<span class="tag">${SPN[c.sp]}</span>` : ''}<span class="nk">${esc(c.nick)}</span><span class="tm">${esc(c.team)}</span>${o.stats ? `<span class="sg">${SK.map(k => `<span><b>${c.st[k] + add}</b>${SS[k]}</span>`).join('')}</span>` : ''}${o.pips ? `<span class="lv">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span>` : ''}</div>${o.n > 1 ? `<span class="cnt">×${o.n}</span>` : ''}</div>`;
}
const ownH = (id, cls) => { const o = own(id); return cardH(CARDS[id], { lv: o ? o.lv : 1, n: o ? o.n : 0, cls, pips: !!o, no: !o }); };
const pkH = (t, cls) => `<div class="pk ${t} ${cls || ''}"><i class="lid"></i><i class="lock"></i><div class="box"><b>${PACKS[t].n}</b></div></div>`;
const LCOL = ['#b98a5a', '#b9c2cc', '#f2c14e', '#7fe0d0', '#8fb8ff', '#e45cf2', '#ff5a5a'];
const rankH = i => `<svg class="rank" viewBox="0 0 44 30" aria-hidden="true"><path d="M2 2h40v17L22 28 2 19z" fill="#101215" stroke="${LCOL[i]}" stroke-width="1.6"/>${[0, 1, 2].slice(0, i % 3 + 1).map(k => `<path d="M12 ${7 + k * 5}l10 4 10-4" fill="none" stroke="${LCOL[i]}" stroke-width="2.2"/>`).join('')}</svg>`;
function hudH() {
  const lg = leagueOf(G.tro);
  return `<div class="who">${rankH(lg)}<div style="min-width:0"><b>${LEAGUES[lg][0]} · ${G.tro}</b><span class="sm mut">уровень ${G.lvl}</span><span class="xp" aria-label="Опыт ${G.xp} из ${100 * G.lvl}"><i style="width:${G.xp / G.lvl}%"></i></span></div></div><div class="pill"><i class="coin"></i>${nf(G.coins)}</div><button class="ibtn" data-act="mute" aria-label="${mute ? 'Включить звук' : 'Выключить звук'}"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/>${mute ? '<path d="M17 9l5 6M22 9l-5 6"/>' : '<path d="M17 8a5 5 0 0 1 0 8"/>'}</svg></button>`;
}

function vHome() {
  const lg = leagueOf(G.tro), nx = LEAGUES[lg + 1], info = squadInfo(squadOf(G)), left = DAY - (Date.now() - G.daily);
  const prog = nx ? (G.tro - LEAGUES[lg][1]) / (nx[1] - LEAGUES[lg][1]) * 100 : 100;
  return `<section class="lobby"><div class="kv"><span>Ваша пятёрка</span><span>Рейтинг <b>${info.rating.toFixed(1)}</b></span></div>
  <div class="lineup">${G.squad.map(id => `<button data-act="card" data-id="${id}" aria-label="${esc(CARDS[id].nick)}">${ownH(id, 'xs')}</button>`).join('')}</div>
  <button class="btn pri go" data-act="fight">Играть</button>
  <div class="stats"><div class="stat"><b>${info.atk.toFixed(1)}</b><span>атака</span></div><div class="stat"><b>${info.def.toFixed(1)}</b><span>защита</span></div><div class="stat"><b>${info.chem}/13</b><span>химия</span></div></div></section>
  <section class="pn"><div class="kv"><span>Лига «${LEAGUES[lg][0]}»</span><span>Побед <b>${G.w}</b> · поражений <b>${G.l}</b></span></div><span class="bar"><i style="width:${prog}%"></i></span><p class="sm mut">${nx ? `До лиги «${nx[0]}» ещё ${nx[1] - G.tro} кубков. За новую лигу дают кейс «Про».` : 'Высшая лига достигнута.'}</p></section>
  <section class="pn"><div class="shop">${pkH('basic')}<div class="plain"><h3>Бесплатный кейс</h3>${dailyReady() ? '<button class="btn" data-act="daily">Забрать</button>' : `<p class="sm mut">Следующий через ${Math.max(1, Math.ceil(left / 3600000))} ч.</p>`}${packCount() ? `<button class="btn s" data-act="tab" data-v="packs">Неоткрытых кейсов: ${packCount()}</button>` : ''}</div></div></section>
  <p class="sm mut">Составы команд взяты из рейтинга Valve от 2 ноября 2026. Показатели карточек рассчитаны игрой, это не статистика HLTV. Фото игроков берутся из папки photos рядом с файлом игры: имя файла — ник маленькими буквами, например zywoo.png.</p>
  <section class="plain">${askNew ? '<p class="sm">Коллекция и прогресс будут удалены. Начать заново?</p><div class="rowb"><button class="btn dan s" data-act="newYes">Да, начать заново</button><button class="btn s" data-act="newNo">Отмена</button></div>' : '<button class="btn s" data-act="newAsk">Начать заново</button>'}</section>`;
}
function vPacks() {
  const inv = Object.keys(PACKS).filter(k => G.packs[k] > 0);
  return `${inv.length ? `<section class="plain"><h3>Ваши кейсы</h3>${inv.map(k => `<div class="pn"><div class="shop">${pkH(k)}<div class="plain"><h2>${PACKS[k].n} <span class="num mut" style="font-size:15px">×${G.packs[k]}</span></h2><button class="btn pri" data-act="open" data-v="${k}">Открыть</button></div></div></div>`).join('')}</section>` : ''}
  <section class="plain"><h3>Магазин</h3>${Object.keys(PACKS).map(k => { const P = PACKS[k]; return `<div class="pn"><div class="shop">${pkH(k)}<div class="plain"><h2>${P.n}</h2><p class="sm mut">${P.d}</p><div class="pill" style="align-self:flex-start"><i class="coin"></i>${nf(P.price)}</div></div></div><div class="odds">${P.odds.map((o, i) => `<span style="--rc:var(--r${i})">${o}%</span>`).join('')}</div><button class="btn" data-act="buy" data-v="${k}" ${G.coins < P.price ? 'disabled' : ''}>${G.coins < P.price ? 'Не хватает монет' : 'Купить и открыть'}</button></div>`; }).join('')}</section>
  <p class="sm mut">В кейсе пять карточек. Проценты показывают шанс редкости каждой из них: ${RAR.map(x => x.toLowerCase()).join(', ')}. Внутри редкости реже выпадают игроки с высоким рейтингом и из команд выше в таблице. С шансом 7% вместо обычной версии выпадает «${SPN[1]}» (+3 к рейтингу), с шансом 12% вместо высшей редкости выпадает «${SPN[2]}».</p>`;
}
function colList() {
  const q = colQ.trim().toLowerCase();
  return ALL.filter(c => (colF === 'all' || (colF === 'mine' ? own(c.id) : colF === 'sp' ? c.sp : !c.sp && c.rar === +colF)) && (!q || c.nick.toLowerCase().includes(q) || c.team.toLowerCase().includes(q)));
}
function colGrid() {
  const l = colList();
  return `<p class="sm mut">Найдено: ${l.length}</p><div class="grid">${l.slice(0, colN).map(c => `<button data-act="card" data-id="${c.id}" aria-label="${esc(c.nick)}">${ownH(c.id)}</button>`).join('')}</div>${l.length > colN ? '<button class="btn" data-act="more">Показать ещё</button>' : ''}`;
}
function vCol() {
  const have = Object.keys(G.cards).length, F = [['all', 'Все'], ['mine', 'Мои'], ['4', RAR[4]], ['3', RAR[3]], ['2', RAR[2]], ['1', RAR[1]], ['0', RAR[0]], ['sp', 'Особые']];
  return `<section class="pn"><div class="kv"><span>Инвентарь</span><span><b>${have}</b> из ${ALL.length}</span></div><span class="bar"><i style="width:${have / ALL.length * 100}%"></i></span></section>
  <input type="text" id="col-q" placeholder="Ник или команда" value="${esc(colQ)}" aria-label="Поиск по нику или команде">
  <div class="chips">${F.map(([k, n]) => `<button class="chip" data-act="filter" data-v="${k}" aria-pressed="${colF === k}" style="${k === 'sp' ? '--rc:var(--sp)' : k >= '0' && k <= '4' ? `--rc:var(--r${k})` : ''}">${n}</button>`).join('')}</div>
  <div class="plain" id="col-grid">${colGrid()}</div>`;
}
function vSquad() {
  const sq = squadOf(G), info = squadInfo(sq);
  return `<div class="stats"><div class="stat"><b>${info.rating.toFixed(1)}</b><span>рейтинг</span></div><div class="stat"><b>${info.atk.toFixed(1)}</b><span>сила в атаке</span></div><div class="stat"><b>${info.def.toFixed(1)}</b><span>сила в защите</span></div></div>
  <section class="plain">${G.squad.map((id, i) => { const c = CARDS[id], off = c.role !== i; return `<button class="slot" data-act="slot" data-v="${i}"><span>${ownH(id, 'xs')}</span><span style="min-width:0"><span class="eyebrow">${RNAME[i]}</span><b style="display:block;font:600 19px/1.1 var(--f-d);text-transform:uppercase;overflow-wrap:anywhere">${esc(c.nick)}</b><span class="sm mut">${esc(c.team)}</span>${off ? '<span class="warn" style="display:block">Не своя роль: −5 ко всем показателям</span>' : ''}</span><span class="sm mut">Сменить</span></button>`; }).join('')}</section>
  <section class="pn"><h3>Химия ${info.chem} из 13</h3><p class="sm mut">Игроков из одной команды: ${info.mx}. Два дают +2, три +4, четыре +7, пять +10. ${info.onRole ? 'Все на своих ролях: +3.' : 'Если все пятеро на своих ролях, добавится ещё +3.'} Каждые 4 очка химии дают +1 к силе состава.</p><button class="btn" data-act="auto">Собрать лучший состав</button></section>
  <section class="pn"><h3>Тактические карты</h3>${DECK.map(k => `<p class="sm"><b>${AC[k].n}</b> <span class="num mut">${AC[k].cost}</span> <span class="mut">— ${AC[k].d}</span></p>`).join('')}</section>`;
}
function vSheet() {
  if (!sheet) return '';
  if (sheet.t === 'slot') {
    const i = sheet.slot, used = new Set(G.squad.filter((x, k) => k !== i).map(id => CARDS[id].nick));
    const l = Object.keys(G.cards).map(id => CARDS[id]).filter(c => !used.has(c.nick)).sort((a, b) => (b.role === i) - (a.role === i) || (b.ovr + own(b.id).lv) - (a.ovr + own(a.id).lv)).slice(0, 60);
    return `<div class="in"><div class="wrap col"><h2>${RNAME[i]}: кого поставить</h2><p class="sm mut">Сначала показаны игроки этой роли. Чужая роль даёт −5 ко всем показателям.</p><div class="list">${l.map(c => `<button class="prow" style="--rc:${glow(c)}" data-act="put" data-id="${c.id}" data-v="${i}"><span class="o" style="color:${glow(c)}">${c.ovr + own(c.id).lv - 1 - (c.role === i ? 0 : 5)}</span><span style="min-width:0"><b>${esc(c.nick)}</b>${c.sp ? ` <span class="sm" style="color:${glow(c)}">${SPN[c.sp]}</span>` : ''}<span class="sm mut" style="display:block">${RN[c.role]} · ${esc(c.team)}</span></span><span class="sm mut">${G.squad[i] === c.id ? 'в составе' : ''}</span></button>`).join('')}</div><button class="btn" data-act="close">Закрыть</button></div></div>`;
  }
  const c = CARDS[sheet.id], o = own(c.id), lv = o ? o.lv : 1, add = lv - 1;
  let act = '';
  if (o) {
    if (o.lv < 5) { const need = UP_N[o.lv - 1], cost = upCost(c, o.lv); act += `<button class="btn pri" data-act="up" data-id="${c.id}" ${canUp(G, c.id) ? '' : 'disabled'}>Уровень ${o.lv + 1}: ${need} дубл. и ${nf(cost)} мон.</button><p class="sm mut">Дубликатов: ${o.n - 1}. Каждый уровень даёт +1 ко всем показателям.</p>`; }
    else act += '<p class="sm">Максимальный уровень.</p>';
    if (o.n > 1) act += `<div class="rowb"><button class="btn s" data-act="sell" data-id="${c.id}">Продать дубль за ${nf(sellVal(c))}</button><button class="btn s" data-act="sellAll" data-id="${c.id}">Продать все за ${nf(sellVal(c) * (o.n - 1))}</button></div>`;
    act += G.squad.includes(c.id) ? '<p class="sm mut">Сейчас в составе.</p>' : `<button class="btn" data-act="put" data-id="${c.id}" data-v="${c.role}">Поставить в состав на роль «${RNAME[c.role]}»</button>`;
  } else act = '<p class="sm mut">Этой карточки у вас пока нет. Она выпадает из кейсов.</p>';
  const pic = `<div class="rowb"><label class="btn s" for="img-in" tabindex="0">${IMG[c.base] ? 'Заменить фото' : 'Добавить фото'}</label>${IMG[c.base] ? `<button class="btn s" data-act="imgDel" data-id="${c.base}">Убрать фото</button>` : ''}</div><input type="file" id="img-in" accept="image/*" data-base="${c.base}" hidden><p class="sm mut">${imgMsg || `Фото хранится в этом браузере. Чтобы оно было у всех версий игры, положите файл ${esc(slug(c.nick))}.png в папку photos.`}</p>`;
  return `<div class="in"><div class="wrap col"><div class="insp"><div class="tilt">${cardH(c, { lv, pips: !!o, stats: true })}</div></div><div class="plain" style="text-align:center;gap:4px"><p class="eyebrow" style="color:${glow(c)}">${rarName(c)}</p><h2 style="overflow-wrap:anywhere">${esc(c.nick)}</h2><p class="sm mut">${RNAME[c.role]} · ${esc(c.team)}, место команды ${c.t + 1} · ${o ? 'копий ' + o.n + ', уровень ' + o.lv : 'нет в инвентаре'}</p></div>
  <div class="plain" style="--rc:${glow(c)}">${SK.map(k => `<div class="attr"><span class="mut">${SN[k]}</span><span class="bar"><i style="width:${c.st[k] + add}%"></i></span><b>${c.st[k] + add}</b></div>`).join('')}</div>${act}${pic}<button class="btn" data-act="close">Закрыть</button></div></div>`;
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
  let d = ''; for (let i = 0; i < 16; i++) d += `<i style="left:${ri(0, 100)}%;top:${ri(40, 100)}%;--dx:${ri(-60, 60)}px;animation-duration:${ri(9, 20)}s;animation-delay:-${ri(0, 18)}s"></i>`;
  $('#dust').innerHTML = d;
}
function sceneTo(t) {
  const i = Math.max(0, Object.keys(TABS).indexOf(t));
  $('#scene').dataset.s = t; $('#pan-near').style.transform = `translate3d(${-i * 25}%,0,0)`; $('#pan-far').style.transform = `translate3d(${-i * 17}%,0,0)`;
}

/* ---------- Вскрытие кейса: пять лент, останавливаются по очереди ---------- */
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
function startPack(type) {
  const cards = openPack(type).map(c => ({ c, isNew: addCard(G, c.id) })).sort((a, b) => (a.c.rar + (a.c.sp ? .5 : 0)) - (b.c.rar + (b.c.sp ? .5 : 0)) || a.c.ovr - b.c.ovr);
  OV = { t: 'pack', type, cards, phase: 'case', built: false, left: 5 }; save();
}
function packBuild() {
  const o = $('#over');
  o.innerHTML = `<canvas id="fx"></canvas><div class="po-bg" id="po-bg"></div><div class="wrap po"><p class="eyebrow">Кейс «${PACKS[OV.type].n}» · 5 карточек</p><div class="po-stage" id="po-stage"><button data-act="poTap" class="po-pk" aria-label="Открыть кейс">${pkH(OV.type)}</button></div><div class="po-name" id="po-name"><span class="mut">Нажмите на кейс, чтобы открыть</span></div><div class="rowb" id="po-btn" style="width:100%"><button class="btn s" data-act="poSkip">Показать сразу</button></div></div>`;
  o.hidden = false; o.scrollTop = 0; OV.built = true;
}
function reelsBuild() {
  const P = PACKS[OV.type], st = $('#po-stage'), W = st.clientWidth, tw = W < 340 ? 52 : 62, step = tw + 6, HIT = 24, N = 29, me = OV;
  st.innerHTML = OV.cards.map((x, i) => { let h = ''; for (let k = 0; k < N; k++) h += `<div class="${k === HIT ? 'hit' : ''}">${cardH(k === HIT ? x.c : pick(POOL[rollRar(P.odds)]), { cls: 'xs' })}</div>`; return `<div class="reel" id="reel${i}" style="--tw:${tw}px;--gl:${glow(x.c)}"><div class="strip">${h}</div></div>`; }).join('');
  $('#po-name').innerHTML = '<span class="mut">Ленты останавливаются по очереди</span>';
  OV.phase = 'spin';
  const tk = setInterval(() => { if (OV !== me || OV.phase !== 'spin') clearInterval(tk); else SFX.tick(); }, 95);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (OV !== me) return;
    OV.cards.forEach((x, i) => {
      const s = $('#reel' + i + ' .strip'), dur = noMotion() ? 0 : 2000 + i * 620;
      s.style.transition = `transform ${dur}ms cubic-bezier(.12,.62,.1,1)`;
      s.style.transform = `translate3d(${W / 2 - (HIT * step + tw / 2) - rnd(-.34, .34) * tw}px,0,0)`;
      setTimeout(() => { if (OV === me && OV.phase === 'spin') reelStop(i); }, dur + 60);
    });
  }));
}
function reelStop(i) {
  const x = OV.cards[i], r = x.c.sp ? Math.max(3, x.c.rar) : x.c.rar, el = $('#reel' + i);
  el.classList.add('stop'); SFX.stop(r); burst(glow(x.c), [0, 10, 26, 70, 140][r], el.querySelector('.hit'));
  if (r >= 3) flashNow();
  $('#po-bg').style.setProperty('--gl', glow(x.c));
  $('#po-name').innerHTML = `<b style="color:${glow(x.c)}">${esc(x.c.nick)}</b><span class="sm mut">${rarName(x.c)} · ${esc(x.c.team)} · <span class="bdg ${x.isNew ? 'new' : 'dup'}">${x.isNew ? 'новая' : 'дубль'}</span></span>`;
  if (--OV.left <= 0) { OV.phase = 'stopped'; $('#po-btn').innerHTML = '<button class="btn pri" data-act="poSkip">Показать карточки</button>'; }
}
function poTap() {
  if (!OV || OV.t !== 'pack' || OV.phase !== 'case') return;
  OV.phase = 'busy'; const me = OV, p = $('.po-pk .pk'); SFX.open();
  if (p) { p.classList.add('shake'); setTimeout(() => p.classList.add('open'), noMotion() ? 0 : 380); }
  setTimeout(() => { if (OV === me && OV.phase === 'busy') { flashNow(); reelsBuild(); } }, noMotion() ? 0 : 950);
}
function poDone() {
  OV.phase = 'done';
  const l = [...OV.cards].sort((a, b) => b.c.ovr - a.c.ovr), top = l[0];
  $('#po-bg').style.setProperty('--gl', glow(top.c));
  $('#po-stage').innerHTML = `<div class="grid" style="width:100%">${l.map((x, i) => `<div class="plain big" style="gap:4px;animation-delay:${i * 70}ms"><button data-act="card" data-id="${x.c.id}" aria-label="${esc(x.c.nick)}">${cardH(x.c, { lv: own(x.c.id).lv, pips: true })}</button><span class="bdg ${x.isNew ? 'new' : 'dup'}" style="align-self:flex-start">${x.isNew ? 'новая' : 'дубль'}</span></div>`).join('')}</div>`;
  $('#po-name').innerHTML = `<b style="color:${glow(top.c)}">Лучшая: ${esc(top.c.nick)}</b><span class="sm mut">Новых карточек: ${l.filter(x => x.isNew).length} из 5</span>`;
  $('#po-btn').innerHTML = '<button class="btn pri" data-act="ovClose">Забрать</button>';
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

/* ---------- Матч: заставка, бан карты, раунды в реальном времени, итог ---------- */
const T_BUY = 2200, T_BUY1 = 4200, T_KILL = 160, T_END = 800, T_HALF = 1700;
let LV = null;
const sideName = s => s === 'A' ? 'в атаке' : 'в защите', other = s => s === 'A' ? 'D' : 'A';
const later = (ms, fn) => { const me = OV; setTimeout(() => { if (OV === me) fn(); }, noMotion() ? Math.min(ms, 200) : ms); };
function matchBuild() {
  const o = $('#over'), m = OV.m;
  o.innerHTML = `<div class="mt"><div class="mt-bg"></div><div class="wrap mt-in" id="mt"><div class="splash"><h1>Матч найден</h1><div class="vs"><p class="eyebrow">${esc(m.b.name)} · рейтинг ${m.b.info.rating.toFixed(1)}</p><div class="grid g5 op">${m.b.sq.map(x => cardH(x.c, { cls: 'xs' })).join('')}</div><span class="x">VS</span><div class="grid g5">${m.a.sq.map(x => cardH(x.c, { cls: 'xs', lv: x.lv })).join('')}</div><p class="eyebrow">Вы · рейтинг ${m.a.info.rating.toFixed(1)}</p></div></div></div></div>`;
  o.hidden = false; o.scrollTop = 0; OV.built = true; SFX.found();
  later(1900, vetoBuild);
}
function vetoBuild() {
  OV.st = 'veto';
  $('#mt').innerHTML = `<div class="splash"><p class="eyebrow">Выбор карты</p><h2 id="veto-t">Забаньте одну карту</h2><div class="maps">${OV.maps.map((x, i) => `<button class="map" id="map${i}" data-act="ban" data-v="${i}" style="--h:${x.hue}"><b>${x.n}</b><span>${x.d}</span></button>`).join('')}</div><p class="sm mut" id="veto-d">Соперник ${STYLES[OV.m.style].n}: ${STYLES[OV.m.style].d}.</p></div>`;
}
function vetoBan(i) {
  if (OV.st !== 'veto' || OV.ban.length) return;
  OV.ban.push(i); $('#map' + i).classList.add('ban'); SFX.tap(); $('#veto-t').textContent = 'Соперник банит…';
  later(700, () => {
    const rest = [0, 1, 2].filter(k => k !== i), b = pick(rest), p = rest.find(k => k !== b), m = OV.m;
    $('#map' + b).classList.add('ban'); SFX.tap();
    later(600, () => { m.map = OV.maps[p]; $('#map' + p).classList.add('pick'); $('#veto-t').textContent = 'Играем ' + m.map.n; $('#veto-d').textContent = `Вы начинаете ${sideName(m.sideA)}. Игра до 13 побед, смена сторон после 12 раунда.`; SFX.win(); later(1500, liveBuild); });
  });
}
const chipH = (x, id) => `<div class="chipp" id="${id}"><div class="f">${faceH(x.c).replace('class="art"', '')}<span class="k">0</span></div><span class="n">${esc(x.c.nick)}</span></div>`;
function liveBuild() {
  const m = OV.m; OV.st = 'live';
  document.querySelector('.mt').style.setProperty('--mh', m.map.hue);
  $('#mt').innerHTML = `<div class="sbar"><div class="t" id="tA"><b>Вы</b><span id="monA"></span></div><div class="c"><b id="scA">0</b><div><span id="rn"></span><span>${m.map.n}</span></div><b id="scB">0</b></div><div class="t r" id="tB"><b>${esc(m.b.name)}</b><span id="monB"></span></div></div>
  <div class="hist" id="hist"></div>
  <div class="arena"><div class="trow" id="rowB">${m.b.info.e.map((x, i) => chipH(x, 'cB' + i)).join('')}</div><div class="mid"><div class="played" id="played"></div><div class="feed" id="feed" aria-live="off"></div><div id="bn"></div></div><div class="trow" id="rowA">${m.a.info.e.map((x, i) => chipH(x, 'cA' + i)).join('')}</div></div>
  <div class="phase"><b id="phl"></b><span class="bar"><i id="phb"></i></span><span id="buyl"></span></div>
  <div class="en" id="en"></div><div class="hand" id="hand"></div><div class="rowb" id="mbtn"></div>`;
  LV = { ph: 'buy', t: 0, T: 1, q: [], paused: false, last: null, ts: 0, kc: { A: [0, 0, 0, 0, 0], B: [0, 0, 0, 0, 0] } };
  lvBuy(true); lvBtns(); requestAnimationFrame(lvTick);
}
function lvBtns() { $('#mbtn').innerHTML = OV.askQuit ? '<button class="btn dan s" data-act="quitYes">Сдаться, засчитать поражение</button><button class="btn s" data-act="quitNo">Играть дальше</button>' : `<button class="btn s" data-act="pause">${LV.paused ? 'Продолжить' : 'Пауза'}</button><button class="btn s" data-act="quitAsk">Сдаться</button>`; }
function lvHud() {
  const m = OV.m, a = m.a, b = m.b;
  $('#rn').textContent = m.over ? 'Финал' : m.decider ? 'Решающий' : 'Раунд ' + m.round;
  $('#tA').className = 't sd-' + m.sideA; $('#rowA').className = 'trow sd-' + m.sideA; $('#tB').className = 't r sd-' + other(m.sideA); $('#rowB').className = 'trow sd-' + other(m.sideA);
  const sn = s => s === 'A' ? 'T' : 'CT'; $('#monA').textContent = '$' + nf(a.money) + ' · ' + sn(m.sideA); $('#monB').textContent = sn(other(m.sideA)) + ' · $' + nf(b.money);
  $('#scA').textContent = a.score; $('#scB').textContent = b.score;
  let h = ''; for (let i = 0; i < 24; i++) { if (i === 12) h += '<i class="h"></i>'; const x = m.hist[i]; h += `<i class="${x ? (x.win ? 'w' : 'l') : ''}"></i>`; } $('#hist').innerHTML = h;
}
function handDraw() {
  const m = OV.m, a = m.a, hd = $('#hand'), en = $('#en');
  if (m.over) { hd.innerHTML = ''; en.innerHTML = ''; $('#buyl').textContent = ''; return; }
  OV.sel = OV.sel.filter(k => a.hand.includes(k)); if (!m.canPlay(a, OV.sel)) OV.sel = [];
  const cost = OV.sel.reduce((s, k) => s + AC[k].cost, 0), ctx = { side: m.sideA, behind: a.score < b_score(m) };
  en.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8].map(i => `<i class="${i <= a.en - cost ? 'on' : i <= a.en ? 'use' : ''}"></i>`).join('') + `<span>${a.en - cost}/8</span>`;
  en.setAttribute('aria-label', `Энергия ${a.en - cost} из 8`);
  hd.innerHTML = a.hand.map(k => { const on = OV.sel.includes(k), v = acVal(k, a, ctx), dis = !on && (OV.sel.length >= 2 || cost + AC[k].cost > a.en); return `<button class="ac ${dis ? 'dis' : ''}" data-act="sel" data-v="${k}" aria-pressed="${on}" ${dis ? 'aria-disabled="true"' : ''}><span class="h"><span class="n">${AC[k].n}</span><span class="c" aria-label="Стоит ${AC[k].cost} энергии">${AC[k].cost}</span></span>${k === 'fake' || k === 'eco' ? '' : `<span class="v ${v < 0 ? 'neg' : 'pos'}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}</span>`}<span class="d">${AC[k].d}</span></button>`; }).join('');
  $('#buyl').textContent = m.decider ? 'Полная закупка' : BUY[m.buyOf(a, OV.sel)].n;
}
const b_score = m => m.b.score;
function lvBuy(first) {
  const m = OV.m; LV.ph = 'buy'; LV.T = LV.t = first ? T_BUY1 : T_BUY;
  document.querySelectorAll('.chipp').forEach(c => c.classList.remove('dead', 'hit'));
  $('#feed').innerHTML = ''; $('#bn').innerHTML = ''; $('#played').innerHTML = `<span>${m.isPistol() ? 'Пистолетный раунд' : m.decider ? 'Счёт 12:12 — решающий раунд' : m.a.ws >= 2 ? 'Серия побед: +1,5 к силе' : ''}</span><span>${m.decider || m.isPistol() ? '' : 'Соперник: ' + BUY[m.buyOf(m.b, [])].n.toLowerCase()}</span>`;
  $('#phl').textContent = 'Закупка'; lvHud(); handDraw();
}
function lvPlay() {
  const m = OV.m, sel = m.canPlay(m.a, OV.sel) ? OV.sel : [], L = m.play(sel);
  OV.sel = []; LV.last = L; LV.q = [...L.kills]; LV.ph = 'kills'; LV.t = 340;
  const tg = (pl, vals, cut) => pl.length ? pl.map(k => { const v = vals.find(x => x.k === k); return k === cut ? `<s>${AC[k].n}</s>` : `<b>${AC[k].n}${v && k !== 'fake' ? ' ' + (v.v >= 0 ? '+' : '−') + Math.abs(v.v).toFixed(1) : ''}</b>`; }).join(', ') : 'без карт';
  $('#played').innerHTML = `<span>Вы: ${tg(L.mine, L.va, L.cutA)}</span><span>Соперник: ${tg(L.theirs, L.vb, L.cutB)}</span>`;
  $('#phl').textContent = 'Раунд идёт'; $('#phb').style.width = '0%'; $('#buyl').textContent = `шанс ${Math.round(L.p * 100)}%`;
  handDraw();
}
function lvKill(k) {
  const L = LV.last, kt = k.byA ? 'A' : 'B', vt = k.byA ? 'B' : 'A', m = OV.m, K = k.byA ? m.a : m.b, V = k.byA ? m.b : m.a;
  const ks = k.byA ? L.sideA : other(L.sideA), col = s => s === 'D' ? 'var(--ct)' : 'var(--tt)', f = $('#feed');
  f.insertAdjacentHTML('beforeend', `<div class="${k.byA ? '' : 'me'}"><span class="ka" style="--ka:${col(ks)}">${esc(K.info.e[k.k].c.nick)}</span><svg aria-hidden="true"><use href="#${k.awp ? 'awp' : 'gun'}"/></svg>${k.hs ? '<i class="hs"></i>' : ''}<span class="va" style="--vc:${col(other(ks))}">${esc(V.info.e[k.v].c.nick)}</span></div>`);
  while (f.children.length > 4) f.firstChild.remove();
  $('#c' + vt + k.v).classList.add('dead');
  const kc = $('#c' + kt + k.k); kc.classList.remove('hit'); void kc.offsetWidth; kc.classList.add('hit'); kc.querySelector('.k').textContent = ++LV.kc[kt][k.k];
  SFX.kill();
}
function lvEnd() {
  const L = LV.last; LV.ph = 'end'; LV.t = T_END;
  $('#bn').innerHTML = `<div class="banner ${L.win ? 'w' : 'l'}"><b>${L.win ? 'Раунд ваш' : 'Раунд проигран'}</b><span>${END[L.end]} · ${esc(L.mvp)}: ${L.ace ? 'эйс' : L.clutch ? 'клатч, ' + L.frags + ' фр.' : L.frags + ' фр.'}</span></div>`;
  lvHud(); (L.win ? SFX.win : SFX.lose)();
}
function lvNext() {
  const m = OV.m, L = LV.last;
  if (m.over) { OV.st = 'end'; OV.reward = applyResult(G, m.won); save(); endBuild(); return; }
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
  const m = OV.m, r = OV.reward, mv = m.mvp();
  const tb = (s, side) => `<table class="tbl sd-${side}"><tr><th>${esc(s.name)}</th><th>У</th><th>С</th></tr>${s.info.e.map((x, i) => ({ x, k: s.k[i], d: s.d[i] })).sort((p, q) => q.k - p.k).map(p => `<tr class="${p.x.c.nick === mv.nick && (s === m.a) === mv.mine ? 'star' : ''}"><td>${esc(p.x.c.nick)}</td><td>${p.k}</td><td>${p.d}</td></tr>`).join('')}</table>`;
  $('#mt').innerHTML = `<p class="res-t ${m.won ? 'w' : 'l'}">${m.won ? 'Победа' : 'Поражение'}</p><p class="eyebrow" style="text-align:center">${m.a.score}:${m.b.score} · ${m.map.n} · лучший игрок ${esc(mv.nick)}, ${mv.k} уб.</p>
  <div class="stats"><div class="stat"><b>${r.tro >= 0 ? '+' : '−'}${Math.abs(r.tro)}</b><span>кубки</span></div><div class="stat"><b>+${r.coins}</b><span>монеты</span></div><div class="stat"><b>+${r.xp}</b><span>опыт</span></div></div>${r.packs.map(p => `<p class="sm">Награда: ${p}.</p>`).join('')}
  <div class="pn">${tb(m.a, m.sideA)}</div><div class="pn">${tb(m.b, other(m.sideA))}</div><p class="sm mut">У — убийства, С — смерти.</p><button class="btn pri" data-act="ovClose">Продолжить</button>`;
  $('#over').scrollTop = 0; (m.won ? SFX.win : SFX.lose)();
}

const TABS = {
  home: ['Лобби', vHome, '<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z"/>'],
  packs: ['Кейсы', vPacks, '<path d="M3 9h18v11H3zM5 9l2-4h10l2 4M12 9v4"/><path d="M10 13h4"/>'],
  col: ['Инвентарь', vCol, '<rect x="3" y="7" width="11" height="14"/><path d="M8 3h13v14"/>'],
  squad: ['Состав', vSquad, '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="8" cy="19" r="2"/><circle cx="16" cy="19" r="2"/>']
};
function render() {
  if (!G) return;
  $('#hud .wrap').innerHTML = hudH();
  const app = $('#app'); app.innerHTML = TABS[tab][1]();
  if (tab !== lastTab) {
    const ks = Object.keys(TABS), i = ks.indexOf(tab), j = ks.indexOf(lastTab);
    app.style.setProperty('--dir', j < 0 || i >= j ? 1 : -1); app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
    sceneTo(tab); lastTab = tab;
  } else app.classList.remove('enter');
  $('#tabs .wrap').innerHTML = Object.keys(TABS).map(k => `<button data-act="tab" data-v="${k}" ${tab === k ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${TABS[k][2]}</svg>${TABS[k][0]}${k === 'packs' && (packCount() || dailyReady()) ? '<span class="dot"></span>' : ''}</button>`).join('');
  const sh = $('#sheet'); sh.innerHTML = vSheet(); sh.hidden = !sheet;
  const ov = $('#over');
  if (!OV) { ov.innerHTML = ''; ov.hidden = true; }
  else if (!OV.built) { if (OV.t === 'pack') packBuild(); else matchBuild(); }
}
function autoSquad() {
  const used = new Set();
  for (let i = 0; i < 5; i++) {
    const c = Object.keys(G.cards).map(id => CARDS[id]).filter(c => !used.has(c.nick)).sort((x, y) => (y.ovr + own(y.id).lv - (y.role === i ? 0 : 5)) - (x.ovr + own(x.id).lv - (x.role === i ? 0 : 5)))[0];
    G.squad[i] = c.id; used.add(c.nick);
  }
}
const ACT = {
  tab(v) { tab = v; colN = 45; window.scrollTo(0, 0); },
  mute() { mute = !mute; try { localStorage.setItem(SKEY, mute ? '1' : '0'); } catch (e) { /* не сохранится */ } },
  close() { sheet = null; imgMsg = ''; },
  card(v, d) { sheet = { t: 'card', id: +d.id }; imgMsg = ''; },
  slot(v) { sheet = { t: 'slot', slot: +v }; },
  put(v, d) { const id = +d.id, i = +v, c = CARDS[id], j = G.squad.findIndex(x => CARDS[x].nick === c.nick); if (j >= 0 && j !== i) G.squad[j] = G.squad[i]; G.squad[i] = id; sheet = null; },
  auto() { autoSquad(); },
  up(v, d) { doUp(G, +d.id); },
  sell(v, d) { sellDupes(G, +d.id, false); }, sellAll(v, d) { sellDupes(G, +d.id, true); },
  imgDel(v, d) { delete IMG[d.id]; try { localStorage.setItem(IKEY, JSON.stringify(IMG)); } catch (e) { /* хранилище недоступно */ } },
  filter(v) { colF = v; colN = 45; }, more() { colN += 45; },
  daily() { if (dailyReady()) { G.daily = Date.now(); G.packs.basic++; tab = 'packs'; } },
  open(v) { if (G.packs[v] > 0) { G.packs[v]--; startPack(v); } },
  buy(v) { const P = PACKS[v]; if (G.coins >= P.price) { G.coins -= P.price; startPack(v); } },
  poTap() { poTap(); return false; },
  poSkip() { if (OV && OV.t === 'pack' && OV.phase !== 'done') poDone(); return false; },
  ovClose() { OV = null; LV = null; window.scrollTo(0, 0); },
  fight() { const sq = squadOf(G); OV = { t: 'match', st: 'found', m: new Match(sq, G.tro, squadInfo(sq).rating), maps: shuffle([...MAPS]).slice(0, 3), ban: [], sel: [], reward: null, askQuit: false, built: false }; },
  ban(v) { vetoBan(+v); return false; },
  sel(v) { if (!OV || OV.st !== 'live') return false; const m = OV.m, i = OV.sel.indexOf(v); if (i >= 0) OV.sel.splice(i, 1); else if (OV.sel.length < 2 && m.canPlay(m.a, OV.sel.concat(v))) OV.sel.push(v); else return false; SFX.tap(); handDraw(); return false; },
  pause() { if (LV) { LV.paused = !LV.paused; lvBtns(); } return false; },
  quitAsk() { OV.askQuit = true; lvBtns(); return false; }, quitNo() { OV.askQuit = false; lvBtns(); return false; },
  quitYes() { applyResult(G, false); OV = null; LV = null; },
  newAsk() { askNew = true; }, newNo() { askNew = false; },
  newYes() { askNew = false; G = newGame(); tab = 'home'; }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) { if (e.target.id === 'sheet') { sheet = null; render(); } return; }
  if (b.disabled) return;
  const fn = ACT[b.dataset.act]; if (!fn) return;
  if (fn(b.dataset.v, b.dataset) === false) return;
  if (b.dataset.act === 'tab') SFX.tap();
  save(); render();
});
document.addEventListener('input', e => { if (e.target.id === 'col-q') { colQ = e.target.value; colN = 45; const g = $('#col-grid'); if (g) g.innerHTML = colGrid(); } });
document.addEventListener('change', e => { if (e.target.id === 'img-in' && e.target.files && e.target.files[0]) addImage(e.target.files[0], +e.target.dataset.base); });
/* Осмотр карточки: наклон и блик за пальцем */
document.addEventListener('pointermove', e => {
  const t = e.target.closest && e.target.closest('.tilt'); if (!t || noMotion()) return;
  const b = t.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
  t.style.setProperty('--ry', ((x - .5) * 28).toFixed(1) + 'deg'); t.style.setProperty('--rx', ((.5 - y) * 22).toFixed(1) + 'deg');
  t.style.setProperty('--gx', (x * 100).toFixed(0) + '%'); t.style.setProperty('--gy', (y * 100).toFixed(0) + '%');
});
document.addEventListener('pointerout', e => { const t = e.target.closest && e.target.closest('.tilt'); if (t && !t.contains(e.relatedTarget)) { t.style.setProperty('--rx', '0deg'); t.style.setProperty('--ry', '0deg'); } });
function start() { if (!load()) { G = newGame(); save(); } buildScene(); render(); }
