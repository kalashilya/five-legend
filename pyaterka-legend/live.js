/* ---------- Матч в реальном времени: карта сверху, игроки с фото, составы, подготовка к раунду ----------
   По образцу менеджеров киберспорта, упрощено для телефона: карта рисуется один раз (картинка),
   двигаются только 10 кружков игроков (transform), камера — один transform контейнера. */
/* оружие как в килфиде CS2: силуэт ствола дулом вправо (в сторону жертвы); выбор — по стороне, закупке и роли */
const WPN = {
  ak: 'M0 8.6L12.4 7.4V11.2L2.6 14.2H0ZM12.4 6.2H43V7.2H57.6V8.6H43V10.4H12.4ZM37.6 4.6H50V6H37.6ZM55 4.8H56.4V6.4H55ZM19.6 10.4H23.8L22.2 16H18.4ZM27 10.4H32.2Q33 14.4 36.4 17.6L32.8 19.4Q29 15.6 27 10.4Z',
  m4: 'M0 7.2L9.6 6.8V11.6L1 12.6H0ZM9.6 7.4H15V10H9.6ZM15 5.8H40V10.4H15ZM17.6 4.4H38V5.8H17.6ZM40 6.4H52V9.6H40ZM52 7.4H61V8.6H52ZM59 5.6H60.4V7.4H59ZM19 10.4H23L21.4 15.8H17.8ZM27 10.4H31.6L32.6 17.8H28.2Z',
  m4s: 'M0 7.2L9.6 6.8V11.6L1 12.6H0ZM9.6 7.4H15V10H9.6ZM15 5.8H39V10.4H15ZM17.6 4.4H37V5.8H17.6ZM39 6.4H48V9.6H39ZM48 6.6H63.4V9.4H48ZM19 10.4H23L21.4 15.8H17.8ZM27 10.4H31L31.6 16.6H27.6Z',
  awp: 'M0 6L14 6.4V11.4H8.6L6 14H0ZM3.4 8.2H9.4V9.6H3.4ZM14 6.6H30V10.6H14ZM30 7.6H63.4V8.8H30ZM15.4 2.4H32.4V5.2H15.4ZM18.6 5.2H20.6V6.6H18.6ZM27 5.2H29V6.6H27ZM24 10.6H28.4V13.6H24ZM14 10.6H18.4L17 14.8H13.4Z',
  ssg: 'M0 7.2L13 7.2V10.6L3.4 11.8H0ZM13 7H28V10.2H13ZM28 7.8H60.4V8.8H28ZM15 4.2H28.6V6.2H15ZM17.4 6.2H19V7H17.4ZM24.4 6.2H26V7H24.4ZM21 10.2H24L23.6 12.6H21ZM13.6 10.2H17.4L16 14H12.6Z',
  galil: 'M0 6.8H3V12.8H0ZM3 7.2H12.4V8.4H4.4V10.8H12.4V12H3ZM12.4 6.2H40V10.4H12.4ZM40 6.8H50V9.6H40ZM50 7.6H59.4V8.6H50ZM57.4 5.4H58.8V7.2H57.4ZM19 10.4H23L21.4 15.6H17.8ZM26.6 10.4H31.4Q32.2 14 35.2 17L32 18.8Q28.6 15.4 26.6 10.4Z',
  famas: 'M0 6.6H3V12.8H0ZM3 7.2H44V11.6H3ZM13.4 3.4H36.6V4.8H35V7.2H33.2V4.8H16.8V7.2H15V4.8H13.4ZM44 8H56.6V9.2H44ZM8 11.6H12.6L13.2 16.4H8.4ZM21.8 11.6H25.8L24.4 16.6H20.6ZM36 11.6H40.6V13.6H36Z',
  mac10: 'M2 5.8H10V7H3.4V10H10V11.2H2ZM10 5H30V11H10ZM30 6.4H37.4V8.6H30ZM14 11H19.2L18.6 19H13.4ZM21 11H25.4V12.6H21Z',
  mp9: 'M0 6.6H6V7.6H1.4V9.4H6V10.4H0ZM6 5.8H32V10.4H6ZM32 7H40.4V8.6H32ZM13.6 10.4H18.8L18.4 18.6H13.4ZM26 10.4H29V14.6H26Z',
  glock: 'M10 4.8H35V9.2H10ZM12 9.2H22.4V11.6H17.6L15.8 17.4H10Z',
  p2000: 'M9 4.8H34.4V9.2H9ZM11 9.2H21.4V11.6H16.6L15 17.4H9.2Z',
  usp: 'M7 4.8H29V9.2H7ZM29 5.2H45.6V8.8H29ZM9 9.2H19.4V11.6H14.6L13 17.4H7.2Z',
  p250: 'M10 5.2H32.6V9.2H10ZM12 9.2H22V11.4H17.4L16 17H10.6Z',
  five7: 'M8 4.8H34.4V8.8H8ZM10 8.8H20.6V11.2H15.6L14.4 17.8H8.6Z',
  tec9: 'M7 5.4H33V9.2H7ZM33 6H43V8.4H33ZM19.6 9.2H24.6L25.2 17.4H20.2ZM8 9.2H14L12.4 15H7Z',
  deagle: 'M5 4.2H36.6V9.6H5ZM36.6 5H41V8.6H36.6ZM7 9.6H18V12H13.6L12 18.4H4.6Z' };
const WPN_W = { ak: 58, m4: 61, m4s: 64, awp: 64, ssg: 61, galil: 60, famas: 57, mac10: 38, mp9: 41, glock: 35, p2000: 35, usp: 46, p250: 33, five7: 35, tec9: 43, deagle: 41 };
const WPN_N = { ak: 'AK-47', m4: 'M4A4', m4s: 'M4A1-S', awp: 'AWP', ssg: 'SSG 08', galil: 'Galil AR', famas: 'FAMAS', mac10: 'MAC-10', mp9: 'MP9', glock: 'Glock-18', p2000: 'P2000', usp: 'USP-S', p250: 'P250', five7: 'Five-SeveN', tec9: 'Tec-9', deagle: 'Desert Eagle' };
/* T: Glock → эко P250/Tec-9/Deagle → форс Galil/MAC-10 → полная AK-47; CT: USP-S → P250/Five-SeveN/Deagle → FAMAS/MP9 → M4A1-S/M4A4; снайпер: SSG 08 на форсе, AWP на полной */
const wpnOf = (buy, role, side, i = 0, r = 0) => { const t = side === 'T' || side === 'A', h = (i * 7 + r * 3 + (role || 0) * 5) % 10;
  if (buy === 'pistol') return t ? 'glock' : h < 7 ? 'usp' : 'p2000';
  if (buy === 'eco') return (t ? ['glock', 'p250', 'tec9', 'deagle', 'glock'] : ['usp', 'p250', 'five7', 'deagle', 'usp'])[h % 5];
  if (buy === 'force') return role === 0 ? 'ssg' : t ? (h < 5 ? 'galil' : h < 8 ? 'mac10' : 'tec9') : (h < 5 ? 'famas' : h < 8 ? 'mp9' : 'five7');
  return role === 0 ? 'awp' : t ? 'ak' : h < 6 ? 'm4s' : 'm4'; };
