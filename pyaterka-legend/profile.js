/* ---------- Профиль: аватарки, друзья в профиле, профиль друга, удаление из друзей с подтверждением ----------
   Аватарка — номер из набора AVA (G.ava, необязательное поле сохранения; старые сохранения — аватарка 0).
   Чтобы друзья видели аватарку, коллекцию и состав, при отправке в облако в таблицу leaders пишутся ava и pub
   (колонки добавляет docs/supabase-profile.sql; пока их нет, облако работает как раньше, без этих полей). */
const AVA = [
  ['#1f5fa8', '#0b1f3a', 'Прицел', '<circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>'],
  ['#c98a1a', '#3a2306', 'Корона', '<path d="M4 17 3 7.5l5 3.5 4-6 4 6 5-3.5-1 9.5z" fill="currentColor"/><rect x="4" y="18.2" width="16" height="2.2" rx="1" fill="currentColor"/>'],
  ['#d2472b', '#3a0d06', 'Пламя', '<path d="M12 2.5c1 3.6 5.5 5.6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.3 2.6-5.6.3 1.8 1.2 2.8 2.2 3.1-.6-3 0-5.8.7-8.5z" fill="currentColor"/>'],
  ['#e9c13a', '#3b2c05', 'Молния', '<path d="M13.5 2 5 13.5h5.5L9.5 22 19 9.8h-5.6z" fill="currentColor"/>'],
  ['#6a4fd1', '#170d3a', 'Звезда', '<path d="m12 2.5 2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z" fill="currentColor"/>'],
  ['#2f9d6b', '#06281a', 'Щит', '<path d="M12 2.5 20 5.5v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10v-6z" fill="none" stroke="currentColor" stroke-width="1.9"/><text x="12" y="15.6" text-anchor="middle" font-size="9" font-weight="700" fill="currentColor" font-family="Oswald, Impact, sans-serif">5</text>'],
  ['#9aa6b4', '#1a2028', 'Череп', '<path d="M12 3c4.7 0 8 3.1 8 7.3 0 2.3-1 3.9-2.6 4.9V19h-2.6v-2h-1.7v2h-2.2v-2H9.2v2H6.6v-3.8C5 14.2 4 12.6 4 10.3 4 6.1 7.3 3 12 3z" fill="currentColor"/><circle cx="8.8" cy="10.5" r="2" fill="#1a2028"/><circle cx="15.2" cy="10.5" r="2" fill="#1a2028"/><path d="m12 13.2-1.2 2h2.4z" fill="#1a2028"/>'],
  ['#25a7c9', '#05242e', 'Алмаз', '<path d="M7 4h10l4 5-9 11L3 9z" fill="currentColor"/><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5" fill="none" stroke="#05242e" stroke-width="1.1"/>'],
  ['#c23a6b', '#330818', 'Глаз', '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.4" fill="currentColor"/>'],
  ['#d7d2c4', '#2a2720', 'Крылья', '<path d="M12 9c-2-3.5-6-5-9.5-4.5 1 2 2 3 3.4 3.6-1.6.1-2.6.6-3.3 1.4 1.7 1.2 3.4 1.6 5 1.3-1 .7-1.6 1.6-1.8 2.7 2.6.3 4.8-.8 6.2-2.6 1.4 1.8 3.6 2.9 6.2 2.6-.2-1.1-.8-2-1.8-2.7 1.6.3 3.3-.1 5-1.3-.7-.8-1.7-1.3-3.3-1.4 1.4-.6 2.4-1.6 3.4-3.6C18 4 14 5.5 12 9z" fill="currentColor"/><path d="M12 9v10" stroke="currentColor" stroke-width="1.6"/>'],
  ['#8fb03a', '#1c2606', 'Граната', '<rect x="7" y="8.5" width="10" height="12" rx="4.5" fill="currentColor"/><rect x="9.5" y="5" width="5" height="3.5" rx="1" fill="currentColor"/><path d="M14.5 6.5h3.5l1.5 2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7.5 12.5h9M7.5 16.5h9" stroke="#1c2606" stroke-width="1"/>'],
  ['#4a6fe0', '#0c1638', 'Гарнитура', '<path d="M4.5 14v-2a7.5 7.5 0 0 1 15 0v2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3" y="13" width="4.5" height="7" rx="2" fill="currentColor"/><rect x="16.5" y="13" width="4.5" height="7" rx="2" fill="currentColor"/><path d="M19 20c0 1.5-2 2-4.5 2" fill="none" stroke="currentColor" stroke-width="1.5"/>'],
  ['#e2a63c', '#3a2606', 'Кубок', '<path d="M7 3.5h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.6 10M17 5h3v1.5A3.5 3.5 0 0 1 16.4 10" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 13.5h3v3.5h-3zM7.5 17h9v3.5h-9z" fill="currentColor"/>'],
  ['#7a8cff', '#141a40', 'Призрак', '<path d="M12 2.5a7 7 0 0 1 7 7v11l-2.4-1.8-2.3 1.8-2.3-1.8-2.3 1.8-2.3-1.8L5 20.5v-11a7 7 0 0 1 7-7z" fill="currentColor"/><circle cx="9.3" cy="10" r="1.6" fill="#141a40"/><circle cx="14.7" cy="10" r="1.6" fill="#141a40"/>'],
  ['#f07a2e', '#3a1704', 'Мишень', '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="currentColor"/>'],
  ['#3ec4a0', '#06302a', 'Клинок', '<path d="M19.5 2.5 9 13l2 2L21.5 4.5z" fill="currentColor"/><path d="m6.5 13.5 4 4M8 16l-4.5 4.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'],
  ['#b84cd6', '#2a0838', 'Планета', '<circle cx="12" cy="12" r="5.8" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="3.4" fill="none" stroke="currentColor" stroke-width="1.5" transform="rotate(-22 12 12)"/>'],
  ['#ff5a5a', '#3a0b0b', 'Пятёрка', '<text x="12" y="18.5" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor" font-family="Oswald, Impact, sans-serif">5</text>']
];
const avaOf = i => AVA[(i | 0) >= 0 && (i | 0) < AVA.length ? i | 0 : 0];
/* круглый значок аватарки; ring — цвет обводки (лига) */
function avaH(i, cls, ring) {
  const a = avaOf(i);
  return `<span class="ava-b ${cls || ''}" style="--a1:${a[0]};--a2:${a[1]}${ring ? ';--ring:' + ring : ''}" role="img" aria-label="Аватар «${a[2]}»"><svg viewBox="0 0 24 24" aria-hidden="true">${a[3]}</svg></span>`;
}
const myAva = () => (G && G.ava | 0) || 0;
const colPct = (have, tot) => Math.round(have / Math.max(1, tot) * 100);
/* то, что видно друзьям: коллекция и состав */
const pubOf = g => ({ col: Object.keys(g.cards || {}).length, colT: ALL.length, sq: (g.squad || []).map(id => id == null ? null : [id, (g.cards[id] || {}).lv || 1]), capt: captSlot(g) });

