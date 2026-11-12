/* ---------- Онлайн: друзья, вызов на матч, подбор соперника и матч с живым игроком ----------
   Связь — через базу Supabase (таблицы net_msgs и net_here, см. docs/supabase-online.sql): личный канал «fl-u-<id>»
   для приглашений и канал матча «fl-m-<id>». (Realtime-WebSocket на настоящем сервере не доставлял сообщения.)
   Матч считает только ведущий (кто пригласил, при подборе — у кого меньше id): второй игрок присылает свой план
   и решения капитана, ведущий разыгрывает раунд и рассылает результат и состояние матча. Повтор раунда
   строится одинаково у обоих (сценарий радара зависит только от результата раунда).
   Онлайн-матчи на интерес: кубки, монеты, опыт и задания не меняются, ведётся только личный счёт с соперником. */
const NET_V = '1:' + ALL.length;                 /* версия правил: у обоих игроков должна совпадать */
const NET_BUY = 5000, NET_BUY1 = 8000, NET_CALL = 5000, NET_SPD = 2.4, NET_LOST = 12000, NET_GIVEUP = 60000, NET_INV = 20000;
const RT = { ch: {}, open: false, err: '', st: 'off', lob: 0, last: null, here: [], hereK: '', skew: 0, busy: 0, timer: 0 };
const rtErr = e => { const was = RT.err; RT.err = String(e || '').slice(0, 160); if (RT.err !== was) { console.warn('[online]', RT.err); profUi(); } };
const NET = { on: 0, st: 'idle', qt: 0, mm: null, inv: null, msg: '' };
let FR = { st: 'off', rows: [], nick: {}, msg: '', err: '' };
const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- Связь через базу Supabase (те же запросы, что у сохранений) ----------
   Сообщения — строки таблицы net_msgs (канал, событие, данные, отправитель); каждый игрок опрашивает новые строки
   своих каналов: в матче раз в 0,6 с, иначе раз в 1,5 с. «Кто в игре» — таблица net_here: раз в 5 с отметка о себе.
   Каналы: fl-u-<id> — личный (приглашения, заявки), fl-m-<id> — матч. */
const rtTbl = e => /relation|does not exist|42P01|net_msgs|net_here|schema cache/i.test(String(e && e.message)) ? 'на сервере нет таблиц онлайна — владельцу запустить docs/supabase-online.sql' : sbErr(e);
const rtOk = () => { RT.open = true; if (RT.err) { RT.err = ''; profUi(); } };
const srvIso = ms => new Date(Date.now() + RT.skew + ms).toISOString();
function rtJoin(name, o) {
  const old = RT.ch[name]; if (old) { Object.assign(old, o || {}); return old; }
  const c = RT.ch[name] = Object.assign({ name, ok: true, pres: {} }, o || {});
  if (c.onJoin) setTimeout(() => { if (RT.ch[name] === c) c.onJoin(); }, 0);
  rtKick(0); return c;
}
function rtLeave(name) { delete RT.ch[name]; }
function rtSend(name, ev, p) {
  if (!AU) return false;
  sbFetch('/rest/v1/net_msgs', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ch: name, ev, p: p || {}, frm: AU.uid }) }, true)
    .then(() => { RT.open = true; }).catch(e => { RT.open = false; rtErr(rtTbl(e)); });
  return true;
}
function rtTrack(name) { if (name === 'fl-lobby') hereUp(); }
async function hereUp() {
  if (!AU) return;
  try {
    const r = await sbFetch('/rest/v1/net_here?on_conflict=uid', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(Object.assign(netMeta(), { seen: new Date().toISOString() })) }, true);
    const me = r && r[0]; if (me && me.seen) RT.skew = Date.parse(me.seen) - Date.now();
    RT.open = true; if (!RT.lob) { RT.lob = 1; RT.err = ''; onlineUi(true); }
  } catch (e) { RT.lob = 0; RT.open = false; rtErr(rtTbl(e)); }
}
async function hereLoad() {
  if (!AU) return;
  try {
    const rows = await sbFetch(`/rest/v1/net_here?select=uid,nick,st,v,t&seen=gt.${encodeURIComponent(srvIso(-16000))}&limit=500`, { method: 'GET' }, true) || [];
    rtOk(); RT.here = rows; const k = JSON.stringify(rows.map(x => x.uid + x.st).sort()); if (k !== RT.hereK) { RT.hereK = k; onlineUi(); }
  } catch (e) { rtErr(rtTbl(e)); }
}
async function rtPoll() {
  RT.timer = 0; if (!AU) return;
  const chs = Object.keys(RT.ch).filter(n => RT.ch[n].on); if (!chs.length || RT.busy) { rtKick(); return; }
  RT.busy = 1;
  try {
    if (RT.last == null) { const r = await sbFetch('/rest/v1/net_msgs?select=id&order=id.desc&limit=1', { method: 'GET' }, true); RT.last = r && r[0] ? r[0].id : 0; }
    const r = await sbFetch(`/rest/v1/net_msgs?select=id,ch,ev,p,frm&id=gt.${RT.last}&ch=in.(${chs.join(',')})&order=id.asc&limit=200`, { method: 'GET' }, true) || [];
    rtOk();
    for (const m of r) { RT.last = Math.max(RT.last, m.id); if (m.frm === AU.uid) continue; const c = RT.ch[m.ch]; if (c && c.on) try { c.on(m.ev, m.p || {}); } catch (e) { console.error(e); } }
  } catch (e) { RT.open = false; rtErr(rtTbl(e)); }
  RT.busy = 0; rtKick();
}
function rtKick(ms) { if (RT.timer) { if (ms !== 0) return; clearTimeout(RT.timer); } RT.timer = setTimeout(rtPoll, ms != null ? ms : OV && OV.net ? 600 : document.hidden ? 6000 : 1500); }
/* отправить в личный канал другого игрока */
function netPost(uid, ev, p) { if (!AU || uid === AU.uid) return; rtSend('fl-u-' + uid, ev, Object.assign({ from: AU.uid, nick: AU.nick }, p || {})); }

