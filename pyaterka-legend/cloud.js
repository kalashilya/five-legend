/* ---------- Аккаунт и облачное сохранение (Supabase) ----------
   Вход по нику и паролю (почта не нужна). Прогресс по-прежнему пишется в браузер (localStorage) —
   игра работает и без интернета; если игрок вошёл, копия уходит на сервер через несколько секунд после изменения.
   При входе на другом устройстве берётся более свежая версия; если на устройстве уже есть свой прогресс — спрашиваем.
   Ключ публичный (publishable): доступ к чужим данным закрыт правилами RLS в базе (docs/supabase-schema.sql). */
const SB = { url: 'https://wsilqaopfvookrekockh.supabase.co', key: 'sb_publishable_gl9HJNpAHj73JX7EUr3p5Q_esEOzWWO', mail: '@players.five-legend-cs.netlify.app' };
const AKEY = KEY + '-auth', TKEY = KEY + '-at', PKEY = KEY + '-prev';
let LEAD_EXT = true, AU = null, CS = { st: 'off', msg: '', at: 0 }, csTimer = 0, auRef = null, TOP = null;
/* владелец игры: только ему видна общая таблица всех игроков (на сервере то же правило — docs/supabase-private.sql) */
const ADMIN_UID = '33a107e3-b72d-4111-b0dc-60835d86ac2c', isAdmin = () => !!AU && AU.uid === ADMIN_UID;
const nickOk = n => /^[A-Za-z0-9_]{3,16}$/.test(n);
const nickMail = n => n.toLowerCase() + SB.mail;
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* хранилище недоступно */ } };
const hm = t => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
/* понятные сообщения вместо ответов сервера */
function sbErr(e) {
  const m = String(e && e.message || e || '');
  if (/fetch|network|load failed|abort/i.test(m)) return 'Нет связи с сервером. Проверьте интернет.';
  if (/already registered|already exists|user_already_exists/i.test(m)) return 'Такой ник уже занят. Войдите или выберите другой.';
  if (/invalid login|invalid_credentials|invalid grant/i.test(m)) return 'Неверный ник или пароль.';
  if (/password/i.test(m) && /(6|characters|short|weak)/i.test(m)) return 'Пароль слишком короткий: нужно хотя бы 6 символов.';
  if (/rate|too many|429/i.test(m)) return 'Слишком много попыток. Подождите минуту.';
  if (/signups? (are|is) disabled|signup_disabled|email_provider_disabled|provider.*disabled/i.test(m)) return 'На сервере выключена регистрация по почте. Владельцу игры: Supabase → Authentication → Sign In / Providers → Email — включить «Enable Email provider» и «Allow new users to sign up», выключить только «Confirm email».';
  if (/confirm/i.test(m)) return 'На сервере включено подтверждение почты — вход по нику не сработает. Нужно выключить «Confirm email» в Supabase.';
  if (/relation|does not exist|42P01/i.test(m)) return 'На сервере не созданы таблицы игры (нужно запустить docs/supabase-schema.sql).';
  return 'Ошибка сервера: ' + m.slice(0, 120);
}
async function sbFetch(path, opt, auth) {
  opt = opt || {}; const h = Object.assign({ apikey: SB.key, 'Content-Type': 'application/json' }, opt.headers || {});
  if (auth) { await auRefresh(); if (!AU) throw new Error('not signed in'); h.Authorization = 'Bearer ' + AU.at; }
  const r = await fetch(SB.url + path, Object.assign({}, opt, { headers: h }));
  const txt = await r.text(); let j = null; try { j = txt ? JSON.parse(txt) : null; } catch (e) { /* пустой ответ */ }
  if (!r.ok) throw new Error((j && (j.msg || j.message || j.error_description || j.error_code || j.error)) || 'HTTP ' + r.status);
  return j;
}
/* ---------- сессия ---------- */
function auSet(j) {
  if (!j || !j.access_token) return false; const u = j.user || {};
  AU = { at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, uid: u.id, nick: (u.user_metadata && u.user_metadata.nick) || (u.email || '').split('@')[0] };
  lsSet(AKEY, JSON.stringify(AU)); return true;
}
function auLoad() { try { const a = JSON.parse(lsGet(AKEY)); if (a && a.rt && a.uid) AU = a; } catch (e) { AU = null; } }
async function auRefresh() {
  if (!AU || AU.exp - 60000 > Date.now()) return;
  if (!auRef) auRef = (async () => { try { const j = await sbFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: AU.rt }) }); auSet(j); }
    catch (e) { if (!/fetch|network|load failed/i.test(String(e.message))) { AU = null; lsSet(AKEY, null); } throw e; } finally { auRef = null; } })();
  return auRef;
}
/* ---------- облако: чтение и запись ---------- */
async function cloudPull() { const r = await sbFetch(`/rest/v1/saves?select=data,updated_at&id=eq.${AU.uid}`, { method: 'GET' }, true); return r && r[0] ? r[0] : null; }
async function cloudPush() {
  if (!AU || !G) return; clearTimeout(csTimer); const at = new Date().toISOString();
  CS.st = 'busy';
  try {
    await sbFetch('/rest/v1/saves', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: AU.uid, data: G, updated_at: at }) }, true);
    const lead = { id: AU.uid, nick: AU.nick, tro: G.tro | 0, best: G.best | 0, lvl: Math.max(1, G.lvl | 0), w: G.w | 0, l: G.l | 0, updated_at: at }, put = b => sbFetch('/rest/v1/leaders', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(b) }, true);
    /* аватар и то, что видят друзья (коллекция, состав); если на сервере ещё нет этих колонок — без них */
    if (LEAD_EXT) { try { await put(Object.assign({ ava: G.ava | 0, pub: pubOf(G) }, lead)); } catch (e) { if (!/column|ava|pub|42703|PGRST204/i.test(String(e.message))) throw e; LEAD_EXT = false; await put(lead); } } else await put(lead);
    CS = { st: 'ok', msg: 'Сохранено в аккаунте в ' + hm(Date.now()), at: Date.now() }; lsSet(TKEY + '-sync', String(Date.now()));
  } catch (e) { CS = { st: 'err', msg: sbErr(e), at: Date.now() }; csTimer = setTimeout(cloudPush, 30000); }
  csDraw();
}
/* вызывается из save(): отметка времени изменения и отложенная отправка */
function cloudQueue() { lsSet(TKEY, String(Date.now())); if (!AU) return; clearTimeout(csTimer); CS.st = 'wait'; csTimer = setTimeout(cloudPush, 4000); }
/* статус на экране профиля обновляем без полной перерисовки */
function csDraw() { const e = document.getElementById('cs-st'); if (e) { e.textContent = CS.msg || ''; e.className = 'acc-st ' + CS.st; } }
const progOf = g => g ? { tro: g.tro | 0, lvl: g.lvl | 0, cards: Object.values(g.cards || {}).reduce((s, o) => s + (o.n | 0), 0), coins: g.coins | 0, m: (g.w | 0) + (g.l | 0) } : null;
const isFresh = g => { const p = progOf(g); return !p || (p.m === 0 && p.tro === 0 && p.lvl <= 1); };
/* сверка после входа или при запуске: кто свежее — облако или устройство */
async function cloudSync(ask) {
  if (!AU) return; let row = null;
  try { row = await cloudPull(); } catch (e) { CS = { st: 'err', msg: sbErr(e), at: Date.now() }; csDraw(); return; }
  if (!row) { await cloudPush(); return; }
  let cg = null; try { cg = migrate(row.data, now()); } catch (e) { cg = null; }
  if (!cg) { CS = { st: 'err', msg: 'Сохранение в аккаунте повреждено — оставлено сохранение с устройства.', at: Date.now() }; await cloudPush(); return; }
  const tC = Date.parse(row.updated_at) || 0, tL = +lsGet(TKEY) || 0, tS = +lsGet(TKEY + '-sync') || 0;
  const same = JSON.stringify(progOf(cg)) === JSON.stringify(progOf(G));
  if (same) { CS = { st: 'ok', msg: 'Прогресс совпадает с аккаунтом', at: Date.now() }; if (tL > tC) await cloudPush(); else csDraw(); return; }
  if (isFresh(G)) { useCloud(cg); return; }
  /* устройство менялось после последней отправки, а облако — тоже: спрашиваем; иначе берём свежее */
  if (ask || (tL > tS + 1000 && tC > tS + 1000)) { sheet = { t: 'sync', cg }; render(); return; }
  if (tC > tL) useCloud(cg); else await cloudPush();
}
function useCloud(cg) {
  if (OV) return; /* во время матча не подменяем */
  lsSet(PKEY, JSON.stringify(G)); G = cg; refresh(G, now()); try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) { /* хранилище недоступно */ }
  lsSet(TKEY, String(Date.now())); lsSet(TKEY + '-sync', String(Date.now()));
  CS = { st: 'ok', msg: 'Загружен прогресс из аккаунта', at: Date.now() }; render();
}
/* ---------- вход, регистрация, выход ---------- */
async function authGo(mode, nick, pass) {
  nick = String(nick || '').trim(); pass = String(pass || '');
  if (!nickOk(nick)) return 'Ник: от 3 до 16 символов, латинские буквы, цифры и «_».';
  if (pass.length < 6) return 'Пароль: хотя бы 6 символов.';
  try {
    const j = mode === 'up' ? await sbFetch('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: nickMail(nick), password: pass, data: { nick } }) })
      : await sbFetch('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: nickMail(nick), password: pass }) });
    if (!auSet(j)) return sbErr('confirm');
    if (mode === 'up' && AU && !AU.nick) AU.nick = nick;
  } catch (e) { return sbErr(e); }
  sheet = null; await cloudSync(mode === 'in' && !isFresh(G)); netBoot(); render(); return '';
}
async function authOut() {
  try { if (AU) await sbFetch('/auth/v1/logout', { method: 'POST' }, true); } catch (e) { /* выходим и без ответа сервера */ }
  netStop(); AU = null; lsSet(AKEY, null); CS = { st: 'off', msg: '', at: 0 }; render();
}
async function topLoad() {
  TOP = { st: 'load', rows: [] }; render();
  try { const r = await sbFetch('/rest/v1/leaders?select=id,nick,tro,lvl,w,l&order=tro.desc,lvl.desc&limit=500', { method: 'GET' }, true); TOP = { st: 'ok', rows: r || [] }; }
  catch (e) { TOP = { st: 'err', msg: sbErr(e), rows: [] }; }
  render();
}
/* ---------- экраны ---------- */
const xBtn = '<button class="lg-x" data-act="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>';
function accH() {
  if (AU) return `<section class="profile-account pn"><div class="profile-section-title"><small>ACCOUNT</small><h3>АККАУНТ</h3></div>
    <p class="sm">Вы вошли как <b>${esc(AU.nick)}</b>. Прогресс сохраняется в аккаунте — можно играть с любого устройства.</p>
    <p class="acc-st ${CS.st}" id="cs-st">${esc(CS.msg || '')}</p>
    <div class="rowb">${isAdmin() ? '<button class="btn s" data-act="topOpen">Все игроки · только для вас</button>' : ''}<button class="btn s" data-act="syncNow">Сохранить сейчас</button><button class="btn s" data-act="authOut">Выйти</button></div></section>`;
  return `<section class="profile-account pn"><div class="profile-section-title"><small>ACCOUNT</small><h3>АККАУНТ</h3></div>
    <p class="sm">Сейчас прогресс хранится только на этом устройстве. Войдите или создайте аккаунт — тогда карточки, монеты и кубки не потеряются и будут доступны с любого телефона.</p>
    <div class="rowb"><button class="btn pri" data-act="authOpen">Войти или создать аккаунт</button></div></section>`;
}
/* окно входа при каждом открытии игры, пока игрок не вошёл (один раз за запуск) */
let authAsked = false;
const authAskDue = () => !authAsked;
function authH() {
  const s = sheet;
  if (s.pop) return `<div class="in st-pop acc-pop">${xBtn.replace('class="lg-x"', 'class="lg-x st-x0"')}
    <svg class="acc-logo" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="acc-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe7a8"/><stop offset="1" stop-color="#c9902a"/></linearGradient></defs><path d="M50 6 88 20v28c0 22-16 37-38 46C28 85 12 70 12 48V20z" fill="#0d1520" stroke="url(#acc-g)" stroke-width="4"/><text x="50" y="64" text-anchor="middle" font-size="46" font-weight="700" fill="url(#acc-g)" font-family="Oswald, Impact, sans-serif">5</text></svg>
    <h2>${s.mode === 'up' ? 'Создай аккаунт' : 'Вход в аккаунт'}</h2>
    <p class="acc-sub">Карточки, монеты и кубки сохранятся на сервере — можно играть с любого телефона и попасть в рейтинг игроков.</p>
    ${segH('authMode', s.mode, [['up', 'Новый аккаунт'], ['in', 'Уже есть аккаунт']])}
    <label class="acc-f"><span>Ник в игре</span><input id="au-nick" type="text" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="16" value="${esc(s.nick || '')}" placeholder="латиница, цифры, _"></label>
    <label class="acc-f"><span>Пароль</span><input id="au-pass" type="password" autocomplete="${s.mode === 'up' ? 'new-password' : 'current-password'}" maxlength="72" value="${esc(s.pass || '')}" placeholder="не меньше 6 символов"></label>
    ${s.err ? `<p class="acc-err" role="alert">${esc(s.err)}</p>` : ''}
    <button class="btn pri acc-go" data-act="authGo" ${s.busy ? 'disabled' : ''}>${s.busy ? 'Подождите…' : s.mode === 'up' ? 'Создать аккаунт' : 'Войти'}</button>
    <button class="acc-skip" data-act="close">Играть без аккаунта</button></div>`;
  return `<div class="in lg-page acc-page"><div class="lg-top"><div><small class="eyebrow">Аккаунт</small><b>${s.mode === 'up' ? 'Создать аккаунт' : 'Вход'}</b></div>${xBtn}</div>
    ${segH('authMode', s.mode, [['in', 'Вход'], ['up', 'Новый аккаунт']])}
    <label class="acc-f"><span>Ник в игре</span><input id="au-nick" type="text" inputmode="latin" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="16" value="${esc(s.nick || '')}" placeholder="например, s1mple_fan"></label>
    <label class="acc-f"><span>Пароль</span><input id="au-pass" type="password" autocomplete="${s.mode === 'up' ? 'new-password' : 'current-password'}" maxlength="72" value="${esc(s.pass || '')}" placeholder="не меньше 6 символов"></label>
    ${s.err ? `<p class="acc-err" role="alert">${esc(s.err)}</p>` : ''}
    <button class="btn pri acc-go" data-act="authGo" ${s.busy ? 'disabled' : ''}>${s.busy ? 'Подождите…' : s.mode === 'up' ? 'Создать аккаунт' : 'Войти'}</button>
    <p class="sm mut">${s.mode === 'up' ? 'Почта не нужна. Запомните пароль — восстановить его нельзя. Текущий прогресс с этого устройства перейдёт в новый аккаунт.' : 'Если в аккаунте уже есть прогресс, а на этом устройстве — другой, игра спросит, какой оставить.'}</p></div>`;
}
function syncH() {
  const a = progOf(sheet.cg), b = progOf(G), col = (t, p) => `<div class="lv-card"><small>${t}</small><b>${p.tro} 🏆</b><p>Уровень ${p.lvl} · ${p.cards} карточек · ${nf(p.coins)} монет · ${p.m} матчей</p></div>`;
  return `<div class="in lg-page acc-page"><div class="lg-top"><div><small class="eyebrow">Аккаунт ${esc(AU ? AU.nick : '')}</small><b>Какой прогресс оставить?</b></div></div>
    <p class="sm">В аккаунте и на этом устройстве разный прогресс. Выберите, какой оставить, — второй заменится. Копия заменённого сохранится в памяти браузера.</p>
    <div class="lv-two">${col('В АККАУНТЕ', a)}${col('НА ЭТОМ УСТРОЙСТВЕ', b)}</div>
    <div class="rowb"><button class="btn pri" data-act="syncCloud">Взять из аккаунта</button><button class="btn s" data-act="syncLocal">Оставить с устройства</button></div></div>`;
}
function topH() {
  if (!isAdmin()) return `<div class="in lg-page acc-page"><div class="lg-top"><div><small class="eyebrow">Онлайн</small><b>Все игроки</b></div>${xBtn}</div><p class="sm mut">Раздел доступен только владельцу игры.</p></div>`;
  const T = TOP || { st: 'load', rows: [] }, me = AU.uid, on = typeof onlineMap === 'function' ? onlineMap() : {};
  const m = T.rows.reduce((s, r) => s + (r.w | 0) + (r.l | 0), 0);
  const rows = T.rows.map((r, i) => `<div class="lb adm ${r.id === me ? 'me' : ''}"><b>${i + 1}</b><span class="adm-n"><span>${on[r.id] ? '<i class="adm-on" title="в игре"></i>' : ''}${esc(r.nick)}</span><small class="mut">ур. ${r.lvl} · ${r.w | 0}–${r.l | 0}</small></span><b>${r.tro}</b></div>`).join('');
  return `<div class="in lg-page acc-page"><div class="lg-top"><div><small class="eyebrow">Только для владельца</small><b>Все игроки</b></div>${xBtn}</div>
    ${T.st === 'ok' ? `<div class="adm-sum"><div><strong>${T.rows.length}</strong><small>ИГРОКОВ</small></div><div><strong>${Object.keys(on).length}</strong><small>СЕЙЧАС В ИГРЕ</small></div><div><strong>${m}</strong><small>МАТЧЕЙ</small></div></div>` : ''}
    ${T.st === 'load' ? '<p class="sm mut">Загружаем…</p>' : T.st === 'err' ? `<p class="acc-err">${esc(T.msg)}</p>` : T.rows.length ? `<div>${rows}</div>` : '<p class="sm mut">Пока никого нет.</p>'}
    <p class="sm mut">Сортировка по кубкам. Победы–поражения — за рейтинговые матчи. Этот список видите только вы.</p>
    <button class="btn s" data-act="topOpen">Обновить</button></div>`;
}
/* действия (подключаются в ACT в ui.js) */
const ACT_ACC = {
  authOpen() { sheet = { t: 'auth', mode: 'in' }; },
  authMode(v) { if (sheet && sheet.t === 'auth') { authKeep(); sheet.mode = v === 'up' ? 'up' : 'in'; sheet.err = ''; } },
  authGo() { if (!sheet || sheet.t !== 'auth' || sheet.busy) return false; authKeep(); sheet.busy = true; sheet.err = ''; const s = sheet;
    authGo(s.mode, s.nick, s.pass).then(err => { if (err && sheet === s) { s.busy = false; s.err = err; render(); } }); },
  authOut() { authOut(); return false; },
  syncNow() { cloudPush(); return false; },
  syncCloud() { const cg = sheet && sheet.cg; sheet = null; if (cg) useCloud(cg); },
  syncLocal() { sheet = null; cloudPush(); },
  topOpen() { if (!isAdmin()) return false; sheet = { t: 'top' }; topLoad(); return false; }
};
function authKeep() { const n = document.getElementById('au-nick'), p = document.getElementById('au-pass'); if (n) sheet.nick = n.value; if (p) sheet.pass = p.value; }
/* при запуске: восстановить сессию и сверить прогресс; при сворачивании — отправить без ожидания */
function cloudStart() {
  auLoad(); if (AU) { CS = { st: 'wait', msg: 'Проверяем сохранение в аккаунте…', at: 0 }; cloudSync(false); }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && AU && CS.st === 'wait') cloudPush(); });
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && sheet && sheet.t === 'auth' && (e.target.id === 'au-nick' || e.target.id === 'au-pass')) { e.preventDefault(); if (ACT_ACC.authGo() !== false) render(); } });
}
Object.assign(ACT, ACT_ACC);