/* ---------- Друзья в профиле ---------- */
let FRF = { nick: '', msg: '', ok: false, busy: false };
function frFormKeep() { const i = document.getElementById('fr-nick'); if (i) FRF.nick = i.value; }
/* перерисовать профиль, не сбивая ввод ника */
function profUi() {
  const ae = document.activeElement; if (ae && ae.id === 'fr-nick') return;
  if (sheet && (sheet.t === 'frP' || sheet.t === 'fr')) { render(); return; }
  if (!OV && !sheet && (tab === 'prof' || tab === 'play')) { frFormKeep(); render(); }
}
function frSecH() {
  if (!AU) return `<section class="pf-friends pn"><div class="profile-section-title"><small>SQUAD MATES</small><h3>ДРУЗЬЯ</h3></div>
    <p class="sm">Добавляйте друзей по нику, смотрите их профиль и вызывайте на онлайн-матч. Нужен аккаунт.</p><button class="btn pri" data-act="authOpen">Войти или создать аккаунт</button></section>`;
  const me = AU.uid, oth = r => r.a === me ? r.b : r.a, inc = FR.rows.filter(r => r.st === 'pending' && r.b === me), out = FR.rows.filter(r => r.st === 'pending' && r.a === me), ok = FR.rows.filter(r => r.st === 'ok');
  const on = onlineMap(), ready = squadReady();
  const rec = id => { const r = G.pvp && G.pvp[id]; return r && (r.w || r.l) ? `<small class="fr-rec">${r.w}:${r.l}</small>` : ''; };
  const ava = id => avaH(FR.nick[id] && FR.nick[id].ava, 'sm', FR.nick[id] ? LCOL[leagueOf(FR.nick[id].tro | 0)] : '');
  const row = (id, right, open) => `<div class="fr-row ${open ? 'is-link' : ''}" ${open ? `data-act="frView" data-v="${id}" role="button" tabindex="0" aria-label="Профиль ${esc(frNick(id))}"` : ''}>${ava(id)}<div class="fr-n"><b>${esc(frNick(id))}</b>${netStH(id)}</div>${rec(id)}${right}</div>`;
  const okRows = ok.map(oth).sort((x, y) => (on[y] ? 1 : 0) - (on[x] ? 1 : 0)).map(id => { const o = on[id], can = o && o.st === 'idle' && o.v === NET_V && ready && !OV;
    return row(id, `<button class="btn pri s" data-act="frCall" data-v="${id}" ${can ? '' : 'disabled'}>Вызвать</button><span class="fr-go" aria-hidden="true">›</span>`, 1); }).join('');
  return `<section class="pf-friends pn" id="pf-friends"><div class="profile-section-title"><small>SQUAD MATES</small><h3>ДРУЗЬЯ${ok.length ? ' · ' + ok.length : ''}</h3></div>
    <div class="fr-add"><label class="acc-f"><span>Добавить по нику</span><input id="fr-nick" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="16" value="${esc(FRF.nick || '')}" placeholder="ник друга в игре"></label><button class="btn pri" data-act="frAdd" ${FRF.busy ? 'disabled' : ''}>${FRF.busy ? '…' : 'Добавить'}</button></div>
    ${FRF.msg ? `<p class="${FRF.ok ? 'fr-ok' : 'acc-err'}" role="status">${esc(FRF.msg)}</p>` : ''}
    ${FR.st === 'err' ? `<p class="acc-err">${esc(FR.err)}</p>` : ''}
    ${inc.length ? `<div class="fr-sec"><h4>Заявки в друзья · ${inc.length}</h4>${inc.map(r => row(r.a, `<button class="btn pri s" data-act="frOk" data-v="${r.a}">Принять</button><button class="fr-x" data-act="frNo" data-v="${r.a}" aria-label="Отклонить заявку">×</button>`)).join('')}</div>` : ''}
    <div class="fr-sec">${okRows || `<p class="sm mut">${FR.st === 'load' ? 'Загружаем…' : 'Пока никого. Добавьте друга по нику — он увидит заявку у себя.'}</p>`}</div>
    ${out.length ? `<div class="fr-sec"><h4>Отправленные заявки</h4>${out.map(r => row(r.b, `<span class="sm mut">ждёт ответа</span><button class="fr-x" data-act="frNo" data-v="${r.b}" aria-label="Отменить заявку">×</button>`)).join('')}</div>` : ''}
    <p class="sm mut">Нажмите на друга, чтобы открыть его профиль.${ready ? '' : ' Чтобы вызывать на матч, соберите пятёрку.'}</p></section>`;
}

