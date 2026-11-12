/* ---------- Матч в реальном времени: карта сверху, игроки с фото, составы, подготовка к раунду ----------
   По образцу менеджеров киберспорта, упрощено для телефона: карта рисуется один раз (картинка),
   двигаются только 10 кружков игроков (transform), камера — один transform контейнера. */
const WPN = { pistol: 'M3 3h11v2.4H9.6V10H6.4V5.4H3z', smg: 'M1 3h16v2.2h-3v2.4h-2.4V5.2H7v4.4H4V5.2H1z', rifle: 'M0 3.6h17l2.2-1.2H23v2.2h-3.4v1.2h-6v3.6h-2.4V5.8H6.4v2.6H3.2V5.8H0z', awp: 'M0 4h24v1.6H0zM7 2.2h5.6V4H7zM4 5.6h3.2V9H4zM14.4 5.6h2.2V8h-2.2z' };
const wpnOf = (buy, role) => buy === 'pistol' || buy === 'eco' ? 'pistol' : buy === 'force' ? (role === 0 ? 'pistol' : 'smg') : role === 0 ? 'awp' : 'rifle';
const wpnH = w => `<svg class="wpn" viewBox="0 0 24 10" aria-hidden="true"><path d="${WPN[w]}"/></svg>`;
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
  setTimeout(() => { const n = $('#intro'); if (n) n.classList.add('out'); }, 2300);
  lvBuy(true); requestAnimationFrame(lvTick);
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
    $(`#w-${t}-${i}`).innerHTML = wpnH(wpnOf(buy, s.info.e[i].c.role));
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
  const z = Math.max(1, C.z), px = C.x * Sz / 100, py = C.y * Sz / 100;
  const ox = clamp(W / 2 - px * z, W - Sz * z, 0), oy = clamp(H / 2 - py * z, H - Sz * z, 0);
  c.style.transform = `translate3d(${ox.toFixed(1)}px,${oy.toFixed(1)}px,0) scale(${z.toFixed(4)})`; c.style.setProperty('--iz', (1 / z).toFixed(3));
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
    lvKill(e.k);
  } else if (e.type === 'plant') { top.innerHTML = `<g class="rd-bomb" transform="translate(${sp[0] + 3.4} ${sp[1] - 3.4})"><circle r="2.2"/><text y=".8">C4</text></g>`; rc.innerHTML = '<span class="bomb">Бомба заложена</span>'; sfx('scan'); }
  else if (e.type === 'boom') { rdFx(`<circle class="rd-boom" cx="${sp[0]}" cy="${sp[1]}" r="3"/>`, 1400); top.innerHTML = ''; }
  else if (e.type === 'defuse') { top.innerHTML = `<g class="rd-bomb off" transform="translate(${sp[0] + 3.4} ${sp[1] - 3.4})"><circle r="2.2"/><text y=".8">✓</text></g>`; rc.innerHTML = '<span>Бомба обезврежена</span>'; }
  else if (e.type === 'time') rc.innerHTML = '<span>Время вышло</span>';
}
/* ---------- Кнопки внизу ---------- */
function lvBtns() {
  const c = $('#mbtn'); if (!c) return;
  if (OV.askQuit) { c.innerHTML = '<button class="btn dan s" data-act="quitYes">Сдаться — поражение</button><button class="btn s" data-act="quitNo">Играть дальше</button>'; return; }
  c.innerHTML = `<button class="lv-b" data-act="spd" aria-label="Скорость">×${LV.spd}</button><button class="lv-b" data-act="pause" aria-label="${LV.paused ? 'Продолжить' : 'Пауза'}">${LV.paused ? '▶' : '❚❚'}</button>${LV.ph === 'round' ? '<button class="lv-b" data-act="skipRound" aria-label="Досмотреть раунд">⏭</button>' : LV.ph === 'buy' && LV.min && !M3C ? '<button class="lv-b wide" data-act="prepOpen">План</button><button class="lv-b wide go" data-act="goRound">Начать ›</button>' : ''}<button class="lv-b wide q" data-act="quitAsk">Сдаться</button>`;
}
/* ---------- Подготовка к раунду: закупка, направление, темп, приказы ---------- */
function planDraw() {
  const m = OV.m, atk = m.sideA === 'A', p = $('#prep'); if (!p) return;
  if (M3C && !m.over && LV.ph === 'buy' && LV.min) { qpDraw(p); mmDraw(); lvBtns(); return; }
  if (m.over || LV.ph !== 'buy' || LV.min) { p.className = 'lv-prep'; p.innerHTML = ''; mmDraw(); lvBtns(); return; }
  const a = m.a, pistol = m.isPistol() || m.decider, auto = m.buyOf(a, OV.sel), cur = m.decider ? 'full' : m.buyOf(a, OV.sel, OV.plan.buy), eco = OV.sel.includes('eco');
  const buyB = k => { const B = BUY[k], can = a.money >= B.c, on = cur === k; return `<button class="pb ${on ? 'on' : ''} ${k === auto ? 'rec' : ''}" data-act="buyT" data-v="${k}" ${can && !eco ? '' : 'disabled'} aria-pressed="${on}"><b>${k === 'full' ? 'Полная' : k === 'force' ? 'Форс' : 'Эко'}</b><small>${B.c ? '$' + nf(B.c) : 'копим'}</small></button>`; };
  const hex = (v, ic, t, s) => `<button class="hx ${OV.plan.dir === v ? 'on' : ''}" data-act="dir" data-v="${v}" aria-pressed="${OV.plan.dir === v}"><span class="hx-i" aria-hidden="true">${ic}</span><b>${t}</b><small>${s}</small></button>`;
  const dirs = atk ? hex('A', 'A', 'Штурм A', 'вся команда на A') + hex('S', '⇄', 'Через центр', 'разделиться, точка позже') + hex('B', 'B', 'Штурм B', 'вся команда на B')
    : hex('A', 'A', 'Стек A', '3 на A, 1 мид, 1 на B') + hex('S', '◎', 'Ровно', '2 на A, 1 мид, 2 на B') + hex('B', 'B', 'Стек B', '3 на B, 1 мид, 1 на A');
  const cost = OV.sel.reduce((s, k) => s + AC[k].cost, 0), ctx = { side: m.sideA, behind: a.score < m.b.score, cap: m.capIgl(a) };
  const cards = a.hand.map(k => { const on = OV.sel.includes(k), v = acVal(k, a, ctx), dis = !on && cost + AC[k].cost > a.en; return `<button class="ac2 ${on ? 'on' : ''} ${dis ? 'dis' : ''}" data-act="sel" data-v="${k}" aria-pressed="${on}" ${dis ? 'aria-disabled="true"' : ''} title="${esc(AC[k].d)}"><span class="c">${AC[k].cost}</span><b>${AC[k].n}</b>${k === 'fake' || k === 'eco' ? '' : `<small class="${v < 0 ? 'neg' : 'pos'}">${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}</small>`}</button>`; }).join('');
  const it = m.nx.intel, fx = OV.plan.focus >= 0 ? a.info.e[OV.plan.focus].c.nick : '';
  p.className = 'lv-prep on'; LV.tuned = true;
  p.innerHTML = `<div class="pp-h"><div><small class="eyebrow">${atk ? 'Атака · T' : 'Защита · CT'} · раунд ${m.round}</small><b>Подготовка к раунду</b></div><button class="pp-min" data-act="prepMin" aria-label="Свернуть и посмотреть карту">▾</button></div>
    <div class="pp-money"><span>Деньги команды <b>$${nf(a.money)}</b></span><span class="mut">${pistol ? (m.decider ? 'Решающий раунд: полная закупка' : 'Пистолетный раунд') : 'Рекомендуем: ' + (auto === 'full' ? 'полную' : auto === 'force' ? 'форс' : 'эко')}</span></div>
    ${pistol ? '' : `<div class="pp-buy">${buyB('full')}${buyB('force')}${buyB('eco')}</div>`}${eco ? '<p class="sm mut pp-n">Приказ «Эко-раунд» — команда не закупается.</p>' : ''}
    <div class="pp-dir">${dirs}</div>
    ${segH('tempo', OV.plan.tempo, [['fast', 'Быстро'], ['norm', 'Обычно'], ['slow', 'Медленно']])}
    <div class="pp-en"><span>Приказы</span><span class="en2">${[1, 2, 3, 4, 5, 6, 7, 8].map(i => `<i class="${i <= a.en - cost ? 'on' : i <= a.en ? 'use' : ''}"></i>`).join('')}</span><b>${a.en - cost}/8</b></div>
    <div class="pp-cards">${cards}</div>
    <div class="pp-foc"><span>Ставка на игрока</span>${a.info.e.map((e, i) => `<button class="${OV.plan.focus === i ? 'on' : ''}" data-act="focus" data-v="${i}" aria-pressed="${OV.plan.focus === i}">${esc(e.c.nick)}</button>`).join('')}</div>
    ${it ? `<p class="sm mut pp-n"><b>Разведка:</b> ${esc(it.t)}</p>` : ''}
    <button class="btn pri pp-go" data-act="goRound">Следующий раунд <span id="ppt"></span></button>`;
  mmDraw(); lvBtns();
}
function handDraw() { planDraw(); }
function mmDraw() { document.querySelectorAll('#rowA .pl').forEach((c, i) => c.classList.toggle('foc', OV.plan.focus === i));
  if (M3C) { const q = LV.min && !LV.tuned && QP[OV.m.sideA][LV.qr]; M3C.plan(OV.m.sideA, LV.ph !== 'buy' || OV.m.over ? null : q ? { dir: q.dir, tempo: q.tempo } : OV.plan); }
  const g = $('#rd-plan'); if (!g) return; g.innerHTML = LV.ph === 'buy' ? rdPlanSvg(OV.m.map.n, OV.m.sideA, OV.plan) : ''; $('#lvv').className = 'lv-view sd-' + OV.m.sideA; }