/* ---------- «Кто в игре» и личный канал ---------- */
const netMeta = () => ({ uid: AU.uid, nick: AU.nick, st: NET.st, v: NET_V, t: NET.qt || 0 });
function netSt(st) { NET.st = st; if (AU && NET.on) hereUp(); }
function onlineMap() { const o = {}; for (const x of RT.here) if (x && x.uid) o[x.uid] = x; if (AU && RT.lob) o[AU.uid] = netMeta(); return o; }
const onlineUi = force => { mmTick(); profUi(); };
setInterval(() => { if (!AU || !NET.on || document.hidden) return; hereUp(); hereLoad(); }, 5000);
/* свои старые сообщения убираем, чтобы таблица не росла */
setInterval(() => { if (!AU || !NET.on) return; sbFetch(`/rest/v1/net_msgs?frm=eq.${AU.uid}&at=lt.${encodeURIComponent(srvIso(-300000))}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, true).catch(() => {}); }, 90000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && AU && NET.on) { hereUp(); hereLoad(); rtKick(0); } });
function netBoot() {
  if (!AU || NET.on) return; NET.on = 1; RT.st = 'conn';
  rtJoin('fl-u-' + AU.uid, { on: netInbox });
  hereUp().then(hereLoad); frLoad();
}
function netStop() {
  if (AU && NET.on) sbFetch(`/rest/v1/net_here?uid=eq.${AU.uid}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, true).catch(() => {});
  NET.on = 0; NET.mm = null; NET.inv = null; RT.ch = {}; RT.here = []; RT.lob = 0; RT.last = null; clearTimeout(RT.timer); RT.timer = 0; FR = { st: 'off', rows: [], nick: {}, msg: '', err: '' };
}
const squadReady = () => !!squadInfo(squadOf(G));
function netInbox(ev, p) {
  if (!p || !p.from || p.from === AU.uid) return;
  if (ev === 'inv') {
    if (p.v !== NET_V) { netPost(p.from, 'inv-no', { mid: p.mid, why: 'ver' }); return; }
    if (OV || NET.inv || NET.mm || NET.st !== 'idle' || !squadReady()) { netPost(p.from, 'inv-no', { mid: p.mid, why: 'busy' }); return; }
    NET.inv = { in: 1, mid: p.mid, uid: p.from, nick: p.nick, until: Date.now() + NET_INV }; sheet = { t: 'netInv' }; sfx('found'); render(); return;
  }
  if (ev === 'inv-x') { if (NET.inv && NET.inv.in && NET.inv.mid === p.mid) { NET.inv = null; if (sheet && sheet.t === 'netInv') sheet = { t: 'netMsg', msg: esc(p.nick) + ' отменил вызов.' }; render(); } return; }
  if (ev === 'inv-ok') { const I = NET.inv; if (I && I.out && I.mid === p.mid) netMatch(I.mid, true, I.uid, I.nick); return; }
  if (ev === 'inv-no') { const I = NET.inv; if (I && I.out && I.mid === p.mid) { NET.inv = null; netSt('idle'); sheet = { t: 'netMsg', msg: p.why === 'ver' ? 'У ' + esc(I.nick) + ' другая версия игры. Обновите страницу у обоих.' : p.why === 'busy' ? esc(I.nick) + ' сейчас занят.' : esc(I.nick) + ' отказался от матча.' }; render(); } return; }
  if (ev === 'fr') { frLoad(); return; }
  if (ev === 'mm') { const M = NET.mm; if (M && !M.lock && p.v === NET_V) { M.lock = 1; netPost(p.from, 'mm-ok', { mid: p.mid }); netMatch(p.mid, false, p.from, p.nick); } else netPost(p.from, 'mm-no', { mid: p.mid }); return; }
  if (ev === 'mm-ok') { const M = NET.mm; if (M && M.offer === p.mid && !M.lock) { M.lock = 1; netMatch(p.mid, true, p.from, p.nick); } return; }
  if (ev === 'mm-no') { const M = NET.mm; if (M && M.offer === p.mid) M.offer = null; }
}

/* ---------- Подбор случайного соперника: пары по очереди поиска ---------- */
function mmGo() { if (!AU || OV || !squadReady()) return; NET.mm = { t0: Date.now(), offer: null, lock: 0 }; NET.qt = Date.now(); netSt('q'); sheet = { t: 'netMm' }; }
function mmStop() { if (!NET.mm) return; NET.mm = null; NET.qt = 0; if (NET.st === 'q') netSt('idle'); }
function mmTick() {
  const M = NET.mm; if (!M || M.lock || !AU) return;
  const q = Object.values(onlineMap()).filter(x => x.st === 'q' && x.v === NET_V).sort((a, b) => (a.t - b.t) || (a.uid < b.uid ? -1 : 1));
  const i = q.findIndex(x => x.uid === AU.uid); if (i < 0) return; const o = q[i ^ 1]; if (!o) return;
  if (AU.uid < o.uid && (!M.offer || Date.now() - M.offT > 5000)) { M.offer = rid(); M.offT = Date.now(); netPost(o.uid, 'mm', { mid: M.offer, v: NET_V }); }
}
/* ---------- Вызов друга ---------- */
function invGo(uid, nick) {
  if (!AU || OV || NET.inv || !squadReady()) return; const mid = rid();
  NET.inv = { out: 1, mid, uid, nick, until: Date.now() + NET_INV }; netSt('inv'); netPost(uid, 'inv', { mid, v: NET_V }); sheet = { t: 'netInv' };
}
function invDrop(say) { const I = NET.inv; if (!I) return; NET.inv = null; if (I.out) { netPost(I.uid, 'inv-x', { mid: I.mid }); netSt('idle'); } else if (say !== false) netPost(I.uid, 'inv-no', { mid: I.mid }); }
/* список друзей обновляется сам: раз в 10 с при открытом окне, раз в минуту на вкладке «Матчи» (уведомление о заявке могло потеряться) */
let frT = 0;
setInterval(() => { if (!AU || OV || document.hidden) return; frT++; if ((tab === 'prof' && !sheet) || (sheet && sheet.t === 'frP') || (tab === 'play' && !sheet && frT % 6 === 0)) frLoad(); }, 10000);
/* таймеры окон поиска и приглашения; закрыли окно — отменяем */
setInterval(() => {
  if (NET.mm && !NET.mm.lock) { if (!sheet || sheet.t !== 'netMm') mmStop(); else { mmTick(); const e = $('#mm-t'), s = Math.floor((Date.now() - NET.mm.t0) / 1000); if (e) e.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); } }
  const I = NET.inv; if (I) {
    if (!sheet || sheet.t !== 'netInv') invDrop();
    else { const left = Math.max(0, Math.ceil((I.until - Date.now()) / 1000)), e = $('#inv-t'); if (e) e.textContent = left;
      if (left <= 0) { invDrop(); sheet = { t: 'netMsg', msg: I.out ? esc(I.nick) + ' не ответил.' : 'Время на ответ вышло.' }; render(); } }
  }
}, 1000);