/* ---------- Профиль друга (сокращённый) ---------- */
async function frViewLoad(id) {
  const s = sheet;
  try {
    let r = null;
    try { r = await sbFetch(`/rest/v1/leaders?select=id,nick,tro,best,lvl,w,l,ava,pub,updated_at&id=eq.${id}`, { method: 'GET' }, true); }
    catch (e) { if (!/column|ava|pub|42703|PGRST/i.test(String(e.message))) throw e; r = await sbFetch(`/rest/v1/leaders?select=id,nick,tro,best,lvl,w,l,updated_at&id=eq.${id}`, { method: 'GET' }, true); }
    if (sheet !== s) return; s.p = r && r[0] ? r[0] : null; s.st = s.p ? 'ok' : 'none';
  } catch (e) { if (sheet !== s) return; s.st = 'err'; s.err = sbErr(e); }
  render();
}
function frPH() {
  const s = sheet, id = s.id, p = s.p || {}, nick = p.nick || frNick(id), lg = leagueOf(p.tro | 0), n = (p.w | 0) + (p.l | 0), pub = p.pub || null;
  const rec = G.pvp && G.pvp[id], on = onlineMap()[id], can = on && on.st === 'idle' && on.v === NET_V && squadReady() && !OV;
  const isFr = FR.rows.some(r => r.st === 'ok' && (r.a === id || r.b === id));
  const sq = pub && Array.isArray(pub.sq) ? pub.sq.map((x, i) => x && CARDS[x[0]] ? `<div class="fp-card"><small>${RNAME[i]}</small>${cardH(CARDS[x[0]], { lv: clamp(x[1] | 0, 1, 5), cls: 'xs' })}</div>` : `<div class="fp-card is-empty"><small>${RNAME[i]}</small><span>—</span></div>`).join('') : '';
  const body = s.st === 'load' ? '<p class="sm mut" style="text-align:center">Загружаем профиль…</p>' : s.st === 'err' ? `<p class="acc-err">${esc(s.err)}</p>` : s.st === 'none' ? '<p class="sm mut">Профиль не найден.</p>' : `
    <div class="fp-stats"><div><strong>${p.tro | 0}</strong><small>КУБКИ</small></div><div><strong>${p.best | 0}</strong><small>РЕКОРД</small></div><div><strong>${p.lvl | 0 || 1}</strong><small>УРОВЕНЬ</small></div>
      <div><strong>${n}</strong><small>МАТЧЕЙ</small></div><div><strong>${n ? Math.round((p.w | 0) / n * 100) : 0}%</strong><small>ПОБЕДЫ</small></div><div><strong>${pub ? colPct(pub.col | 0, pub.colT | 0) + '%' : '—'}</strong><small>КОЛЛЕКЦИЯ</small></div></div>
    ${pub ? `<div class="fp-col"><div><span>Коллекция</span><b>${pub.col | 0} из ${pub.colT | 0} карточек</b></div><i><b style="width:${colPct(pub.col | 0, pub.colT | 0)}%"></b></i></div>
      <div class="fp-sq"><h4>Боевая пятёрка</h4><div class="fp-cards">${sq}</div></div>` : '<p class="sm mut">Коллекция и состав появятся, когда друг зайдёт в игру с новой версией.</p>'}
    <div class="fp-vs"><span>Личный счёт с вами</span><b>${rec ? rec.w + ':' + rec.l : '0:0'}</b></div>`;
  return `<div class="in lg-page acc-page fp-page"><div class="lg-top"><div><small class="eyebrow">Профиль друга</small><b>${esc(nick)}</b></div>${xBtn}</div>
    <div class="fp-head" style="--lc:${LCOL[lg]}">${avaH(p.ava, 'xl', LCOL[lg])}<div><h2>${esc(nick)}</h2><span class="fp-lg">${rankH(lg)}<b>${LEAGUES[lg][0]}</b></span>${netStH(id)}</div></div>
    ${body}
    ${isFr ? `<div class="fp-act"><button class="btn pri" data-act="frCall" data-v="${id}" ${can ? '' : 'disabled'}>${can ? 'Вызвать на матч' : on ? 'Сейчас занят' : 'Не в сети'}</button>
      <button class="btn dan-o" data-act="frDelAsk" data-v="${id}">Удалить из друзей</button></div>` : ''}</div>`;
}
function frDelH() {
  const id = sheet.id, nick = frNick(id), x = FR.nick[id];
  return `<div class="in st-pop net-pop fr-del">${popX}${avaH(x && x.ava, 'lg', x ? LCOL[leagueOf(x.tro | 0)] : '')}<h2>Удалить из друзей?</h2>
    <p class="acc-sub"><b>${esc(nick)}</b> пропадёт из вашего списка друзей, а вы — из его. Личный счёт сохранится. Снова добавить можно в любой момент по нику.</p>
    ${sheet.err ? `<p class="acc-err">${esc(sheet.err)}</p>` : ''}
    <div class="net-btns"><button class="btn dan acc-go" data-act="frDelYes" data-v="${id}" ${sheet.busy ? 'disabled' : ''}>${sheet.busy ? 'Удаляем…' : 'Удалить'}</button><button class="btn acc-go" data-act="frBack" data-v="${id}">Отмена</button></div></div>`;
}

