/* ---------- Установка как приложение ----------
   Android (Chrome, Яндекс, Samsung): системное окно «Установить приложение» по одной кнопке.
   iPhone: Apple не даёт сайтам ставить себя сами — показываем короткую подсказку с тремя шагами.
   Уже установлено (открыто с иконки) — плашку не показываем. */
let INST = null;
if (/(^|\.)netlify\.app$/.test(location.hostname)) document.documentElement.classList.add('nb');
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(navigator.userAgent);
const instHidden = () => +(lsGet(KEY + '-inst-no') || 0) > Date.now();
const canInstall = () => !isStandalone() && /^https:$/.test(location.protocol) && !instHidden() && (!!INST || isIOS() || isAndroid());
function installStart() {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { /* без офлайна */ });
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); INST = e; if (!OV && !sheet) render(); });
  addEventListener('appinstalled', () => { INST = null; if (!OV) render(); });
}
const ICO_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 11v9h14v-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICO_ADD = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICO_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="19" r="1.8" fill="currentColor"/></svg>';
function instH() {
  if (!canInstall()) return '';
  return `<section class="home-inst"><span class="hi-ico" aria-hidden="true"></span><div><b>Установи игру</b><span>Как приложение: иконка и весь экран</span></div>
    <button class="btn pri s" data-act="install">Установить</button><button class="hi-x" data-act="instNo" aria-label="Скрыть">×</button></section>`;
}
function instSheetH() {
  const ios = isIOS(), step = (n, ic, t, s) => `<div class="in-step"><b>${n}</b><span class="in-ic">${ic}</span><div><p>${t}</p>${s ? `<small>${s}</small>` : ''}</div></div>`;
  const steps = ios ? step(1, ICO_SHARE, 'Нажмите «Поделиться»', 'квадрат со стрелкой вверх — внизу экрана в Safari') + step(2, ICO_ADD, 'Выберите «На экран „Домой“»', 'если не видно — прокрутите список вниз') + step(3, '<b class="in-ok">Добавить</b>', 'Нажмите «Добавить» справа вверху', 'иконка «Пятёрка» появится на экране')
    : step(1, ICO_MENU, 'Откройте меню браузера', 'три точки справа вверху') + step(2, ICO_ADD, 'Нажмите «Установить приложение»', 'или «Добавить на главный экран»') + step(3, '<b class="in-ok">Установить</b>', 'Подтвердите', 'иконка «Пятёрка» появится на экране');
  return `<div class="in st-pop inst-pop"><button class="lg-x st-x0" data-act="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
    <span class="hi-ico big" aria-hidden="true"></span><h2>Установить игру</h2><p class="acc-sub">${ios ? 'На iPhone это делается в три касания — так требует Apple.' : 'Это займёт пару секунд.'} Потом игра открывается с иконки на весь экран, без браузера.</p>
    <div class="in-steps">${steps}</div>${ios ? '<p class="sm mut" style="text-align:center;margin:0">Работает в Safari. В других браузерах на iPhone кнопка «Поделиться» — в меню.</p>' : ''}
    <button class="btn pri acc-go" data-act="close">Понятно</button></div>`;
}
Object.assign(ACT, {
  install() { if (INST) { const e = INST; INST = null; e.prompt(); e.userChoice.then(() => render()).catch(() => {}); return false; } sheet = { t: 'inst' }; },
  instNo() { lsSet(KEY + '-inst-no', String(Date.now() + 7 * 86400000)); }
});