/* ---------- Состояние матча для второго игрока (зеркально: «мы» ↔ «соперник») ---------- */
const SIDE_F = ['score', 'money', 'en', 'bonusEn', 'hand', 'k', 'd', 'mv', 'op', 'ls', 'ws', 'spent', 'buys'];
const sideOf = s => { const o = {}; for (const k of SIDE_F) o[k] = s[k]; return o; };
const snapOf = m => ({ r: m.round, sA: m.sideA, dc: m.decider, ov: m.over, wn: !!m.won, a: sideOf(m.a), b: sideOf(m.b), h: m.hist });
const flipRead = r => r === 'good' ? 'bad' : r === 'bad' ? 'good' : null;
const mirH = x => Object.assign({}, x, { win: !x.win, side: other(x.side), dirA: x.dirB, dirB: x.dirA, focus: -1, mine: x.theirs || [], theirs: x.mine || [], p: 1 - x.p, buyA: x.buyB || x.buyA, buyB: x.buyA, read: flipRead(x.read), openMine: !x.openMine, score: String(x.score || '').split(':').reverse().join(':') });
function snapApply(sn) {
  const m = OV.m, cp = o => JSON.parse(JSON.stringify(o));
  m.round = sn.r; m.sideA = other(sn.sA); m.decider = !!sn.dc; m.over = !!sn.ov; m.won = !sn.wn;
  Object.assign(m.a, cp(sn.b)); Object.assign(m.b, cp(sn.a)); m.hist = (sn.h || []).map(mirH);
}
function mirL(L) {
  const k = (L.kills || []).map(x => Object.assign({}, x, { byA: !x.byA }));
  return Object.assign({}, L, { sideA: other(L.sideA), plan: L.planB, planB: L.plan, mine: L.theirs || [], theirs: L.mine || [], cutA: L.cutB, cutB: L.cutA, va: L.vb, vb: L.va, pa: L.pb, pb: L.pa,
    p: L.p == null ? L.p : 1 - L.p, win: L.win == null ? L.win : !L.win, buyA: L.buyB, buyB: L.buyA, openMine: L.openMine == null ? L.openMine : !L.openMine, read: flipRead(L.read), intel: null, kills: k, kA: k.filter(x => x.byA).length, awpK: k.filter(x => x.byA && x.k === 0).length });
}
function mirS(S) {
  const sw = t => t === 'a' ? 'b' : 'a';
  S.dots.forEach(d => { d.team = sw(d.team); }); S.aAtt = !S.aAtt; if (S.planter) S.planter = sw(S.planter[0]) + S.planter.slice(1);
  S.ev = S.ev.map(e => e.k ? Object.assign({}, e, { k: Object.assign({}, e.k, { byA: !e.k.byA }) }) : e); return S;
}
const sqIds = () => G.squad.map(id => [id, own(id).lv]);
function sqFrom(a) {
  if (!Array.isArray(a) || a.length !== 5) return null;
  const sq = a.map(x => Array.isArray(x) && CARDS[x[0]] ? { c: CARDS[x[0]], lv: clamp(x[1] | 0, 1, 5) } : null);
  return sq.every(Boolean) && squadInfo(sq) ? sq : null;
}
const netMaps = () => RD_POOL.map(n => MAPS.find(x => x.n === n)).filter(Boolean);