/* ---------- Выбор аватарки ---------- */
function avaPickH() {
  const cur = sheet.sel == null ? myAva() : sheet.sel, lg = leagueOf(G.tro);
  return `<div class="in lg-page acc-page ap-page"><div class="lg-top"><div><small class="eyebrow">Профиль</small><b>Аватар</b></div>${xBtn}</div>
    <div class="ap-prev">${avaH(cur, 'xl', LCOL[lg])}<div><b>${esc(AU ? AU.nick : 'Гость')}</b><span>«${avaOf(cur)[2]}» · обводка — цвет вашей лиги</span></div></div>
    <div class="ap-grid">${AVA.map((a, i) => `<button class="ap-i ${i === cur ? 'on' : ''}" data-act="avaSel" data-v="${i}" aria-label="${a[2]}" aria-pressed="${i === cur}">${avaH(i, 'md')}<small>${a[2]}</small></button>`).join('')}</div>
    ${AU ? '<p class="sm mut">Аватар видят друзья в списке и в вашем профиле.</p>' : '<p class="sm mut">Аватар сохранится на этом устройстве. Чтобы его видели друзья, войдите в аккаунт.</p>'}
    <button class="btn pri acc-go" data-act="avaSave">Сохранить</button></div>`;
}
function pfSheetH() { const t = sheet.t; return t === 'frP' ? frPH() : t === 'frDel' ? frDelH() : t === 'avaPick' ? avaPickH() : ''; }