function lvBuy(first) {
  const m = OV.m; LV.ph = 'buy'; LV.T = LV.t = first ? T_BUY1 : T_BUY; LV.min = !!M3C; LV.tuned = false; LV.kd = null;
  document.querySelectorAll('.pl').forEach(c => c.classList.remove('dead', 'hit')); document.querySelectorAll('[id^="hp-"]').forEach(h => h.style.width = '100%');
  $('#feed').innerHTML = ''; $('#bn').innerHTML = ''; $('#rdc').innerHTML = ''; const tp = $('#rd-top'); if (tp) tp.innerHTML = '';
  LV.S = rdIdle(); OV.sel = OV.sel.filter(k => m.a.hand.includes(k)); if (!m.canPlay(m.a, OV.sel)) OV.sel = [];
  lvHud(); planDraw();
}
function lvPlay() {
  const m = OV.m, sel = m.canPlay(m.a, OV.sel) ? OV.sel : [];
  LV.kd = { a: { k: [...m.a.k], d: [...m.a.d] }, b: { k: [...m.b.k], d: [...m.b.d] } };
  const L = m.play(sel, OV.plan);
  OV.sel = []; LV.last = L; LV.ph = 'round'; LV.rt = 0; LV.S = rdScript(L, m.map.n); LV.ei = 0; rdDotsBuild(LV.S); rdDotsAt(LV.S, 0);
  taskAdd(G, roundEvent(L)); G.live = { sa: m.a.score, sb: m.b.score }; save();
  planDraw(); lvKD();
  const tg = (pl, cut) => pl.length ? pl.map(k => k === cut ? `<s>${AC[k].n}</s>` : AC[k].n).join(', ') : 'без приказов';
  $('#feed').innerHTML = ''; $('#rdc').innerHTML = '<span>1:55</span>';
  $('#bn').innerHTML = `<div class="banner n sm"><span>Вы: ${DIRN[L.plan.dir]}, ${TEMPON[L.plan.tempo]} · ${tg(L.mine, L.cutA)}</span><span>Соперник: ${tg(L.theirs, L.cutB)}</span></div>`;
  setTimeout(() => { if (LV && LV.ph === 'round') $('#bn').innerHTML = ''; }, 2600);
}
function lvKill(k) {
  const L = LV.last, m = OV.m, kt = k.byA ? 'a' : 'b', vt = k.byA ? 'b' : 'a', K = k.byA ? m.a : m.b, V = k.byA ? m.b : m.a;
  const ks = k.byA ? L.sideA : other(L.sideA), f = $('#feed');
  f.insertAdjacentHTML('beforeend', `<div class="${k.byA ? '' : 'me'}"><span class="ka ${sideCol(ks)}">${esc(K.info.e[k.k].c.nick)}</span>${wpnH(wpnOf(k.byA ? L.buyA : L.buyB, K.info.e[k.k].c.role))}${k.hs ? '<i class="hs"></i>' : ''}<span class="va ${sideCol(other(ks))}">${esc(V.info.e[k.v].c.nick)}</span></div>`);
  while (f.children.length > 4) f.firstChild.remove();
  if (LV.kd) { LV.kd[kt].k[k.k]++; LV.kd[vt].d[k.v]++; }
  const vr = $(`#pl-${vt}-${k.v}`); if (vr) vr.classList.add('dead'); const hp = $(`#hp-${vt}-${k.v}`); if (hp) hp.style.width = '0%';
  const kr = $(`#pl-${kt}-${k.k}`); if (kr) { kr.classList.remove('hit'); void kr.offsetWidth; kr.classList.add('hit'); }
  lvKD(); sfx('kill');
}
function lvEnd() {
  const L = LV.last; LV.ph = 'end'; LV.t = T_END; lvBtns();
  const rd = { good: 'вы переиграли соперника по направлению', bad: 'соперник прочитал ваше направление', fake: 'фейк спас атаку' }[L.read];
  $('#bn').innerHTML = `<div class="banner ${L.win ? 'w' : 'l'}"><b>${L.win ? 'Раунд ваш' : 'Раунд проигран'}</b><span>${END[L.end]} · ${esc(L.mvp)}: ${L.ace ? 'эйс' : L.clutch ? 'клатч, ' + L.frags + ' фр.' : L.frags + ' фр.'}</span>${rd ? `<span>${rd}</span>` : ''}</div>`;
  LV.kd = null; lvHud(); sfx(L.win ? 'win' : 'lose');
}
function lvNext() {
  const m = OV.m, L = LV.last;
  if (m.over) { finishMatch(); return; }
  if (LV.ph === 'end' && L.swap) { LV.ph = 'half'; LV.t = T_HALF; $('#bn').innerHTML = `<div class="banner n"><b>Смена сторон</b><span>Вы теперь ${sideName(m.sideA)} · деньги сброшены</span></div>`; lvHud(); return; }
  if (LV.ph === 'end' && m.decider) { LV.ph = 'half'; LV.t = T_HALF; $('#bn').innerHTML = '<div class="banner n"><b>12:12</b><span>Решающий раунд, полная закупка у обеих команд</span></div>'; return; }
  lvBuy(false);
}
function lvTick(ts) {
  if (!OV || OV.t !== 'match' || OV.st !== 'live' || !LV) { m3Stop(); return; }
  const dt = Math.min(100, ts - (LV.ts || ts)); LV.ts = ts;
  if (!LV.paused) {
    LV.t -= dt;
    if (LV.ph === 'buy') { const s = Math.ceil(Math.max(0, LV.t) / 1000), e = $('#ppt'); if (e && e.textContent !== '(' + s + ')') e.textContent = '(' + s + ')'; if (M3C) qpTick(); if (LV.t <= 0) { if (M3C && LV.min && !LV.tuned) qpApply(LV.qr); lvPlay(); } }
    else if (LV.ph === 'round') { const S = LV.S; LV.rt += dt / 1000 * LV.spd;
      while (LV.ei < S.ev.length && S.ev[LV.ei].t <= LV.rt) rdEvent(S, S.ev[LV.ei++]);
      const left = Math.max(0, Math.ceil(115 - LV.rt * 115 / S.T)), rc = $('#rdc'); if (rc && !rc.querySelector('.bomb') && !/обезврежена|вышло/.test(rc.textContent)) rc.innerHTML = `<span>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</span>`;
      if (LV.rt >= S.T) { while (LV.ei < S.ev.length) rdEvent(S, S.ev[LV.ei++]); rdDotsAt(S, S.T); lvEnd(); } }
    else { LV.t -= dt * (LV.spd - 1); if (LV.t <= 0) lvNext(); }
  }
  if (LV && LV.S) { const t = LV.ph === 'round' ? LV.rt : LV.ph === 'buy' ? 0 : LV.S.T; if (M3C) M3C.frame(t, LV.paused ? 0 : dt / 1000, LV.ph, LV.spd); else { rdDotsAt(LV.S, t); lvCam(t, LV.paused ? 0 : dt); } }
  requestAnimationFrame(lvTick);
}