/* ---------- Матч: старт ---------- */
function netMatch(mid, host, op, opNick) {
  if (OV) return; NET.mm = null; NET.inv = null; NET.qt = 0; sheet = null; netSt('m');
  const N = { mid, host, op, opNick, ch: 'fl-m-' + mid, s: 0, rs: 0, seen: Date.now(), frz: 0, live: 0, done: 0, last: null, lastT: 0 };
  OV = { t: 'match', st: 'net', net: N, m: null, sel: [], plan: { dir: 'S', tempo: 'norm', focus: -1, buy: null }, reward: null, askQuit: false, built: false };
  rtJoin(N.ch, { on: (ev, p) => netMsg(N, ev, p), onJoin: () => { if (!N.host && !OV.m) netHi(); } });
  N.iv = setInterval(() => netIv(N), 1000);
  render();
}
function netBuild() {
  const o = $('#over'), N = OV.net;
  o.innerHTML = `<div class="mt"><div class="mt-bg"></div><div class="wrap mt-in" id="mt"><div class="splash net-sp"><p class="eyebrow">Онлайн-матч · на интерес</p><h1>${esc(N.opNick)}</h1>
    <div class="net-w"><i class="net-spin"></i><b>Подключаемся к сопернику…</b></div><p class="sm mut">Кубки, монеты и опыт за онлайн-матч не меняются.</p>
    <button class="btn s" data-act="netCancel">Отменить</button></div></div></div>`;
  o.hidden = false; o.scrollTop = 0; OV.built = true; sfx('found');
}
function netHi() { const N = OV && OV.net; if (!N) return; N.hiT = Date.now(); rtSend(N.ch, 'hi', { sq: sqIds(), capt: captSlot(G), nick: AU.nick, tro: G.tro, v: NET_V }); }
function netSplash() {
  const m = OV.m, N = OV.net; OV.st = 'netgo';
  const mt = $('#mt'); if (mt) mt.innerHTML = `<div class="splash net-sp"><p class="eyebrow">Онлайн-матч · на интерес</p>
    <div class="net-vs"><div><b>${esc(AU.nick)}</b><span>рейтинг ${m.a.info.rating.toFixed(1)}</span></div><i>VS</i><div><b>${esc(N.opNick)}</b><span>рейтинг ${m.b.info.rating.toFixed(1)}</span></div></div>
    <h2>${esc(m.map.n)}</h2><p class="sm mut">Вы начинаете ${sideName(m.sideA)}. На план раунда — ${NET_BUY / 1000} с, на решение капитана — ${NET_CALL / 1000} с. Пропустить нельзя.</p></div>`;
  sfx('found'); setTimeout(() => { if (OV && OV.net === N && !N.done) netLive(); }, 2600);
}
function netLive() {
  const N = OV.net; liveGo(); N.live = 1; LV.spd = NET_SPD; LV.ph = 'wait'; netWaitDraw('Ждём соперника…'); lvBtns();
  if (N.host) { if (N.opRdy) lvBuy(true); }
  else { N.rdy = 1; N.rdyT = Date.now(); rtSend(N.ch, 'rdy', {}); if (N.pend) netGuestApplyBuy(); }
}
/* ведущий: ход по сети */
function hostSend(N, ev, p) { p.s = ++N.s; N.last = { ev, p }; N.lastT = Date.now(); rtSend(N.ch, ev, p); }
function netBuySent() { const N = OV.net, m = OV.m; if (!N.live) return; N.opPlan = null; N.opFin = 0; hostSend(N, 'buy', { r: m.round, T: LV.T, snap: snapOf(m) }); }
function netAfterPlay() {
  const N = OV.net, m = OV.m; if (!N.host) return;
  if (LV.pre) hostSend(N, 'pre', { r: m.round, fake: LV.pre.S, callT: LV.callT, call: LV.pre.op || null });
  else hostSend(N, 'rd', { r: LV.last.round, L: LV.last, opt: null, snap: snapOf(m) });
}
function netAfterPick(L, opt, note) { const N = OV.net; hostSend(N, 'rd', { r: L.round, L, opt, snap: snapOf(OV.m), note: /^соперник:/.test(note) ? note.replace(/^соперник: /, '') : 'Соперник принял решение' }); }
function netCall(m) {
  if (m.isPistol() || m.round < 2 || LV.lastCall === m.round - 1 || Math.random() > .4) return null;
  const hostAtk = m.sideA === 'A';
  return Math.random() < .5 ? { me: callGen(hostAtk, OV.plan.dir, m.nx.plan.dir), op: null } : { me: null, op: callGen(!hostAtk, m.nx.plan.dir, OV.plan.dir) };
}
function netBuyEnd() {
  const N = OV.net, m = OV.m;
  if (!LV.sent) { if (LV.min && !LV.tuned) qpApply(LV.qr); LV.sent = 1; LV.sentAt = Date.now(); if (N.host) netWaitDraw('Ждём план соперника…'); else { netPlanSend(true); netWaitDraw('План отправлен — ждём соперника'); } }
  if (N.host && (N.opFin === m.round || Date.now() - LV.sentAt > 2500)) {
    const P = N.opPlan || {}, dir = DIRS.includes(P.dir) ? P.dir : 'S', tempo = TEMPOS.includes(P.tempo) ? P.tempo : 'norm';
    m.nx = { plan: { dir, tempo, focus: -1 }, cards: P.card && AC[P.card] && m.canPlay(m.b, [P.card]) ? [P.card] : [], slip: false, intel: null };
    lvPlay();
  }
}
function netPlanSend(fin) {
  const N = OV.net, m = OV.m; if (N.host) return;
  const p = { r: m.round, dir: OV.plan.dir, tempo: OV.plan.tempo, card: OV.sel[0] || null, fin: !!fin };
  if (fin) { N.fin = p; N.finT = Date.now(); } rtSend(N.ch, 'pl', p);
}
function netGuestMc(i) {
  const N = OV.net; N.mc = { r: OV.m.round, i }; N.mcT = Date.now(); rtSend(N.ch, 'mc', N.mc);
  LV.ask = 2; LV.at = 1e9; const o = LV.pre.call.opts[i] || LV.pre.call.opts[LV.pre.call.def]; netWaitDraw('Решение принято: ' + o.t); sfx('tap');
}
function netWaitDraw(t) { const p = $('#prep'); if (!p) return; p.className = 'lv-prep on net-wait'; p.innerHTML = `<div class="net-w"><i class="net-spin"></i><b>${esc(t)}</b></div>`; }
/* второй игрок: применить ход ведущего */
function netGuestApplyBuy() {
  const P = N_(); if (!P || !P.pend || !LV) return; const x = P.pend; P.pend = null;
  snapApply(x.p.snap); lvBuy(x.p.r === 1); P.fin = null;
  LV.T = x.p.T; LV.t = Math.max(1500, x.p.T - (Date.now() - x.at)); qpTick();
}
const N_ = () => OV && OV.net;
function netGuestNext() { const N = OV.net; if (N.pend) netGuestApplyBuy(); else { LV.ph = 'wait'; netWaitDraw('Ждём соперника…'); lvBtns(); } }
const kdOf = m => ({ a: { k: [...m.a.k], d: [...m.a.d] }, b: { k: [...m.b.k], d: [...m.b.d] } });
function netGuestPre(p) {
  const m = OV.m, fake = mirL(p.fake), S = mirS(rdScript(p.fake, m.map.n));
  LV.kd = kdOf(m); OV.net.fin = null;
  LV.pre = { sel: [], call: p.call || null, S: fake }; LV.last = fake; LV.ph = 'round'; LV.rt = 0; LV.bd = 0; LV.ask = 0;
  LV.S = S; LV.ev0 = S.ev; LV.S.ev = []; LV.ei = 0; LV.callT = p.callT; LV.lastCall = m.round;
  rdDotsBuild(LV.S); rdDotsAt(LV.S, 0); planDraw(); lvKD();
  $('#feed').innerHTML = ''; $('#rdc').innerHTML = '<span>1:55</span>'; $('#bn').innerHTML = `<div class="banner n sm"><span>Вы: ${DIRN[fake.plan.dir] || ''}, ${TEMPON[fake.plan.tempo] || ''}</span></div>`;
  setTimeout(() => { if (LV && LV.ph === 'round' && !LV.ask) $('#bn').innerHTML = ''; }, 2200);
}
function netGuestRd(p) {
  const m = OV.m, N = OV.net, cont = !!p.opt;
  if (!cont || !LV.pre) LV.kd = LV.kd && LV.pre ? LV.kd : kdOf(m);
  snapApply(p.snap); N.fin = null; N.mc = null;
  const S = mirS(rdScript(p.L, m.map.n, p.opt || undefined)), L = mirL(p.L);
  OV.sel = []; LV.pre = null; LV.ask = 0; LV.last = L; LV.ph = 'round'; LV.bd = 0; LV.S = S; LV.ei = 0;
  if (cont) { LV.rt = Math.max(LV.rt || 0, p.opt.t0 || 0); while (LV.ei < S.ev.length && S.ev[LV.ei].t < p.opt.t0) LV.ei++; rdDotsBuild(S);
    const pp = $('#prep'); if (pp) { pp.className = 'lv-prep'; pp.innerHTML = ''; }
    if (p.note) { const bn = $('#bn'), h = `<div class="banner n sm"><b>${esc(p.note)}</b></div>`; if (bn) { bn.innerHTML = h; setTimeout(() => { if (bn.innerHTML === h) bn.innerHTML = ''; }, 1500); } } }
  else { LV.rt = 0; rdDotsBuild(S); rdDotsAt(S, 0);
    const tg = (pl, cut) => pl && pl.length ? pl.map(k => k === cut ? `<s>${AC[k].n}</s>` : AC[k].n).join(', ') : 'без приказов';
    $('#feed').innerHTML = ''; $('#rdc').innerHTML = '<span>1:55</span>';
    $('#bn').innerHTML = `<div class="banner n sm"><span>Вы: ${DIRN[L.plan.dir] || ''}, ${TEMPON[L.plan.tempo] || ''} · ${tg(L.mine, L.cutA)}</span><span>Соперник: ${tg(L.theirs, L.cutB)}</span></div>`;
    setTimeout(() => { if (LV && LV.ph === 'round') $('#bn').innerHTML = ''; }, 2600); }
  planDraw(); lvKD(); lvBtns();
}
/* ---------- Сообщения канала матча ---------- */
function netMsg(N, ev, p) {
  if (!OV || OV.net !== N || N.done) return;
  N.seen = Date.now();
  if (ev === 'hb') return;
  if (ev === 'bye') { if (!OV.m || OV.st === 'net' || OV.st === 'netgo') netAbort(esc(N.opNick) + ' отменил матч.'); else netEnd(true, 'Соперник вышел из матча'); return; }
  if (ev === 'ff') { netEnd(true, 'Соперник сдался'); return; }
  if (N.host) {
    if (ev === 'hi' && !OV.m) {
      if (p.v !== NET_V) { rtSend(N.ch, 'bye', {}); netAbort('У соперника другая версия игры. Обновите страницу у обоих.'); return; }
      const osq = sqFrom(p.sq), sq = squadOf(G), info = squadInfo(sq); if (!osq || !info) { rtSend(N.ch, 'bye', {}); netAbort('Состав соперника не прочитался.'); return; }
      N.opNick = String(p.nick || N.opNick).slice(0, 16);
      OV.m = new Match(sq, G.tro, info.rating, { capt: captSlot(G), opp: { sq: osq, name: N.opNick, tro: p.tro | 0, capt: clamp(p.capt | 0, -1, 4) }, map: pick(netMaps()) });
      hostSend(N, 'start', { sq: sqIds(), capt: captSlot(G), nick: AU.nick, tro: G.tro, map: OV.m.map.n, snap: snapOf(OV.m) }); netSplash(); return;
    }
    if (ev === 'rdy') { if (!N.opRdy) { N.opRdy = 1; if (N.live && LV && LV.ph === 'wait') lvBuy(true); } return; }
    if (!OV.m || !LV) return;
    if (ev === 'pl' && p.r === OV.m.round) { N.opPlan = p; if (p.fin) N.opFin = p.r; return; }
    if (ev === 'mc' && p.r === OV.m.round && LV.ask === 2 && LV.pre && LV.pre.op) { callPick(p.i | 0, 'op'); return; }
    return;
  }
  /* второй игрок: сообщения ведущего идут по номеру, повторы пропускаем */
  if (p.s && p.s <= N.rs) return; if (p.s) N.rs = p.s;
  if (ev === 'start' && !OV.m) {
    const hsq = sqFrom(p.sq), sq = squadOf(G), info = squadInfo(sq), map = MAPS.find(x => x.n === p.map);
    if (!hsq || !info || !map) { rtSend(N.ch, 'bye', {}); netAbort('Не удалось начать матч.'); return; }
    N.opNick = String(p.nick || N.opNick).slice(0, 16);
    OV.m = new Match(sq, G.tro, info.rating, { capt: captSlot(G), opp: { sq: hsq, name: N.opNick, tro: p.tro | 0, capt: clamp(p.capt | 0, -1, 4) }, map });
    snapApply(p.snap); netSplash(); return;
  }
  if (!OV.m) return;
  if (ev === 'buy') { N.gotBuy = 1; N.pend = { p, at: Date.now() }; if (N.live && LV && (LV.ph === 'wait' || LV.ph === 'buy')) netGuestApplyBuy(); return; }
  if (!N.live || !LV) return;
  if (ev === 'pre') { if (N.pend) netGuestApplyBuy(); netGuestPre(p); return; }
  if (ev === 'rd') { if (N.pend) netGuestApplyBuy(); netGuestRd(p); }
}
/* раз в секунду: пульс, повтор последнего хода, проверка, что соперник на связи */
function netIv(N) {
  if (!OV || OV.net !== N || N.done) { clearInterval(N.iv); return; }
  const t = Date.now();
  if (t - (N.hbT || 0) > 3000) { N.hbT = t; rtSend(N.ch, 'hb', {}); }
  if (N.host) { if (N.last && t - N.lastT > 2500) { N.lastT = t; rtSend(N.ch, N.last.ev, N.last.p); } }
  else {
    if (!OV.m) { if (t - (N.hiT || 0) > 1500) netHi(); }
    else if (N.rdy && !N.gotBuy && t - (N.rdyT || 0) > 1500) { N.rdyT = t; rtSend(N.ch, 'rdy', {}); }
    if (N.fin && t - N.finT > 1500) { N.finT = t; rtSend(N.ch, 'pl', N.fin); }
    if (N.mc && t - N.mcT > 1500) { N.mcT = t; rtSend(N.ch, 'mc', N.mc); }
  }
  const gap = t - N.seen, started = !!OV.m; N.frz = started && N.live && gap > NET_LOST;
  let el = $('#net-lost');
  if (N.frz || (started && !RT.open)) { if (!el) { $('#over').insertAdjacentHTML('beforeend', '<div class="net-lost" id="net-lost"></div>'); el = $('#net-lost'); }
    const left = Math.max(0, Math.ceil((NET_GIVEUP - gap) / 1000)); el.innerHTML = `<i class="net-spin"></i><b>${RT.open ? 'Соперник не отвечает' : 'Нет связи с сервером'}</b><span>ждём ещё 0:${String(left).padStart(2, '0')}</span>`; }
  else if (el) el.remove();
  if (gap > (started ? NET_GIVEUP : 30000)) { if (started) netEnd(RT.open, RT.open ? 'Соперник отключился' : 'Связь потеряна'); else netAbort(RT.open ? 'Соперник не подключился.' : 'Нет связи с сервером. Проверьте интернет.'); }
}
function netTick() { /* хук из игрового цикла: всё по таймеру делает netIv */ }
/* ---------- Конец матча ---------- */
function netFinish(why) {
  const m = OV.m, N = OV.net; if (N.done) return; N.done = 1; clearInterval(N.iv); OV.st = 'end';
  const pv = G.pvp = G.pvp && typeof G.pvp === 'object' ? G.pvp : {}, r = pv[N.op] = pv[N.op] || { n: N.opNick, w: 0, l: 0 };
  r.n = N.opNick; if (m.won) r.w++; else r.l++; N.rec = r; N.why = why || '';
  const lost = $('#net-lost'); if (lost) lost.remove();
  setTimeout(() => rtLeave(N.ch), 1500); netSt('idle'); save(); endBuild();
}
function netEnd(won, why) { if (!OV || !OV.net || !OV.m || OV.net.done) return; const m = OV.m; m.over = true; m.won = won; if (LV) LV.ph = 'end'; netFinish(why); }
function netAbort(msg) { const N = OV && OV.net; if (N) { N.done = 1; clearInterval(N.iv); setTimeout(() => rtLeave(N.ch), 800); } OV = null; LV = null; netSt('idle'); sheet = { t: 'netMsg', msg }; render(); }
function netQuit() {
  const N = OV.net; if (!N.done) {
    if (OV.m && OV.st !== 'net' && OV.st !== 'netgo') { rtSend(N.ch, 'ff', {}); const pv = G.pvp = G.pvp && typeof G.pvp === 'object' ? G.pvp : {}, r = pv[N.op] = pv[N.op] || { n: N.opNick, w: 0, l: 0 }; r.l++; }
    else rtSend(N.ch, 'bye', {});
    N.done = 1; clearInterval(N.iv); setTimeout(() => rtLeave(N.ch), 1500);
  }
  OV = null; LV = null; netSt('idle');
}
function netResH() {
  const N = OV.net, r = N.rec || { w: 0, l: 0 };
  return `<div class="pn rw-box net-res"><h3>Онлайн-матч на интерес</h3>${N.why ? `<p class="net-why">${esc(N.why)}</p>` : ''}
    <div class="net-rec"><span>Личный счёт с ${esc(N.opNick)}</span><b>${r.w}:${r.l}</b></div><p class="sm mut">Кубки, монеты, опыт и задания за онлайн-матч не меняются.</p></div>`;
}