const wpnH = w => `<svg class="wpn wpn-${w}" viewBox="0 0 ${WPN_W[w] || 64} 20" style="--ww:${WPN_W[w] || 64}" role="img" aria-label="${WPN_N[w] || ''}"><path d="${WPN[w] || WPN.glock}"/></svg>`;
/* значки килфида: хедшот, сквозь дым */
const KF_HS = '<svg class="kf-i" viewBox="0 0 20 20" role="img" aria-label="в голову"><path fill-rule="evenodd" d="M10 1.6c4.4 0 7.4 3 7.4 7 0 2.4-1 4-2.6 5v3.6h-2.6V15H11v2.2H9V15H7.8v2.2H5.2v-3.6C3.6 12.6 2.6 11 2.6 8.6c0-4 3-7 7.4-7zM6.6 7.2a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zm6.8 0a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM10 11l-1.2 2h2.4z"/></svg>';
const KF_SM = '<svg class="kf-i" viewBox="0 0 20 20" role="img" aria-label="сквозь дым"><path d="M6 15.6a4 4 0 0 1-.6-7.9 5 5 0 0 1 9.6-1.2 3.8 3.8 0 0 1 .4 7.6 3 3 0 0 1-2.8 1.5z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 18h10" stroke="currentColor" stroke-width="1.8"/></svg>';
const faceSrc = c => { const h = faceH(c), m = /src="([^"]+)"/.exec(h); return m ? m[1] : ''; };
const sideCol = s => s === 'D' ? 'ct' : 't';

