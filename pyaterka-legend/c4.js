/* ===== Взлом бомбы C4: вход на странице кейсов и экран бомбы на весь экран =====
   Своя рисованная бомба (брикеты, лента, провода, пульт с экраном и клавиатурой), без графики Valve.
   Логика попытки — c4Try в meta.js. Экран бомбы живёт в отдельном слое поверх игры и не пересоздаётся при render(). */
const C4_ICON = `<svg class="c4-ico" viewBox="0 0 64 48" aria-hidden="true"><rect x="3" y="6" width="58" height="11" rx="5" fill="#b08a55"/><rect x="3" y="18.5" width="58" height="11" rx="5" fill="#a07d4b"/><rect x="3" y="31" width="58" height="11" rx="5" fill="#b08a55"/><rect x="9" y="4" width="5" height="40" fill="#1c1e21"/><rect x="50" y="4" width="5" height="40" fill="#1c1e21"/><rect x="19" y="10" width="26" height="30" rx="3" fill="#2c3136" stroke="#0d0f11" stroke-width="1.5"/><rect x="22" y="13" width="20" height="7" rx="1" fill="#0c1f0e"/><path d="M24 16.5h16" stroke="#6dff7a" stroke-width="1.6" stroke-dasharray="2 1.4"/><g fill="#59616a"><rect x="22.5" y="23" width="5" height="4" rx="1"/><rect x="29.5" y="23" width="5" height="4" rx="1"/><rect x="36.5" y="23" width="5" height="4" rx="1"/><rect x="22.5" y="29" width="5" height="4" rx="1"/><rect x="29.5" y="29" width="5" height="4" rx="1"/><rect x="36.5" y="29" width="5" height="4" rx="1"/></g><circle cx="40" cy="36.5" r="1.8" fill="#ff3b30"/><path d="M45 14c8-6 14 2 15-6M45 34c9 4 12-6 16 0" fill="none" stroke="#d33" stroke-width="1.6"/></svg>`;
const c4Fmt = ms => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h + ':' + String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
/* подпись после попытки: сколько попыток осталось в этот час или когда следующая */
const c4After = () => { const n = c4TriesLeft(G, now()); return n ? 'Осталось попыток в этот час: ' + n + '.' : 'Следующая попытка через ' + c4Fmt(c4Left(G, now())) + '.'; };
function c4EntryH() {
  const left = c4Left(G, now());
  return `<div class="c4-entry"><button class="c4-btn ${left ? 'cool' : 'ready'}" type="button" data-act="c4open" aria-label="Попробуй взломать бомбу C4"><span class="c4-btxt"><b>Попробуй взломать</b><small id="c4-et">${left ? 'через ' + c4Fmt(left) : 'попыток: ' + c4TriesLeft(G, now())}</small></span>${C4_ICON}</button></div>`;
}
ACT.c4open = () => c4Open();

let C4 = null;   // { code: 'набранные цифры', busy, done }
const c4Beep = (f, d, type = 'square', v = .05, to = 0) => { if (snd !== 'off') tone(f, d, type, v, to); };
/* Вибрация: на Android — navigator.vibrate; на iPhone Safari её нет, поэтому щёлкаем скрытый системный переключатель
   (<input type=checkbox switch>, iOS 17.4+): iOS сам даёт короткий тактильный отклик. Узор [вибр, пауза, …] — тик на каждую вибрацию.
   На новых iOS Apple может это отключить — тогда просто без вибрации. */