/* ---------- Друзья: заявки и список (таблица friends в Supabase) ---------- */
async function frLoad() {
  if (!AU) return; if (FR.st !== 'ok') FR.st = 'load';
  try {
    const rows = await sbFetch(`/rest/v1/friends?select=a,b,st&or=(a.eq.${AU.uid},b.eq.${AU.uid})`, { method: 'GET' }, true) || [];
    const ids = [...new Set(rows.map(r => r.a === AU.uid ? r.b : r.a))];
    const q = c => sbFetch(`/rest/v1/leaders?select=${c}&id=in.(${ids.join(',')})`, { method: 'GET' });
    let ns = []; if (ids.length) { try { ns = await q('id,nick,tro,ava') || []; } catch (e) { if (!/column|ava|42703|PGRST/i.test(String(e.message))) throw e; ns = await q('id,nick,tro') || []; } }
    FR = Object.assign(FR, { st: 'ok', rows, nick: Object.fromEntries(ns.map(x => [x.id, x])), err: '' });
  } catch (e) { FR.st = 'err'; FR.err = /relation|does not exist|42P01|friends/i.test(String(e.message)) ? 'На сервере ещё нет таблицы друзей. Владельцу игры: запустить docs/supabase-online.sql в Supabase → SQL Editor.' : sbErr(e); }
  profUi();
}
const frNick = id => (FR.nick[id] && FR.nick[id].nick) || (G.pvp && G.pvp[id] && G.pvp[id].n) || 'игрок';
async function frAdd(nick) {
  nick = String(nick || '').trim();
  const say = (msg, ok) => { FRF.msg = msg; FRF.ok = !!ok; FRF.busy = false; profUi(); };
  if (!nickOk(nick)) return say('Ник: от 3 до 16 символов, латиница, цифры и «_».');
  if (nick.toLowerCase() === AU.nick.toLowerCase()) return say('Это ваш ник.');
  try {
    const r = await sbFetch(`/rest/v1/leaders?select=id,nick&nick=ilike.${encodeURIComponent(nick.replace(/_/g, '\\_'))}&limit=1`, { method: 'GET' });
    if (!r || !r.length) return say('Игрок не найден. Он должен хотя бы раз зайти в игру со своим аккаунтом.');
    const id = r[0].id, ex = FR.rows.find(x => (x.a === id && x.b === AU.uid) || (x.a === AU.uid && x.b === id));
    if (ex && ex.st === 'ok') return say(r[0].nick + ' уже у вас в друзьях.');
    if (ex && ex.a === id) { await frAccept(id); return say(r[0].nick + ' теперь у вас в друзьях.', 1); }
    if (ex) return say('Заявка уже отправлена — ждём, когда ' + r[0].nick + ' примет.');
    await sbFetch('/rest/v1/friends', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ a: AU.uid, b: id, st: 'pending' }) }, true);
    netPost(id, 'fr', {}); FRF.nick = ''; await frLoad(); say('Заявка отправлена ' + r[0].nick + '.', 1);
  } catch (e) { say(/duplicate|23505|409/i.test(String(e.message)) ? 'Заявка уже отправлена.' : /relation|does not exist|42P01/i.test(String(e.message)) ? 'На сервере ещё нет таблицы друзей (docs/supabase-online.sql).' : sbErr(e)); }
}
async function frAccept(id) {
  await sbFetch(`/rest/v1/friends?a=eq.${id}&b=eq.${AU.uid}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ st: 'ok' }) }, true);
  netPost(id, 'fr', {}); await frLoad();
}
async function frDel(id) {
  await sbFetch(`/rest/v1/friends?or=(and(a.eq.${AU.uid},b.eq.${id}),and(a.eq.${id},b.eq.${AU.uid}))`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, true);
  netPost(id, 'fr', {}); await frLoad();
}
/* ---------- Экраны ---------- */
function netStH(id) {
  const o = onlineMap()[id]; if (!o) return '<span class="fr-st off">не в сети</span>';
  return o.st === 'idle' ? (o.v === NET_V ? '<span class="fr-st on">в игре</span>' : '<span class="fr-st off">старая версия</span>') : o.st === 'm' ? '<span class="fr-st bz">в матче</span>' : '<span class="fr-st bz">занят</span>';
}
function netBoxH() {
  const ready = squadReady(), on = Object.keys(onlineMap()).filter(id => id !== (AU && AU.uid)).length, fon = FR.rows.filter(r => r.st === 'ok').map(r => r.a === AU?.uid ? r.b : r.a).filter(id => onlineMap()[id]).length;
  const inc = AU ? FR.rows.filter(r => r.st === 'pending' && r.b === AU.uid).length : 0;
  return `<section class="pn net-box"><div class="net-h"><div><small>ONLINE · 1 VS 1</small><b>ОНЛАЙН-МАТЧ</b></div><span>на интерес — без кубков и монет</span></div>
    ${!AU ? `<p class="sm">Сыграйте с друзьями или со случайным игроком в реальном времени. Нужен аккаунт.</p><button class="btn pri" data-act="authOpen">Войти или создать аккаунт</button>`
    : `<p class="sm">Живой соперник, ${NET_BUY / 1000} с на план раунда и ${NET_CALL / 1000} с на решение капитана — без пауз и перемотки.${on ? ` Сейчас в игре: <b>${on}</b>.` : ''}</p>
      <div class="net-btns"><button class="btn pri" data-act="netMm" ${ready ? '' : 'disabled'}>Найти соперника</button><button class="btn" data-act="frOpen">Друзья в профиле${fon ? ` · ${fon} в игре` : ''}${inc ? ` <i class="fr-dot">${inc}</i>` : ''}</button></div>
      ${ready ? '' : '<p class="sm mut">Сначала соберите пятёрку.</p>'}
      <p class="net-diag ${RT.lob && RT.open && !RT.err ? 'ok' : RT.err ? 'err' : ''}">${RT.lob && RT.open && !RT.err ? 'Онлайн подключён · видно игроков: ' + Object.keys(onlineMap()).length : RT.err ? 'Онлайн не подключился — ' + esc(RT.err) : RT.st === 'conn' || RT.st === 'open' ? 'Подключаемся к онлайну…' : 'Онлайн не подключён' + ''}</p>`}</section>`;
}
const popX = xBtn.replace('class="lg-x"', 'class="lg-x st-x0"');
function mmH() {
  return `<div class="in st-pop net-pop">${popX}<p class="eyebrow">Онлайн · на интерес</p><h2>Ищем соперника</h2>
    <div class="net-w big"><i class="net-spin"></i><b id="mm-t">0:00</b></div>
    <p class="acc-sub">Подбираем любого игрока, который сейчас тоже ищет матч. Позовите друга нажать «Найти соперника» — так быстрее.</p>
    <button class="btn acc-go" data-act="close">Отменить поиск</button></div>`;
}
function invH() {
  const I = NET.inv; if (!I) return `<div class="in st-pop net-pop">${popX}<h2>Вызов</h2><p class="acc-sub">Вызов отменён.</p><button class="btn pri acc-go" data-act="close">Понятно</button></div>`;
  const left = Math.max(0, Math.ceil((I.until - Date.now()) / 1000));
  if (I.out) return `<div class="in st-pop net-pop">${popX}<p class="eyebrow">Вызов на матч</p><h2>${esc(I.nick)}</h2>
    <div class="net-w big"><i class="net-spin"></i><b>Ждём ответа · <span id="inv-t">${left}</span></b></div><p class="acc-sub">Матч на интерес: кубки и монеты не меняются.</p>
    <button class="btn acc-go" data-act="close">Отменить вызов</button></div>`;
  return `<div class="in st-pop net-pop">${popX}<p class="eyebrow">Тебя вызывают на матч</p><h2>${esc(I.nick)}</h2>
    <p class="acc-sub">Онлайн-матч 1 на 1, на интерес: кубки и монеты не меняются. Ответить — <b id="inv-t">${left}</b> с.</p>
    <div class="net-btns"><button class="btn pri acc-go" data-act="invYes">Принять</button><button class="btn acc-go" data-act="close">Отказаться</button></div></div>`;
}
const netMsgH = () => `<div class="in st-pop net-pop">${popX}<p class="eyebrow">Онлайн</p><p class="net-msg">${sheet.msg || ''}</p><button class="btn pri acc-go" data-act="close">Понятно</button></div>`;
function netSheetH() { const t = sheet.t; return t === 'netMm' ? mmH() : t === 'netInv' ? invH() : t === 'netMsg' ? netMsgH() : ''; }

Object.assign(ACT, {
  frCall(v) { const o = onlineMap()[v]; if (!o || o.st !== 'idle') return; invGo(v, frNick(v)); },
  netMm() { if (!AU) { sheet = { t: 'auth', mode: 'in' }; return; } mmGo(); },
  invYes() { const I = NET.inv; if (!I || !I.in) return; NET.inv = null; netPost(I.uid, 'inv-ok', { mid: I.mid }); netMatch(I.mid, false, I.uid, I.nick); },
  netCancel() { if (OV && OV.net) netQuit(); }
});