/* строка игрока в составе: фото, ник, здоровье, у/с, оружие */
function plH(m, team, i) {
  const s = team === 'a' ? m.a : m.b, x = s.info.e[i], c = x.c, src = faceSrc(c);
  return `<div class="pl" id="pl-${team}-${i}" ${team === 'a' ? `data-act="focus" data-v="${i}" role="button" tabindex="0" aria-label="Ставка на ${esc(c.nick)}"` : ''}>
    <span class="pl-ph">${src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<i>${esc(c.nick.slice(0, 2))}</i></span>
    <span class="pl-in"><b>${esc(c.nick)}</b><span class="pl-kd"><span id="kd-${team}-${i}">0/0</span><span class="pl-w" id="w-${team}-${i}"></span></span><span class="pl-hp"><i id="hp-${team}-${i}"></i></span></span></div>`;
}
function liveBuild() {
  const m = OV.m; OV.st = 'live';
  const art = rdArt(m.map.n, clamp(Math.round(Math.min(1100, Math.max(innerWidth, 360)) * Math.min(2, devicePixelRatio || 1) * 1.4 / 256) * 256, 1024, 2048));   /* под размер экрана, с запасом на приближение */
  $('#mt').innerHTML = `<div class="lv">
    <div class="lv-top"><div class="lv-tm" id="tA"><b>Вы</b><span id="monA"></span></div><div class="lv-sc"><b id="scA">0</b><div><span id="rn"></span><span class="lv-map">${esc(m.map.n)} <i>LIVE</i></span></div><b id="scB">0</b></div><div class="lv-tm r" id="tB"><b>${esc(m.b.name)}</b><span id="monB"></span></div></div>
    <div class="hist" id="hist"></div>
    <div class="lv-team op" id="rowB">${[0, 1, 2, 3, 4].map(i => plH(m, 'b', i)).join('')}</div>
    <div class="lv-view" id="lvv"><div class="lv-cam" id="lvc"><img class="lv-art" src="${art}" alt="" draggable="false"><svg class="lv-ov" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g id="rd-plan"></g><g id="rd-fx"></g><g id="rd-top"></g></svg><div class="lv-avas" id="avas"></div></div>
      <div class="rd-clock" id="rdc"></div><div class="feed" id="feed" aria-live="off"></div><div id="bn"></div><div class="lv-intro" id="intro"><small>Добро пожаловать на</small><b>${esc(m.map.n)}</b></div></div>
    <div class="lv-team mine" id="rowA">${[0, 1, 2, 3, 4].map(i => plH(m, 'a', i)).join('')}</div>
    <div class="lv-ctl" id="mbtn"></div>
    <div class="lv-prep" id="prep"></div></div>`;
  LV = { ph: 'buy', t: 0, T: 1, q: [], paused: false, last: null, ts: 0, spd: LV && LV.spd || 1, cam: { x: 50, y: 50, z: 1 }, kd: null, kc: { A: [0, 0, 0, 0, 0], B: [0, 0, 0, 0, 0] } };
  warmStart(W_2D); requestAnimationFrame(lvTick);
}
/* табло, деньги, история раундов, у/с и оружие игроков */
function lvHud() {
  const m = OV.m, a = m.a, b = m.b, sn = s => s === 'A' ? 'T' : 'CT';
  $('#rn').textContent = m.over ? 'Финал' : m.decider ? 'Решающий' : 'Раунд ' + m.round;
  $('#tA').className = 'lv-tm sd-' + m.sideA; $('#tB').className = 'lv-tm r sd-' + other(m.sideA);
  $('#rowA').className = 'lv-team mine sd-' + m.sideA; $('#rowB').className = 'lv-team op sd-' + other(m.sideA);
  $('#monA').textContent = sn(m.sideA) + ' · $' + nf(a.money); $('#monB').textContent = '$' + nf(b.money) + ' · ' + sn(other(m.sideA));
  $('#scA').textContent = a.score; $('#scB').textContent = b.score;
  let h = ''; for (let i = 0; i < 24; i++) { if (i === 12) h += '<i class="h"></i>'; const x = m.hist[i]; h += `<i class="${x ? (x.win ? 'w' : 'l') : ''}"></i>`; } $('#hist').innerHTML = h;
  lvKD();
}
function lvKD() {
  const m = OV.m, L = LV.ph === 'buy' ? null : LV.last;
  for (const [t, s] of [['a', m.a], ['b', m.b]]) for (let i = 0; i < 5; i++) {
    const k0 = LV.kd ? LV.kd[t].k[i] : s.k[i], d0 = LV.kd ? LV.kd[t].d[i] : s.d[i], kd = $(`#kd-${t}-${i}`); if (!kd) continue;
    kd.textContent = `${k0}/${d0}`;
    const buy = L ? (t === 'a' ? L.buyA : L.buyB) : (m.decider ? 'full' : t === 'a' ? m.buyOf(m.a, OV.sel, OV.plan.buy) : m.buyOf(m.b, []));
    $(`#w-${t}-${i}`).innerHTML = wpnH(wpnOf(buy, s.info.e[i].c.role, (t === 'a') === (m.sideA === 'A') ? 'T' : 'CT', i, L ? L.round : m.round));
  }
}
/* ---------- Игроки на карте ---------- */
function rdDotsBuild(S) {
  if (M3C) { M3C.teams(S); LV.dEl = []; return; }
  const m = OV.m, g = $('#avas'); if (!g) return;
  g.innerHTML = S.dots.map((d, n) => { const tm = d.team === 'a' ? m.a : m.b, c = tm.info.e[d.i].c, src = faceSrc(c);
    return `<div class="ava ${d.side === 'T' ? 't' : 'ct'} ${d.team === 'a' ? 'me' : 'op'}" id="ava${n}"><span class="ava-in"><span class="ava-ph">${src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<i>${esc(c.nick.slice(0, 2))}</i></span><b>${esc(c.nick)}</b><span class="ava-x" aria-hidden="true"></span></span></div>`; }).join('');
  LV.dEl = S.dots.map((_, n) => $('#ava' + n));
}
function rdDotsAt(S, t) {
  const v = $('#lvv'); if (!v) return; const Sz = LV.sz || 1;
  S.dots.forEach((d, n) => { const el = LV.dEl && LV.dEl[n]; if (!el) return; const p = rdPos(d, t); el.style.transform = `translate3d(${(p[0] * Sz / 100).toFixed(1)}px,${(p[1] * Sz / 100).toFixed(1)}px,0)`; const dead = d.dt != null && t >= d.dt; if (dead !== el._dead) { el._dead = dead; el.classList.toggle('dead', dead); } });
}
/* камера: в плане — вся карта, в раунде — приближение к живым игрокам */
function lvCam(t, dt) {
  const v = $('#lvv'), c = $('#lvc'); if (!v || !c) return;
  const W = v.clientWidth, H = v.clientHeight, Sz = Math.max(W, H); if (LV.sz !== Sz) { LV.sz = Sz; c.style.width = c.style.height = Sz + 'px'; }
  let tx = 50, ty = 50, tz = 1;
  if (LV.ph === 'round' && LV.S) { const al = LV.S.dots.filter(d => d.dt == null || t < d.dt).map(d => rdPos(d, t)); if (al.length) { const xs = al.map(p => p[0]), ys = al.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    tx = (x0 + x1) / 2; ty = (y0 + y1) / 2; tz = clamp(100 / (Math.max(26, x1 - x0, y1 - y0) + 20), 1, 2.1); } }
  const k = 1 - Math.exp(-dt / 1000 * 2.2), C = LV.cam; C.x += (tx - C.x) * k; C.y += (ty - C.y) * k; C.z += (tz - C.z) * k;
  /* за CT радар развёрнут на 180°: ваша база снизу; надписи на карте разворачиваются обратно (класс flip) */
  const fl = OV && OV.m && OV.m.sideA === 'D'; v.classList.toggle('flip', fl);
  const z = Math.max(1, C.z), px = (fl ? 100 - C.x : C.x) * Sz / 100, py = (fl ? 100 - C.y : C.y) * Sz / 100;
  const ox = clamp(W / 2 - px * z, W - Sz * z, 0), oy = clamp(H / 2 - py * z, H - Sz * z, 0);
  c.style.transform = `translate3d(${ox.toFixed(1)}px,${oy.toFixed(1)}px,0) scale(${z.toFixed(4)})` + (fl ? ` translate(${Sz}px,${Sz}px) rotate(180deg)` : ''); c.style.setProperty('--iz', (1 / z).toFixed(3));
}
function rdIdle() {
  const m = OV.m, fake = { sideA: m.sideA, plan: { dir: 'S', tempo: 'norm' }, planB: { dir: 'S', tempo: 'norm' }, kills: [], end: 'elim', round: m.round };
  const S = rdScript(fake, m.map.n); rdDotsBuild(S); rdDotsAt(S, 0); return S;
}
function rdFx(html, ms) { const g = $('#rd-fx'); if (!g) return; const w = document.createElementNS('http://www.w3.org/2000/svg', 'g'); w.innerHTML = html; g.appendChild(w); setTimeout(() => w.remove(), ms); }
function rdEvent(S, e) {
  const M = rdMap(OV.m.map.n), sp = M.n[e.site || S.site], top = $('#rd-top') || {}, rc = $('#rdc') || {};
  if (M3C) M3C.ev(e);
  if (e.type === 'kill') {
    const kd = S.dots.find(d => d.team === (e.k.byA ? 'a' : 'b') && d.i === e.k.k), vd = S.dots.find(d => d.team === (e.k.byA ? 'b' : 'a') && d.i === e.k.v);
    if (kd && vd) { const a = rdPos(kd, e.t), b = rdPos(vd, e.t); rdFx(`<line class="rd-shot ${kd.side === 'T' ? 't' : 'ct'}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`, 600); }
    lvKill(e.k, e);
  } else if (e.type === 'plant') { top.innerHTML = `<g class="rd-bomb" transform="translate(${sp[0] + 3.4} ${sp[1] - 3.4})"><circle r="2.2"/><text y=".8">C4</text></g>`; sfx('scan');
    const bn = $('#bn'); if (bn && LV) { const h = `<div class="banner n sm"><b>Бомба заложена</b><span>точка ${e.site || S.site} · у защиты 40 секунд</span></div>`; bn.innerHTML = h; setTimeout(() => { if (bn.innerHTML === h) bn.innerHTML = ''; }, 1800); } }
  else if (e.type === 'boom') { rdFx(`<circle class="rd-boom" cx="${sp[0]}" cy="${sp[1]}" r="3"/>`, 1400); top.innerHTML = ''; if (LV) LV.bd = 1; rc.innerHTML = '<span class="bomb">Бомба взорвана</span>'; }
  else if (e.type === 'defuse') { top.innerHTML = `<g class="rd-bomb off" transform="translate(${sp[0] + 3.4} ${sp[1] - 3.4})"><circle r="2.2"/><text y=".8">✓</text></g>`; rc.innerHTML = '<span>Бомба обезврежена</span>'; if (LV) LV.bd = 1; }
  else if (e.type === 'time') rc.innerHTML = '<span>Время вышло</span>';
}
/* ---------- Кнопки внизу ---------- */
function lvBtns() {
  const c = $('#mbtn'); if (!c) return;
  if (OV.askQuit) { c.innerHTML = '<button class="btn dan s" data-act="quitYes">Сдаться — поражение</button><button class="btn s" data-act="quitNo">Играть дальше</button>'; return; }
  if (OV.net) { c.innerHTML = `<span class="net-tag"><i></i>Онлайн · ${esc(OV.net.opNick)}</span><button class="lv-b wide q" data-act="quitAsk">Сдаться</button>`; return; }
  c.innerHTML = `<button class="lv-b" data-act="spd" aria-label="Скорость">×${LV.spd}</button><button class="lv-b" data-act="pause" aria-label="${LV.paused ? 'Продолжить' : 'Пауза'}">${LV.paused ? '▶' : '❚❚'}</button>${LV.ph === 'round' ? '<button class="lv-b" data-act="skipRound" aria-label="Досмотреть раунд">⏭</button>' : ''}<button class="lv-b wide q" data-act="quitAsk">Сдаться</button>`;
}
/* ---------- Подготовка к раунду: быстрый план (три карточки) или решение капитана по ходу раунда ---------- */
function planDraw() {
  const m = OV.m, p = $('#prep'); if (!p) return;
  if (!m.over && LV.ph === 'buy') { qpDraw(p); mmDraw(); lvBtns(); return; }
  if (LV.ask) { callDraw(); return; }
  p.className = 'lv-prep'; p.innerHTML = ''; mmDraw(); lvBtns();
}
function mmDraw() { document.querySelectorAll('#rowA .pl').forEach((c, i) => c.classList.toggle('foc', OV.plan.focus === i));
  const q = LV.min && !LV.tuned && QP[OV.m.sideA][LV.qr], shown = q ? { dir: q.dir, tempo: q.tempo } : OV.plan;
  if (M3C) M3C.plan(OV.m.sideA, LV.ph !== 'buy' || OV.m.over ? null : shown);
  const g = $('#rd-plan'); if (!g) return; g.innerHTML = LV.ph === 'buy' ? rdPlanSvg(OV.m.map.n, OV.m.sideA, shown) : ''; $('#lvv').className = 'lv-view sd-' + OV.m.sideA; }
