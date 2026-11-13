/* ---------- Трейд: передача дубликатов другу ----------
   Коллекция → «Трейд»: выбрать друга, до 5 копий дубликатов (у себя остаётся минимум одна копия каждой карточки),
   провести «отправить». У друга — уведомление и входящий трейд: «Принять» / «Отклонить».
   Сервер (таблица trades, docs/supabase-trade.sql) хранит статус; каждое изменение статуса делается запросом
   «только если статус ещё прежний» — так карточки не начисляются и не возвращаются дважды, даже с двух устройств.
   Копии уходят из коллекции отправителя сразу при отправке (чтобы их нельзя было продать или потратить, пока трейд ждёт),
   при отказе или отмене возвращаются. Сохранение: G.trd = { done: [номера обработанных трейдов], seen: [...] } — необязательное поле. */
const TR_MAX = 5, TR_ICO = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let TR = { st: 'off', inc: [], out: [], hist: [], err: '', at: 0 };
let TRD = { to: null, pick: [], msg: '', ok: false, busy: false };
const trG = () => { const d = G.trd = G.trd && typeof G.trd === 'object' ? G.trd : {}; d.done = Array.isArray(d.done) ? d.done.slice(-200) : []; d.seen = Array.isArray(d.seen) ? d.seen.slice(-200) : []; return d; };
const trDone = id => trG().done.includes(id), trMark = id => { const d = trG(); if (!d.done.includes(id)) d.done.push(id); };
const trCards = t => (Array.isArray(t.cards) ? t.cards : []).filter(x => Array.isArray(x) && CARDS[x[0]] && x[1] > 0).map(x => [x[0] | 0, clamp(x[1] | 0, 1, TR_MAX)]);
const trTbl = e => /relation|does not exist|42P01|trades|schema cache/i.test(String(e && e.message)) ? 'На сервере ещё нет таблицы трейдов. Владельцу игры: запустить docs/supabase-trade.sql в Supabase → SQL Editor.' : sbErr(e);
const trFriends = () => AU ? FR.rows.filter(r => r.st === 'ok').map(r => r.a === AU.uid ? r.b : r.a) : [];
/* сколько копий можно отдать: всё, кроме одной, и минус уже выбранные */
const trPicked = id => TRD.pick.filter(x => x === id).length;
const trFree = id => { const o = G.cards[id]; return o ? Math.max(0, o.n - 1 - trPicked(id)) : 0; };
const trDupes = () => Object.keys(G.cards).map(Number).filter(id => CARDS[id] && G.cards[id].n > 1).map(id => CARDS[id]).sort((a, b) => b.rar - a.rar || b.ovr - a.ovr);
function trGive(cards, sign) { for (const [id, n] of cards) { if (sign > 0) for (let i = 0; i < n; i++) addCard(G, id); else { const o = G.cards[id]; if (o) o.n = Math.max(1, o.n - n); } } }