let c4Hap = null;
const c4Tick = () => { try { if (!c4Hap) { const l = document.createElement('label'), i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', ''); l.appendChild(i); l.setAttribute('aria-hidden', 'true'); l.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none'; document.body.appendChild(l); c4Hap = l; } c4Hap.click(); } catch (e) { /* нет отклика */ } };
const c4Buzz = p => { try {
  if (navigator.vibrate && navigator.vibrate(p)) return;
  const a = Array.isArray(p) ? p : [p]; let t = 0; a.forEach((d, i) => { if (i % 2 === 0) setTimeout(c4Tick, t); t += d; });
} catch (e) { /* вибрации нет */ } };
const C4_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
function c4Open() {
  if (document.getElementById('c4')) return;
  C4 = { code: '', busy: false, done: false };
  const el = document.createElement('div'); el.id = 'c4'; el.className = 'c4-ov'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Взлом бомбы C4');
  el.innerHTML = `<button class="c4-x" type="button" data-c4="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
  <div class="c4-head"><small>Попробуй взломать</small><b>C4</b></div>
  <div class="c4-bomb" id="c4-bomb">
    <div class="c4-bricks"><i></i><i></i><i></i><span class="c4-tape t1"></span><span class="c4-tape t2"></span></div>
    <svg class="c4-wires" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true"><path d="M70 40C20 10 10 120 60 150" stroke="#c62828"/><path d="M330 60c50-20 70 90 15 110" stroke="#f2c14e"/><path d="M85 260c-40 20-70-40-30-70" stroke="#2f7de1"/><path d="M320 250c40 20 60-50 20-70" stroke="#c62828"/></svg>
    <div class="c4-dev">
      <i class="c4-screw s1"></i><i class="c4-screw s2"></i><i class="c4-screw s3"></i><i class="c4-screw s4"></i>
      <div class="c4-top"><span class="c4-led" id="c4-led"></span><span class="c4-lbl">ARM · 6</span></div>
      <div class="c4-lcd" id="c4-lcd" aria-live="polite"></div>
      <div class="c4-keys">${C4_KEYS.map(k => `<button type="button" class="c4-k ${k === 'ok' ? 'ok' : k === 'del' ? 'del' : ''}" data-c4="${k}" aria-label="${k === 'ok' ? 'Проверить код' : k === 'del' ? 'Стереть' : k}">${k === 'ok' ? 'OK' : k === 'del' ? '⌫' : k}</button>`).join('')}</div>
    </div>
  </div>
  <p class="c4-msg" id="c4-msg" role="status"></p>
  <p class="c4-sub" id="c4-sub"></p>
  <button class="c4-again" type="button" data-c4="again" id="c4-again">Ещё попытка</button>`;
  document.body.appendChild(el); document.documentElement.classList.add('c4-lock');
  el.addEventListener('click', c4Click);
  requestAnimationFrame(() => el.classList.add('on'));
  c4Draw(); sfx('tap');
}
/* после попытки: снова к вводу кода, если в этот час ещё есть попытки */
function c4Again() {
  const el = document.getElementById('c4'); if (!el || !C4 || C4.busy || c4Left(G, now()) > 0) return;
  C4.code = ''; C4.done = false; el.classList.remove('win', 'fail', 'again'); document.getElementById('c4-bomb').classList.remove('jolt');
  const msg = document.getElementById('c4-msg'); msg.textContent = ''; msg.className = 'c4-msg'; c4Draw(); c4Beep(900, .06); c4Buzz(15);
}
const c4AgainShow = () => { const el = document.getElementById('c4'); if (el) el.classList.toggle('again', c4TriesLeft(G, now()) > 0); };
function c4Close() {
  const el = document.getElementById('c4'); if (!el || (C4 && C4.busy)) return;
  el.classList.remove('on'); document.documentElement.classList.remove('c4-lock'); C4 = null;
  setTimeout(() => el.remove(), 220); render();
}
/* экран, подпись и доступность клавиш по текущему состоянию */
function c4Draw(lcd) {
  const L = document.getElementById('c4-lcd'), sub = document.getElementById('c4-sub'), el = document.getElementById('c4'); if (!L || !C4) return;
  const left = c4Left(G, now()), cool = left > 0 && !C4.busy && !C4.done;
  el.classList.toggle('cool', cool);
  if (lcd != null) L.innerHTML = lcd;
  else if (cool) L.innerHTML = `<span class="c4-w">ЖДИТЕ</span>`;
  else L.innerHTML = [0, 1, 2, 3, 4, 5].map(i => `<span class="c4-d ${C4.code[i] ? 'on' : ''}">${C4.code[i] || '_'}</span>`).join('');
  if (C4.done) return;
  sub.textContent = cool ? 'Следующая попытка через ' + c4Fmt(left) : 'Набери 6 цифр и нажми OK. ' + C4_PER + ' попытки в час, осталось: ' + c4TriesLeft(G, now()) + '.';
}
function c4Click(e) {
  const b = e.target.closest('[data-c4]'); if (!b || !C4) return;
  const k = b.dataset.c4;
  if (k === 'close') return c4Close();
  if (k === 'again') return c4Again();
  if (C4.busy || C4.done || c4Left(G, now()) > 0) return;
  b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
  const msg = document.getElementById('c4-msg'); if (msg.textContent && !C4.busy) { msg.textContent = ''; msg.className = 'c4-msg'; }
  if (k === 'del') { C4.code = C4.code.slice(0, -1); c4Beep(500, .05); c4Buzz(10); }
  else if (k === 'ok') return c4Check();
  else if (C4.code.length < 6) { C4.code += k; c4Beep(1150 + (+k) * 18, .05); c4Buzz(12); }
  else { c4Beep(240, .08); c4Buzz([20, 40, 20]); }
  c4Draw();
}
/* проверка: «тру-ту, тун-тун-тун, ту-ру, тун» — экран перебирает цифры, лампа мигает, бомба дрожит */
function c4Check() {
  const msg = document.getElementById('c4-msg');
  if (C4.code.length !== 6) { msg.textContent = 'Нужно набрать 6 цифр'; msg.className = 'c4-msg warn'; c4Beep(240, .1); c4Buzz([30, 40, 30]); return; }
  C4.busy = true; const bomb = document.getElementById('c4-bomb'), led = document.getElementById('c4-led'), el = document.getElementById('c4');
  el.classList.add('busy'); bomb.classList.add('shake');
  const seq = [[0, 1250, .08], [110, 930, .1], [380, 720, .12], [640, 720, .12], [900, 720, .12], [1250, 1250, .07], [1340, 930, .09], [1650, 620, .26]];
  seq.forEach(([t, f, d]) => setTimeout(() => { if (!C4) return; c4Beep(f, d, 'square', .055); led.classList.remove('blink'); void led.offsetWidth; led.classList.add('blink'); }, t));
  c4Buzz([60, 50, 70, 190, 90, 170, 90, 170, 90, 260, 50, 40, 60, 240, 220]);
  const scr = setInterval(() => { if (!C4) return clearInterval(scr); c4Draw(C4.code.split('').map(() => `<span class="c4-d on">${Math.floor(Math.random() * 10)}</span>`).join('')); }, 70);
  setTimeout(() => {
    clearInterval(scr); if (!C4) return;
    const r = c4Try(G, C4.code, now()); C4.busy = false; el.classList.remove('busy'); bomb.classList.remove('shake'); save();
    const sub = document.getElementById('c4-sub');
    if (r.ok) {
      C4.done = true; el.classList.add('win'); c4Draw(`<span class="c4-w ok">ВЗЛОМАНО</span>`);
      msg.innerHTML = 'Код подошёл! Награда: ' + esc(r.text); msg.className = 'c4-msg ok'; sub.textContent = 'Награда уже у вас. ' + c4After();
      sfx('found'); c4Buzz([80, 60, 80, 60, 260]); c4AgainShow();
    } else if (r.used) {
      msg.textContent = r.why; msg.className = 'c4-msg warn'; C4.code = ''; c4Draw(); c4Beep(400, .2, 'triangle', .06);
    } else {
      C4.done = true; el.classList.add('fail'); bomb.classList.add('jolt'); c4Draw(`<span class="c4-w bad">ОШИБКА</span>`);
      msg.textContent = r.why; msg.className = 'c4-msg bad'; sub.textContent = r.wait ? 'Следующая попытка через ' + c4Fmt(r.wait) : c4After();
      c4Beep(180, .45, 'sawtooth', .07, 70); c4Buzz([300, 80, 300]); c4AgainShow();
    }
  }, 2050);
}
document.addEventListener('keydown', e => {
  if (!C4) return;
  if (e.key === 'Escape') { e.preventDefault(); return c4Close(); }
  const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : e.key === 'Enter' ? 'ok' : null;
  if (!k) return; e.preventDefault(); const b = document.querySelector(`#c4 [data-c4="${k}"]`); if (b) b.click();
});
/* отсчёт до следующей попытки: на кнопке страницы кейсов и на экране бомбы */
setInterval(() => {
  const e = document.getElementById('c4-et'); if (e && G) { const left = c4Left(G, now()); e.textContent = left ? 'через ' + c4Fmt(left) : 'попыток: ' + c4TriesLeft(G, now()); e.parentNode.parentNode.classList.toggle('cool', !!left); e.parentNode.parentNode.classList.toggle('ready', !left); }
  if (C4 && !C4.busy && !C4.done) c4Draw();
}, 1000);