/* ---------- Разминка перед первым раундом ----------
   Пока идёт отсчёт, карта строится и рисуется за экраном «Разминка» (3D успевает загрузить текстуры и шейдеры — без чёрного экрана).
   Потом экран плавно уходит и начинается первый раунд; в онлайне — когда разминка закончилась у обоих (netWarmDone). */
const W_3D = 6000, W_2D = 2500;
function warmStart(ms) {
  const m = OV.m; LV.ph = 'warm'; LV.T = LV.t = ms; LV.wEnd = performance.now() + ms; LV.wf = 0; LV.S = rdIdle(); rdDotsBuild(LV.S); rdDotsAt(LV.S, 0);
  const n = $('#intro'); if (n) n.classList.add('out');
  const el = document.createElement('div'); el.className = 'lv-warm'; el.id = 'warm'; el.setAttribute('role', 'status');
  el.innerHTML = `<small class="eyebrow">Разминка</small><b class="wm-map">${esc(m.map.n)}</b><span class="wm-vs">Вы <i>${sideName(m.sideA)}</i> · против ${esc(m.b.name)}</span><span class="wm-n" id="wmn">${Math.ceil(ms / 1000)}</span><span class="wm-bar"><i id="wmb"></i></span><small class="wm-s">${OV.net ? 'Карта загружается у обоих игроков' : 'Карта загружается'}</small>`;
  const host = $('#mt .lv') || $('#mt'); host.appendChild(el); lvBtns();
}
/* отсчёт по настоящим часам (а не по кадрам); старт — когда время вышло и уже нарисовано не меньше 10 кадров карты */
function warmTick() {
  LV.wf++; LV.t = Math.max(0, LV.wEnd - performance.now()); if (LV.t <= 0 && LV.wf < 10) LV.t = 1;
  const n = $('#wmn'), b = $('#wmb'), s = String(Math.max(1, Math.ceil(LV.t / 1000)));
  if (n && n.textContent !== s && LV.t > 0) { n.textContent = s; n.classList.remove('tk'); void n.offsetWidth; n.classList.add('tk'); sfx('tap'); }
  if (b) b.style.transform = `scaleX(${clamp(1 - LV.t / (LV.T || 1), 0, 1).toFixed(3)})`;
  if (LV.t <= 0) warmEnd();
}
function warmEnd() {
  const el = $('#warm'); if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 450); }
  if (OV.net) netWarmDone(); else lvBuy(true);
}
function lvBuy(first) {
  const m = OV.m; LV.ph = 'buy'; LV.T = LV.t = OV.net ? (first ? NET_BUY1 : NET_BUY) : first ? T_BUY1 : T_BUY; LV.min = true; LV.tuned = false; LV.kd = null; LV.sent = 0;
  document.querySelectorAll('.pl').forEach(c => c.classList.remove('dead', 'hit')); document.querySelectorAll('[id^="hp-"]').forEach(h => h.style.width = '100%');
  $('#feed').innerHTML = ''; $('#bn').innerHTML = ''; $('#rdc').innerHTML = ''; const tp = $('#rd-top'); if (tp) tp.innerHTML = '';
  LV.S = rdIdle(); OV.sel = OV.sel.filter(k => m.a.hand.includes(k)); if (!m.canPlay(m.a, OV.sel)) OV.sel = [];
  lvHud(); planDraw();
  if (OV.net && OV.net.host) netBuySent();
}
/* ---------- Решение по ходу раунда ----------
   В части раундов (не в пистолетных) перед выходом на точку игра останавливается и спрашивает капитана.
   Первая дуэль разыгрывается заранее (m.rollOpen), поэтому ситуация совпадает с тем, что дальше покажет розыгрыш.
   Ситуации (kind): разведка по точке, выход из центра, потеряли энтри, упала бомба, первый фраг наш, снайпер на миде,
   эко соперника, тайм-аут; в защите — шаги, потеряли игрока на точке, их энтри убит, тишина, эко атаки, тайм-аут.
   Правду (настоящий план соперника) знает только игра: удачный ответ даёт плюс, неудачный — минус (mc от −3 до +3).
   Варианты могут менять точку (dir), темп, тактику (tk), ротацию защиты (rot) и сейв (save). */