/* ---------- Сервер ---------- */
async function trLoad(quiet) {
  if (!AU) return; if (TR.st === 'off') TR.st = 'load';
  try {
    const rows = await sbFetch(`/rest/v1/trades?select=id,frm,rcv,frm_nick,cards,st,created_at,done_at&or=(frm.eq.${AU.uid},rcv.eq.${AU.uid})&order=created_at.desc&limit=60`, { method: 'GET' }, true) || [];
    TR = { st: 'ok', inc: rows.filter(t => t.rcv === AU.uid && t.st === 'pending'), out: rows.filter(t => t.frm === AU.uid && t.st === 'pending'), hist: rows.filter(t => t.st !== 'pending').slice(0, 12), err: '', at: Date.now() };
    /* отказали — вернуть свои копии (один раз: статус declined → returned) */
    for (const t of rows) if (t.frm === AU.uid && t.st === 'declined' && !trDone(t.id)) await trReturn(t, 'declined');
    /* новые входящие — уведомление */
    const d = trG(), fresh = TR.inc.filter(t => !d.seen.includes(t.id));
    if (fresh.length) { fresh.forEach(t => d.seen.push(t.id)); save(); if (!quiet) trToast(fresh[0], fresh.length); }
  } catch (e) { TR.st = 'err'; TR.err = trTbl(e); }
  trUi();
}
/* статус меняется только если он ещё прежний; вернулась строка — изменение наше */
const trSet = (id, from, to) => sbFetch(`/rest/v1/trades?id=eq.${id}&st=eq.${from}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ st: to, done_at: new Date().toISOString() }) }, true).then(r => r && r[0] ? r[0] : null);
async function trReturn(t, from) {
  const r = await trSet(t.id, from, from === 'pending' ? 'cancelled' : 'returned');
  if (r && !trDone(t.id)) { trMark(t.id); trGive(trCards(t), 1); save(); return true; }
  return false;
}
async function trSend() {
  if (!AU || TRD.busy) return; const to = TRD.to, ids = TRD.pick.slice();
  const say = (m, ok) => { TRD.msg = m; TRD.ok = !!ok; TRD.busy = false; trUi(); };
  if (!to || !trFriends().includes(to)) return say('Выберите друга.');
  if (!ids.length) return say('Выберите хотя бы одну карточку.');
  const cnt = {}; ids.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
  for (const id in cnt) { const o = G.cards[id]; if (!o || o.n - cnt[id] < 1) return say('Можно отдавать только дубликаты — одна копия каждой карточки остаётся у вас.'); }
  const cards = Object.keys(cnt).map(id => [+id, cnt[id]]);
  TRD.busy = true; trUi();
  try {
    const r = await sbFetch('/rest/v1/trades', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ frm: AU.uid, rcv: to, frm_nick: AU.nick, cards, st: 'pending' }) }, true);
    const t = r && r[0]; if (!t) throw new Error('Сервер не подтвердил трейд');
    trGive(cards, -1); save(); netPost(to, 'trade', { id: t.id });
    const nick = frNick(to); TRD = { to: null, pick: [], msg: `Трейд отправлен ${nick}: ${ids.length} ${ids.length === 1 ? 'карточка' : ids.length < 5 ? 'карточки' : 'карточек'}. Если ${nick} откажется, копии вернутся к вам.`, ok: true, busy: false };
    sfx('found'); trLoad(true);
  } catch (e) { say(/row-level|policy|42501/i.test(String(e.message)) ? 'Трейд можно отправить только другу.' : trTbl(e)); }
}
async function trAnswer(id, yes) {
  const t = TR.inc.find(x => x.id === id); if (!t) return;
  const cards = trCards(t);
  if (yes && cards.length !== (t.cards || []).length) { TRD.msg = 'В трейде есть карточка, которой нет в вашей версии игры. Обновите страницу.'; TRD.ok = false; trUi(); return; }
  t.busy = 1; trUi();
  try {
    const r = await trSet(id, 'pending', yes ? 'accepted' : 'declined');
    if (r && yes && !trDone(id)) { trMark(id); trGive(cards, 1); save(); sfx('found'); TRD.msg = `Карточки от ${t.frm_nick || 'друга'} добавлены в коллекцию.`; TRD.ok = true; }
    else if (r) { TRD.msg = 'Трейд отклонён, карточки вернутся отправителю.'; TRD.ok = true; }
    else { TRD.msg = 'Этот трейд уже обработан или отменён.'; TRD.ok = false; }
    netPost(t.frm, 'trade', { id });
  } catch (e) { TRD.msg = trTbl(e); TRD.ok = false; }
  t.busy = 0; trLoad(true);
}
async function trCancel(id) {
  const t = TR.out.find(x => x.id === id); if (!t) return; t.busy = 1; trUi();
  try { const ok = await trReturn(t, 'pending'); TRD.msg = ok ? 'Трейд отменён, карточки вернулись в коллекцию.' : 'Друг уже ответил на этот трейд.'; TRD.ok = ok; netPost(t.rcv, 'trade', { id }); }
  catch (e) { TRD.msg = trTbl(e); TRD.ok = false; }
  trLoad(true);
}
/* проверка раз в 20 с (и сразу по сигналу от друга) */
setInterval(() => { if (AU && !OV && !document.hidden) trLoad(); }, 20000);
const trUi = () => { if (OV || (sheet && sheet.t !== 'trPick')) return; if (tab === 'col' && sub === 'trade') render(); else { const d = !!TR.inc.length, b = document.querySelector('#tabs [data-v="col"]'); if (b && !!b.querySelector('.dot') !== d) render(); } };

/* ---------- Уведомление ---------- */
function trToast(t, n) {
  if (OV) return; let el = document.getElementById('tr-toast');
  if (!el) { el = document.createElement('div'); el.id = 'tr-toast'; el.className = 'tr-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = `<span class="tr-t-ico" aria-hidden="true">${TR_ICO}</span><div><b>${n > 1 ? 'Вам направлено трейдов: ' + n : 'Вам направлен трейд'}</b><span>от ${esc(t.frm_nick || 'друга')} · ${trCards(t).reduce((s, x) => s + x[1], 0)} карт.</span></div><button class="btn pri s" data-act="trOpen">Открыть</button><button class="tr-t-x" data-act="trToastX" aria-label="Скрыть">×</button>`;
  el.classList.add('on'); sfx('scan'); clearTimeout(el.T); el.T = setTimeout(() => el.classList.remove('on'), 9000);
}

/* ---------- Экран «Трейд» ---------- */
const trCardsH = cards => `<div class="tr-cards">${cards.map(([id, n]) => `<div class="tr-cc">${cardH(CARDS[id], { cls: 'xs' })}${n > 1 ? `<i>×${n}</i>` : ''}</div>`).join('')}</div>`;
const trAgo = s => { const m = Math.max(0, Math.round((Date.now() - Date.parse(s)) / 60000)); return m < 1 ? 'только что' : m < 60 ? m + ' мин назад' : m < 1440 ? Math.round(m / 60) + ' ч назад' : Math.round(m / 1440) + ' дн назад'; };
function vTrade() {
  if (!AU) return `<section class="pn tr-box"><h3>Трейд</h3><p class="sm">Передавайте друзьям дубликаты карточек. Нужен аккаунт и друзья в профиле.</p><button class="btn pri" data-act="authOpen">Войти или создать аккаунт</button></section>`;
  const fr = trFriends(), d = trDupes(), cap = TRD.pick.length;
  const inc = TR.inc.map(t => `<div class="tr-in"><div class="tr-in__h">${avaH(FR.nick[t.frm] && FR.nick[t.frm].ava, 'sm')}<div><b>${esc(t.frm_nick || frNick(t.frm))}</b><span>${trAgo(t.created_at)} · ${trCards(t).reduce((s, x) => s + x[1], 0)} карт.</span></div></div>
      ${trCardsH(trCards(t))}<div class="tr-in__b"><button class="btn pri" data-act="trYes" data-v="${t.id}" ${t.busy ? 'disabled' : ''}>Принять</button><button class="btn" data-act="trNo" data-v="${t.id}" ${t.busy ? 'disabled' : ''}>Отклонить</button></div></div>`).join('');
  const slots = Array.from({ length: TR_MAX }, (_, i) => { const id = TRD.pick[i]; return id != null ? `<button class="tr-slot on" data-act="trUnpick" data-v="${i}" aria-label="Убрать ${esc(CARDS[id].nick)}">${cardH(CARDS[id], { cls: 'xs' })}<i aria-hidden="true">×</i></button>` : `<div class="tr-slot"><span>${i + 1}</span></div>`; }).join('');
  const grid = d.length ? d.map(c => { const f = trFree(c.id); return `<button class="tr-d ${f ? '' : 'off'}" data-act="trPick" data-v="${c.id}" ${f && cap < TR_MAX ? '' : 'disabled'} aria-label="${esc(c.nick)}, можно отдать ${f}">${cardH(c, { cls: 'xs', lv: G.cards[c.id].lv })}<em>${f ? 'можно ' + f : 'всё выбрано'}</em></button>`; }).join('') : '<p class="sm mut">У вас пока нет дубликатов. Они появляются, когда из кейса выпадает карточка, которая уже есть в коллекции.</p>';
  const ready = TRD.to && cap && !TRD.busy;
  return `${TR.st === 'err' ? `<p class="acc-err">${esc(TR.err)}</p>` : ''}
    ${TRD.msg ? `<p class="${TRD.ok ? 'fr-ok' : 'acc-err'}" role="status">${esc(TRD.msg)}</p>` : ''}
    ${inc ? `<section class="pn tr-box tr-inbox"><div class="profile-section-title"><small>INCOMING</small><h3>ВХОДЯЩИЕ ТРЕЙДЫ · ${TR.inc.length}</h3></div>${inc}</section>` : ''}
    <section class="pn tr-box"><div class="profile-section-title"><small>NEW TRADE</small><h3>НОВЫЙ ТРЕЙД</h3></div>
      <div class="tr-step"><b>1</b><span>Кому</span></div>
      ${fr.length ? `<div class="tr-fr">${fr.map(id => `<button class="tr-f ${TRD.to === id ? 'on' : ''}" data-act="trTo" data-v="${id}" aria-pressed="${TRD.to === id}">${avaH(FR.nick[id] && FR.nick[id].ava, 'md')}<span>${esc(frNick(id))}</span></button>`).join('')}</div>`
        : `<p class="sm mut">Пока нет друзей. Добавьте друга по нику в профиле.</p><button class="btn s" data-act="frOpen">Друзья в профиле</button>`}
      <div class="tr-step"><b>2</b><span>Карточки · ${cap} из ${TR_MAX}</span>${cap ? '<button class="tr-clr" data-act="trClear">Очистить</button>' : ''}</div>
      <div class="tr-slots">${slots}</div>
      <p class="sm mut">Нажмите на дубликат, чтобы добавить копию. Одна копия каждой карточки всегда остаётся у вас.</p>
      <div class="tr-grid">${grid}</div>
      <div class="tr-step"><b>3</b><span>Отправить</span></div>
      <div class="sw ${ready ? '' : 'off'}" id="tr-sw" aria-disabled="${!ready}"><div class="sw-fill"></div><span class="sw-t">${TRD.busy ? 'Отправляем…' : ready ? 'Проведите вправо, чтобы отправить →' : !TRD.to ? 'Выберите друга' : 'Выберите карточки'}</span><button class="sw-k" ${ready ? '' : 'disabled'} aria-label="Отправить трейд (проведите вправо или нажмите Enter)">${TR_ICO}</button></div>
    </section>
    ${TR.out.length ? `<section class="pn tr-box"><div class="profile-section-title"><small>OUTGOING</small><h3>ЖДУТ ОТВЕТА</h3></div>${TR.out.map(t => `<div class="tr-in"><div class="tr-in__h">${avaH(FR.nick[t.rcv] && FR.nick[t.rcv].ava, 'sm')}<div><b>${esc(frNick(t.rcv))}</b><span>${trAgo(t.created_at)} · ждёт ответа</span></div><button class="btn s" data-act="trCancel" data-v="${t.id}" ${t.busy ? 'disabled' : ''}>Отменить</button></div>${trCardsH(trCards(t))}</div>`).join('')}</section>` : ''}
    ${TR.hist.length ? `<section class="pn tr-box"><div class="profile-section-title"><small>HISTORY</small><h3>ИСТОРИЯ</h3></div>${TR.hist.map(t => { const me = t.frm === AU.uid, who = me ? frNick(t.rcv) : (t.frm_nick || frNick(t.frm)), st = { accepted: me ? 'принял' : 'вы приняли', declined: me ? 'отклонил' : 'вы отклонили', returned: me ? 'отклонил — карточки вернулись' : 'вы отклонили', cancelled: me ? 'вы отменили' : 'отправитель отменил' }[t.st] || t.st;
      return `<div class="tr-h"><span>${me ? '→' : '←'}</span><b>${esc(who)}</b><em class="${t.st === 'accepted' ? 'ok' : ''}">${me ? esc(who) + ' ' : ''}${st}</em><small>${trCards(t).reduce((s, x) => s + x[1], 0)} карт. · ${trAgo(t.done_at || t.created_at)}</small></div>`; }).join('')}</section>` : ''}`;
}

/* ---------- Свайп «отправить» ---------- */
(function swipe() {
  let drag = null;
  const end = ok => { if (!drag) return; const { k, f } = drag; drag = null; if (ok) { k.style.transform = ''; ACT.trSendNow(); render(); return; } k.style.transition = f.style.transition = 'transform .25s, width .25s'; k.style.transform = 'translateX(0)'; f.style.width = '0'; };
  document.addEventListener('pointerdown', e => { const k = e.target.closest && e.target.closest('.sw-k'); if (!k || k.disabled) return; const sw = k.parentElement, f = sw.querySelector('.sw-fill');
    drag = { k, f, x0: e.clientX, max: sw.clientWidth - k.offsetWidth - 8 }; k.style.transition = f.style.transition = 'none'; try { k.setPointerCapture(e.pointerId); } catch (x) { /* старые браузеры */ } e.preventDefault(); });
  document.addEventListener('pointermove', e => { if (!drag) return; const d = clamp(e.clientX - drag.x0, 0, drag.max); drag.k.style.transform = `translateX(${d}px)`; drag.f.style.width = (d + drag.k.offsetWidth) + 'px'; if (d >= drag.max * .92) end(true); });
  document.addEventListener('pointerup', () => end(false)); document.addEventListener('pointercancel', () => end(false));
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target && e.target.classList && e.target.classList.contains('sw-k') && !e.target.disabled) { e.preventDefault(); ACT.trSendNow(); render(); } });
})();

Object.assign(ACT, {
  trOpen() { const el = document.getElementById('tr-toast'); if (el) el.classList.remove('on'); sheet = null; tab = 'col'; sub = 'trade'; trLoad(true); scrollTo(0, 0); },
  trToastX() { const el = document.getElementById('tr-toast'); if (el) el.classList.remove('on'); return false; },
  trTo(v) { TRD.to = TRD.to === v ? null : v; TRD.msg = ''; },
  trPick(v) { const id = +v; if (TRD.pick.length >= TR_MAX || !trFree(id)) return false; TRD.pick.push(id); TRD.msg = ''; sfx('tap'); },
  trUnpick(v) { TRD.pick.splice(+v, 1); },
  trClear() { TRD.pick = []; },
  trSendNow() { trSend(); return false; },
  trYes(v) { trAnswer(v, true); return false; },
  trNo(v) { trAnswer(v, false); return false; },
  trCancel(v) { trCancel(v); return false; }
});