/* ---------- Шапка профиля ---------- */
function pfHeroH() {
  const lg = leagueOf(G.tro), n = G.w + G.l, xpPct = clamp(Math.round(G.xp / Math.max(1, 100 * G.lvl) * 100), 0, 100), col = Object.keys(G.cards).length, cp = colPct(col, ALL.length);
  return `<section class="pf-hero" style="--lc:${LCOL[lg]}"><div class="pf-hero__bg" aria-hidden="true"></div>
    <div class="pf-hero__top"><span>PLAYER PROFILE</span><button class="pf-edit" data-act="avaOpen" aria-label="Сменить аватар"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>Изменить</button></div>
    <div class="pf-id"><span class="pf-ava">${avaH(myAva(), 'xl', LCOL[lg])}</span>
      <div class="pf-name"><h2>${esc(AU ? AU.nick : 'Гость')}</h2><button class="pf-lg" data-act="lvlInfo">${rankH(lg)}<b>${LEAGUES[lg][0]}</b><span>· уровень ${G.lvl} ›</span></button>
        ${AU ? '' : '<button class="pf-guest" data-act="authOpen">Войти, чтобы сохранить ник и прогресс ›</button>'}</div></div>
    <div class="pf-xp"><div><span>Опыт уровня ${G.lvl}</span><b>${G.xp} / ${100 * G.lvl}</b></div><i><b style="width:${xpPct}%"></b></i></div>
    <div class="pf-stats"><div><strong>${G.tro}</strong><small>КУБКИ</small></div><div><strong>${G.best}</strong><small>РЕКОРД</small></div><div><strong>${n ? Math.round(G.w / n * 100) : 0}%</strong><small>ПОБЕДЫ</small></div><div><strong>${cp}%</strong><small>КОЛЛЕКЦИЯ</small></div></div>
  </section>`;
}

Object.assign(ACT, {
  avaOpen() { sheet = { t: 'avaPick', sel: myAva() }; },
  avaSel(v) { if (sheet && sheet.t === 'avaPick') sheet.sel = clamp(+v | 0, 0, AVA.length - 1); },
  avaSave() { if (sheet && sheet.t === 'avaPick') { G.ava = sheet.sel | 0; sheet = null; sfx('tap'); } },
  frOpen() { if (!AU) { sheet = { t: 'auth', mode: 'in' }; return; } sheet = null; tab = 'prof'; frLoad(); setTimeout(() => { const e = document.getElementById('pf-friends'); if (e) e.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); },
  frAdd() { if (FRF.busy) return false; frFormKeep(); FRF.busy = true; FRF.msg = ''; frAdd(FRF.nick); },
  frView(v) { if (!AU) return; sheet = { t: 'frP', id: v, st: 'load' }; frViewLoad(v); },
  frDelAsk(v) { sheet = { t: 'frDel', id: v }; },
  frBack(v) { sheet = { t: 'frP', id: v, st: 'load' }; frViewLoad(v); },
  frDelYes(v) { if (!sheet || sheet.t !== 'frDel' || sheet.busy) return false; const s = sheet; s.busy = true; s.err = '';
    frDel(v).then(() => { if (sheet === s) sheet = null; FRF.msg = frNick(v) + ' удалён из друзей.'; FRF.ok = true; render(); }).catch(e => { if (sheet === s) { s.busy = false; s.err = sbErr(e); render(); } }); },
  frNo(v) { frFormKeep(); frDel(v).catch(e => { FRF.msg = sbErr(e); FRF.ok = false; profUi(); }); return false; },
  frOk(v) { frFormKeep(); frAccept(v).catch(e => { FRF.msg = sbErr(e); FRF.ok = false; profUi(); }); return false; }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target && e.target.id === 'fr-nick' && !sheet) { e.preventDefault(); if (ACT.frAdd() !== false) render(); } });