function callFor(m) {
  if (m.isPistol() || m.round < 2 || LV.lastCall === m.round - 1 || Math.random() > .45) return null;
  m.rollOpen();
  return callGen(m.sideA === 'A', OV.plan.dir, m.nx.plan.dir, callCtx(m, true));
}
/* обстановка для решения: me — сторона, которой задаём вопрос (host — игрок этого устройства, иначе соперник) */
function callCtx(m, host) {
  const me = host ? m.a : m.b, op = host ? m.b : m.a, myPlan = host ? OV.plan : m.nx.plan, opPlan = host ? m.nx.plan : OV.plan;
  const mySide = host ? m.sideA : other(m.sideA), atkWon = m.preOpen && m.preOpen.r === m.round ? m.preOpen.v : null;
  const h = m.hist.slice(-2), lost2 = h.length === 2 && h.every(x => host ? !x.win : x.win), half = m.round <= HALF ? 1 : 2;
  m.toUsed = m.toUsed || {}; const key = (host ? 'a' : 'b') + half;
  return { open: atkWon == null ? null : mySide === 'A' ? atkWon : !atkWon, myTk: myPlan.tk || null, opTk: opPlan.tk || null, opTempo: opPlan.tempo,
    opBuy: m.decider ? 'full' : m.buyOf(op, []), myEntry: me.info.e[1].c.nick, opEntry: op.info.e[1].c.nick, opAwp: op.info.e[0].c.nick,
    timeout: lost2 && !m.toUsed[key] ? () => { m.toUsed[key] = 1; } : null, side: mySide };
}
/* варианты решения для капитана: atk — он в атаке, cur — его точка, tr — настоящая точка соперника, c — обстановка */
function callGen(atk, cur, tr, c) {
  c = c || {}; const oth = d => d === 'A' ? 'B' : 'A', S = [], add = (w, f) => S.push([w, f]);
  const site = cur === 'A' || cur === 'B' ? cur : null, onMe = site && tr === site;   /* onMe — защита стоит там, куда мы идём */
  if (atk) {
    if (site) add(1, () => { const seen = Math.random() < .75 ? tr : ['A', 'S', 'B'].filter(x => x !== tr)[Math.floor(Math.random() * 2)];
      return { kind: 'scout', q: 'Разведка: ' + (seen === 'S' ? 'защита стоит ровно: по двое на A и B' : `на ${seen} стоят трое, на ${oth(seen)} — один`),
        opts: [{ t: 'Доигрываем на ' + site, s: 'продолжаем выход по плану', dir: site }, { t: 'Уходим на ' + oth(site), s: 'быстрая смена точки', dir: oth(site), tempo: 'fast', mc: -1.2, slow: 1 }] }; });
    else add(1.2, () => ({ kind: 'scoutS', q: 'Контроль карты взят. Куда выходим?', opts: [{ t: 'Выход на A', s: 'вся команда идёт на A', dir: 'A' }, { t: 'Выход на B', s: 'вся команда идёт на B', dir: 'B' }] }));
    if (c.open === false && site) {
      add(3, () => ({ kind: 'entryLost', q: `Потеряли ${c.myEntry} на входе в ${site}. Вы 4 на 5.`, opts: [
        { t: 'Трейд сразу', s: 'двое сразу выходят за ним', mc: onMe ? -1.5 : 1.8 },
        { t: 'Откат и гранаты заново', s: 'ждём, перекидываем точку', tempo: 'slow', mc: .4 },
        { t: 'Уходим на ' + oth(site), s: 'смена точки', dir: oth(site), mc: -1, slow: 1 }] }));
      add(1.5, () => ({ kind: 'bombDown', q: `Погиб ${c.myEntry}, бомба упала у входа на ${site}.`, opts: [
        { t: 'Подобрать и идти', s: 'саппорт забирает бомбу', mc: onMe ? -1.4 : 1.2 },
        { t: 'Подобрать и на ' + oth(site), s: 'бомбу несём на другую точку', dir: oth(site), mc: -1.3, slow: 1 },
        { t: 'Сейв', s: 'раунд отдаём, бережём оружие', mc: -3, save: 1 }] }));
    }
    if (c.open === false && !site) add(2.5, () => ({ kind: 'midLost', q: `Потеряли ${c.myEntry} на миде. Решайте, куда выходить вчетвером.`, opts: [
      { t: 'Выход на A', s: 'вчетвером на A', dir: 'A' }, { t: 'Выход на B', s: 'вчетвером на B', dir: 'B' }, { t: 'Откат и пауза', s: 'перегруппировка, медленно', tempo: 'slow', mc: .3 }] }));
    if (c.open === true) add(2.5, () => ({ kind: 'entryWon', q: `Первый фраг ваш: ${c.myEntry} снял игрока на ${site || 'миде'}.`, opts: [
      { t: 'Давим сразу', s: 'не даём защите собраться', tempo: 'fast', mc: onMe ? -.5 : 2 },
      { t: 'Ждём гранат', s: 'заходим под смоки и флешки', mc: onMe ? 1.5 : -.8 },
      { t: 'Растягиваем точку', s: 'двое заходят с другой стороны', mc: .6 }] }));
    const awp = c.opTk === 'awpMid';
    if (awp || Math.random() < .25) add(awp ? 2 : .8, () => ({ kind: 'awpMid', q: `Разведка: на миде, похоже, снайпер ${c.opAwp}.`, opts: [
      { t: 'Обходим через точку', s: 'не лезем в его линию', mc: awp ? 1.5 : -.7, slow: 1 },
      { t: 'Флешка и дуэль', s: 'энтри выходит под флешку', mc: awp ? -1.2 : 2 },
      { t: 'Смок и проход', s: 'закрываем линию дымом', mc: awp ? 1.9 : -.6 }] }));
    if (c.opBuy === 'eco') add(2.2, () => ({ kind: 'ecoOpp', q: 'У защиты эко: только пистолеты.', opts: [
      { t: 'Давим быстро', s: 'пользуемся оружием, не даём им собраться', tempo: 'fast', mc: c.opTk === 'antiEco' ? -1.4 : 2 },
      { t: 'Играем аккуратно', s: 'не отдаём им винтовки', mc: c.opTk === 'antiEco' ? 1.6 : -.3 }] }));
  } else {
    const seen = tr === 'S' ? (Math.random() < .5 ? 'A' : 'B') : Math.random() < .7 ? tr : oth(tr);
    add(1, () => ({ kind: 'steps', q: tr === 'S' ? 'Слышно: шаги с двух сторон, больше на ' + seen : 'Слышно: атака идёт на ' + seen,
      opts: cur === seen ? [{ t: 'Держим стек ' + seen, s: 'остаёмся как стоим', dir: cur }, { t: 'Растягиваемся', s: 'по двое на точках', dir: 'S', mc: -.4 }]
        : [{ t: 'Держим позиции', s: 'не верим, стоим по плану', dir: cur }, { t: 'Ротация на ' + seen, s: 'двое бегут на ' + seen + ', поздно', dir: seen, mc: -.6, rot: seen, slow: 1 }] }));
    const tsite = tr === 'A' || tr === 'B' ? tr : null, hit = tsite || (Math.random() < .5 ? 'A' : 'B');
    if (c.open === false) add(3, () => ({ kind: 'siteLost', q: `Потеряли игрока на ${hit}: их энтри прошёл.`, opts: [
      { t: 'Ретейк сразу', s: 'ближние бегут на ' + hit, mc: tsite ? -1.4 : 1.2, rot: hit },
      { t: 'Ждём всех и ретейк', s: 'собираемся и заходим вместе', mc: tsite ? 1.3 : -.6, slow: 1 },
      { t: 'Сейв', s: 'отдаём раунд, бережём оружие', mc: -3, save: 1 }] }));
    if (c.open === true) add(2.5, () => ({ kind: 'oppEntryDown', q: `${c.opEntry} убит на подходе к ${hit}.`, opts: [
      { t: 'Выходим добивать', s: 'давим, пока их меньше', mc: c.opTempo === 'fast' ? 1.6 : -1.2 },
      { t: 'Держим позиции', s: 'пусть идут к нам', mc: .5 },
      { t: 'Ротация на ' + oth(hit), s: 'ждём второй удар', dir: oth(hit), rot: oth(hit), mc: -.6, slow: 1 }] }));
    if (c.opTempo === 'slow') add(1.8, () => { const lk = c.opTk === 'contact' || c.opTk === 'lurk'; return { kind: 'silence', q: 'Тишина 40 секунд: ни шагов, ни гранат.', opts: [
      { t: 'Выйти за информацией', s: 'один игрок идёт вперёд', mc: lk ? -2.2 : 1.8 },
      { t: 'Ждать', s: 'не высовываемся, слушаем', mc: lk ? 2 : -.7 }] }; });
    if (c.opBuy === 'eco') add(2.2, () => ({ kind: 'ecoOpp', q: 'У атаки эко: у них нет денег.', opts: [
      { t: 'Анти-эко: вперёд', s: 'встречаем их раньше точки', mc: c.opTk === 'ecoRush' ? 2 : -.6 },
      { t: 'Стоим по местам', s: 'не отдаём им винтовки', mc: c.opTk === 'ecoRush' ? -.6 : 1.4 }] }));
  }
  if (c.timeout) add(2, () => { const L = (atk ? TK_T : TK_CT).filter(k => k !== c.myTk && tkOk(k, 'full')), good = c.opTk ? L.filter(k => TK[k].bt.includes(c.opTk)) : [];
    const pick2 = [good.length ? good[Math.floor(Math.random() * good.length)] : null]; while (pick2.length < 3) { const k = L[Math.floor(Math.random() * L.length)]; if (k && !pick2.includes(k)) pick2.push(k); }
    const ks = pick2.filter(Boolean).slice(0, 2).sort(() => Math.random() - .5); c.timeout();
    return { kind: 'timeout', q: 'Тайм-аут капитана: два раунда подряд проиграны. Меняем тактику прямо сейчас?', opts: [
      { t: 'Остаёмся', s: 'играем как задумали' },
      ...ks.map(k => ({ t: TK[k].n, s: TK[k].d, tk: k, dir: TK[k].dir, tempo: TK[k].tempo, mc: -.3 }))] }; });
  let tot = 0; S.forEach(x => tot += x[0]); let q = Math.random() * tot, f = S[0][1];
  for (const x of S) { q -= x[0]; if (q <= 0) { f = x[1]; break; } }
  return Object.assign({ atk, def: 0 }, f());
}
function lvPlay() {
  const m = OV.m, sel = m.canPlay(m.a, OV.sel) ? OV.sel : [];
  LV.kd = { a: { k: [...m.a.k], d: [...m.a.d] }, b: { k: [...m.b.k], d: [...m.b.d] } };
  const call = OV.net ? netCall(m) : callFor(m);
  if (call) {
    /* первая часть раунда: расстановка до выхода, без расчёта (результата ещё нет) */
    const fake = { sideA: m.sideA, plan: Object.assign({}, OV.plan), planB: m.nx.plan, kills: [], end: 'elim', round: m.round, buyA: m.decider ? 'full' : m.buyOf(m.a, sel, OV.plan.buy), buyB: m.decider ? 'full' : m.buyOf(m.b, m.nx.cards), mine: sel, theirs: [] };
    LV.pre = OV.net ? { sel, call: call.me, op: call.op, S: fake } : { sel, call, S: fake }; LV.last = fake; LV.ph = 'round'; LV.rt = 0; LV.bd = 0; LV.ask = 0; LV.S = rdScript(fake, m.map.n); LV.ev0 = LV.S.ev; LV.S.ev = []; LV.ei = 0; LV.callT = Math.max(2.5, LV.S.tEx - .15); LV.lastCall = m.round;
    rdDotsBuild(LV.S); rdDotsAt(LV.S, 0); planDraw(); lvKD();
    $('#feed').innerHTML = ''; $('#rdc').innerHTML = '<span>1:55</span>'; $('#bn').innerHTML = `<div class="banner n sm"><span>Вы: ${esc(planLbl(OV.plan))}</span></div>`;
    setTimeout(() => { if (LV && LV.ph === 'round' && !LV.ask) $('#bn').innerHTML = ''; }, 2200);
    if (OV.net) netAfterPlay();
    return;
  }
  const L = m.play(sel, OV.plan);
  OV.sel = []; LV.pre = null; LV.last = L; LV.ph = 'round'; LV.rt = 0; LV.bd = 0; LV.S = rdScript(L, m.map.n); LV.ei = 0; rdDotsBuild(LV.S); rdDotsAt(LV.S, 0);
  if (OV.net) netAfterPlay(); else { taskAdd(G, roundEvent(L)); G.live = { sa: m.a.score, sb: m.b.score }; save(); }
  planDraw(); lvKD();
  const tg = (pl, cut) => pl.length ? pl.map(k => k === cut ? `<s>${AC[k].n}</s>` : AC[k].n).join(', ') : 'без приказов';
  $('#feed').innerHTML = ''; $('#rdc').innerHTML = '<span>1:55</span>';
  $('#bn').innerHTML = `<div class="banner n sm"><span>Вы: ${esc(planLbl(L.plan))} · ${tg(L.mine, L.cutA)}</span><span>Соперник: ${tg(L.theirs, L.cutB)}</span></div>`;
  setTimeout(() => { if (LV && LV.ph === 'round') $('#bn').innerHTML = ''; }, 2600);
}
function callDraw() {
  const p = $('#prep'), c = LV.pre && LV.pre.call; if (!p || !c) return;
  p.className = 'lv-prep on qp call';
  p.innerHTML = `<div class="pp-h"><div><small class="eyebrow">${c.atk ? 'Атака' : 'Защита'} · решение капитана</small><b>${esc(c.q)}</b></div><div class="qp-ring" aria-hidden="true"><svg viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="16"/><circle class="fg" id="qpg" cx="20" cy="20" r="16" stroke-dasharray="100.5" stroke-dashoffset="0"/></svg><span id="qpt"></span></div></div>
    <div class="call-o">${c.opts.map((o, i) => `<button class="call-b ${i ? 'alt' : ''}" data-act="mc" data-v="${i}"><b>${esc(o.t)}</b><small>${esc(o.s)}${o.slow ? ' · теряем время' : ''}</small></button>`).join('')}</div>
    <p class="sm mut call-n">${['scout', 'steps', 'awpMid'].includes(c.kind) ? 'Разведка не всегда точна. ' : 'Вы не знаете, что задумал соперник. '}Нет ответа — ${esc(c.opts[c.def].t.toLowerCase())}.</p>`;
  qpTick();
}
/* who: 'op' — решение принимал соперник по сети (только у ведущего онлайн-матча) */
function callPick(i, who) {
  const m = OV.m, pre = LV.pre; if (!pre || m.over) return;
  if (OV.net && !OV.net.host) { netGuestMc(i); return; }
  const op = who === 'op', c = op ? pre.op : pre.call; if (!c) return; const o = c.opts[i] || c.opts[c.def];
  const chg = p => Object.assign({}, p, o.dir ? { dir: o.dir } : {}, o.tempo ? { tempo: o.tempo } : {}, o.mc ? { mc: o.mc } : {}, o.tk ? { tk: o.tk } : {}, o.save ? { save: 1 } : {});
  const st = op ? pre.S.planB.dir : pre.S.plan.dir, plan = op ? OV.plan : chg(OV.plan); if (op) m.nx.plan = chg(m.nx.plan);
  const S0 = LV.S, t0 = LV.rt, L = m.play(pre.sel, plan);
  const atk = (m.sideA === 'A') !== op, opt = { perm: S0.perm, tEx: S0.tEx, t0, stDir: atk ? st : undefined, defDir: atk ? undefined : st, rotTo: !atk && o.rot ? o.rot : undefined };
  OV.sel = []; LV.pre = null; LV.ask = 0; LV.last = L; LV.S = rdScript(L, m.map.n, opt); LV.ei = 0; while (LV.ei < LV.S.ev.length && LV.S.ev[LV.ei].t < t0) LV.ei++;
  rdDotsBuild(LV.S); if (OV.net) netAfterPick(L, opt, op ? 'соперник: ' + o.t : o.t); else { taskAdd(G, roundEvent(L)); G.live = { sa: m.a.score, sb: m.b.score }; save(); }
  const p = $('#prep'); if (p) { p.className = 'lv-prep'; p.innerHTML = ''; } lvBtns(); sfx('tap');
  const bn = $('#bn'); if (bn) { const h = `<div class="banner n sm"><b>${esc(op ? 'Соперник принял решение' : o.t)}</b></div>`; bn.innerHTML = h; setTimeout(() => { if (bn.innerHTML === h) bn.innerHTML = ''; }, 1500); }
}
function lvKill(k, e) {
  const L = LV.last, m = OV.m, kt = k.byA ? 'a' : 'b', vt = k.byA ? 'b' : 'a', K = k.byA ? m.a : m.b, V = k.byA ? m.b : m.a;
  const ks = k.byA ? L.sideA : other(L.sideA), f = $('#feed');
  /* строка как в CS2: убийца (цвет стороны) · оружие · значки (хедшот, сквозь дым) · жертва; убийства вашей команды — в красной рамке */
  const w = wpnOf(k.byA ? L.buyA : L.buyB, K.info.e[k.k].c.role, ks, k.k, L.round);
  f.insertAdjacentHTML('beforeend', `<div class="kf ${k.byA ? 'mine' : ''}"><span class="ka ${sideCol(ks)}">${esc(K.info.e[k.k].c.nick)}</span>${wpnH(w)}${e && e.sm ? KF_SM : ''}${k.hs ? KF_HS : ''}<span class="va ${sideCol(other(ks))}">${esc(V.info.e[k.v].c.nick)}</span></div>`);
  const row = f.lastElementChild; setTimeout(() => { row.classList.add('out'); setTimeout(() => row.remove(), 400); }, 7000);
  while (f.children.length > 5) f.firstChild.remove();
  if (LV.kd) { LV.kd[kt].k[k.k]++; LV.kd[vt].d[k.v]++; }
  const vr = $(`#pl-${vt}-${k.v}`); if (vr) vr.classList.add('dead'); const hp = $(`#hp-${vt}-${k.v}`); if (hp) hp.style.width = '0%';
  const kr = $(`#pl-${kt}-${k.k}`); if (kr) { kr.classList.remove('hit'); void kr.offsetWidth; kr.classList.add('hit'); }
  lvKD(); sfx('kill');
}
/* подпись плана: название тактики, а у старого плана без тактики — точка и темп */
const planLbl = p => p && p.tk && TK[p.tk] ? TK[p.tk].n : p ? (DIRN[p.dir] || '') + ', ' + (TEMPON[p.tempo] || '') : '';
function lvEnd() {
  const L = LV.last; LV.ph = 'end'; LV.t = T_END; lvBtns();
  const rd = { good: 'вы переиграли соперника по направлению', bad: 'соперник прочитал ваше направление', fake: 'фейк спас атаку' }[L.read];
  $('#bn').innerHTML = `<div class="banner ${L.win ? 'w' : 'l'}"><b>${L.win ? 'Раунд ваш' : 'Раунд проигран'}</b><span>${END[L.end]} · ${esc(L.mvp)}: ${L.ace ? 'эйс' : L.clutch ? 'клатч, ' + L.frags + ' фр.' : L.frags + ' фр.'}</span>${L.tkA && L.tkB ? `<span class="bn-tk">Вы: «${esc(TK[L.tkA].n)}» · соперник: «${esc(TK[L.tkB].n)}»${L.why ? ' — ' + esc(L.why) : ''}</span>` : rd ? `<span>${rd}</span>` : ''}</div>`;
  LV.kd = null; lvHud(); sfx(L.win ? 'win' : 'lose');
}
function lvNext() {
  const m = OV.m, L = LV.last;
  if (m.over) { finishMatch(); return; }
  if (LV.ph === 'end' && L.swap) { LV.ph = 'half'; LV.t = T_HALF; $('#bn').innerHTML = `<div class="banner n"><b>Смена сторон</b><span>Вы теперь ${sideName(m.sideA)} · деньги сброшены</span></div>`; lvHud(); return; }
  if (LV.ph === 'end' && m.decider) { LV.ph = 'half'; LV.t = T_HALF; $('#bn').innerHTML = '<div class="banner n"><b>12:12</b><span>Решающий раунд, полная закупка у обеих команд</span></div>'; return; }
  if (OV.net && !OV.net.host) { netGuestNext(); return; }
  lvBuy(false);
}
function lvTick(ts) {
  if (!OV || OV.t !== 'match' || OV.st !== 'live' || !LV) { m3Stop(); return; }
  const dt = Math.min(100, ts - (LV.ts || ts)); LV.ts = ts;
  if (OV.net) netTick();
  if (!LV.paused && !(OV.net && OV.net.frz)) {
    LV.t -= dt;
    if (LV.ph === 'buy') { const s = Math.ceil(Math.max(0, LV.t) / 1000), e = $('#ppt'); if (e && e.textContent !== '(' + s + ')') e.textContent = '(' + s + ')'; qpTick(); if (LV.t <= 0) { if (OV.net) netBuyEnd(); else { if (LV.min && !LV.tuned) qpApply(LV.qr); lvPlay(); } } }
    else if (LV.ph === 'warm') warmTick();
    else if (LV.ph === 'wait') { /* онлайн: ждём ход ведущего */ }
    else if (LV.ph === 'round' && LV.ask === 2) { LV.at -= dt; if (LV.at <= 0 && OV.net && OV.net.host && LV.pre) callPick(LV.pre.op.def, 'op'); }
    else if (LV.ph === 'round' && LV.ask) { LV.t -= 0; LV.at -= dt; LV.t = LV.at; qpTick(); if (LV.at <= 0) callPick(LV.pre.call.def); }
    else if (LV.ph === 'round') { const S = LV.S; LV.rt += dt / 1000 * LV.spd;
      if (LV.pre && LV.rt >= LV.callT) { LV.rt = LV.callT;
        if (!LV.pre.call) { LV.ask = 2; LV.at = NET_CALL + 4000; netWaitDraw('Капитан соперника принимает решение…'); }
        else { LV.ask = 1; LV.at = LV.T = OV.net ? NET_CALL : 7000; LV.t = LV.T; callDraw(); sfx('scan'); } }
      while (LV.ei < S.ev.length && S.ev[LV.ei].t <= LV.rt) rdEvent(S, S.ev[LV.ei++]);
      /* часы раунда; после закладки — таймер бомбы 40 с */
      const rc = $('#rdc'); if (rc && !LV.bd && !/вышло/.test(rc.textContent)) { let h;
        if (S.plantT != null && LV.rt >= S.plantT) { const b = Math.max(0, Math.ceil(40 * (S.bombT - LV.rt) / Math.max(.1, S.bombT - S.plantT))); h = `<span class="bomb">C4 · 0:${String(b).padStart(2, '0')}</span>`; }
        else { const left = Math.max(0, Math.ceil(115 - LV.rt * 115 / 22)); h = `<span>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>`; }
        if (rc.innerHTML !== h) rc.innerHTML = h; }
      if (!LV.pre && LV.rt >= S.T) { while (LV.ei < S.ev.length) rdEvent(S, S.ev[LV.ei++]); rdDotsAt(S, S.T); lvEnd(); } }
    else { LV.t -= dt * (LV.spd - 1); if (LV.t <= 0) lvNext(); }
  }
  if (LV && LV.S) { const t = LV.ph === 'round' ? LV.rt : LV.ph === 'buy' || LV.ph === 'warm' ? 0 : LV.S.T; if (M3C) M3C.frame(t, LV.paused ? 0 : dt / 1000, LV.ph, LV.spd); else { rdDotsAt(LV.S, t); lvCam(t, LV.paused ? 0 : dt); } }
  requestAnimationFrame(lvTick);
}
