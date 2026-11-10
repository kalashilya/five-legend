/* ===== Интерфейс ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cash = n => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('ru-RU');
const bar = (v, cls = '') => `<span class="bar ${cls}"><i style="width:${clamp(v, 0, 100)}%"></i></span>`;
const eCls = e => e < 40 ? 'bad' : e < 60 ? 'warn' : 'good';
const RS = { awp: 'AWP', entry: 'ENT', sup: 'SUP', lurk: 'LRK', igl: 'IGL' };
const KEY = 'clutch-manager-v1';
let S, tab = 'club', sheet = null, MV = null, flash = null, askNew = false;

function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* без сохранения игра всё равно работает */ } }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1 && d.teams) { S = d; PID = S.pid; for (const t of S.teams) for (const p of t.players) NICKS.add(p.nick); return true; }
  } catch (e) { /* пустое или недоступное хранилище */ }
  return false;
}

const PLAN_D = { rush: 'Все бегут на точку без подготовки. Опережает ротации и наказывает игру на ретейк.', exec: 'Собираемся у точки и выходим под гранаты. Сильнее всего при хороших саппортах.', fake: 'Двое шумят на другой точке, затем команда бьёт в настоящую цель. Работает против быстрых ротаций.', def: 'Расходимся по карте, ищем размен и идём туда, где защитников меньше.' };
const SETUP_D = { standard: 'Двое на A, один в центре, двое на B. Без слабых мест и без сюрпризов.', stackA: 'Трое на A. Отлично, если угадали, плохо, если атака пошла на B.', stackB: 'Трое на B. Отлично, если угадали, плохо, если атака пошла на A.', aggro: 'Двое выходят в мид за ранним разменом. Риск ради информации и перевеса.', retake: 'По одному на точках, трое в запасе. Отдаём установку и отбиваем точку вместе.' };

/* ---------- Экраны ---------- */
function vTop() {
  const u = userTeam(S);
  const st = S.phase === 'league' ? 'тур ' + (S.week + 1) + ' из 11' : S.phase === 'semi' ? 'полуфиналы' : S.phase === 'final' ? 'финал' : 'межсезонье';
  return `<header class="top"><div><p class="eyebrow">Сезон ${S.season} · ${st}</p><button class="name" data-act="rename" aria-label="Переименовать клуб">${esc(u.name)}</button></div><div class="cash ${S.money < 0 ? 'neg' : ''}">${cash(S.money)}</div></header>`;
}
function analyst(opp) {
  const l = S.staff.analyst, t = opp.tend;
  if (!l) return 'Аналитика нет. Наймите его в разделе «Тренировки», чтобы видеть привычки соперника.';
  let s = `В атаке чаще идут на ${t.pA >= .5 ? 'A' : 'B'} (${Math.round(Math.max(t.pA, 1 - t.pA) * 100)}%).`;
  if (l >= 2) { const pl = Object.entries({ rush: t.rush, exec: t.exec, fake: t.fake, def: t.def }).sort((a, b) => b[1] - a[1])[0][0]; s += ` Любимый план: ${PLAN_N[pl].toLowerCase()}.`; }
  if (l >= 3) { const cs = Object.entries(t.ct).sort((a, b) => b[1] - a[1]); s += ` В защите: ${SETUP_N[cs[0][0]].toLowerCase()}, запасной вариант: ${SETUP_N[cs[1][0]].toLowerCase()}.`; }
  return s;
}
function vClub() {
  const u = userTeam(S), st = standings(S), pos = st.findIndex(t => t.user) + 1, five = fiveOf(u);
  const avgE = Math.round(five.reduce((s, p) => s + p.energy, 0) / 5), sal = u.players.reduce((s, p) => s + p.sal, 0), net = 14000 + S.fans * 40 - sal - 1500 * (S.staff.coach + S.staff.analyst);
  let main = '';
  if (flash) {
    main += `<section class="card"><p class="eyebrow">Итог матча</p><h2>${flash.won ? 'Победа' : 'Поражение'} ${flash.sa}:${flash.sb}</h2><p class="mut sm">Соперник: ${esc(flash.opp)}. За неделю: спонсоры ${cash(flash.fin.sponsor)}, призовые ${cash(flash.fin.prize)}, зарплаты и штаб −${cash(flash.fin.sal + flash.fin.staff)}. Итого ${flash.fin.net >= 0 ? '+' : ''}${cash(flash.fin.net)}.</p></section>`;
  }
  if (S.phase === 'end') {
    const x = S.summary;
    main += `<section class="card"><p class="eyebrow">Сезон ${x.season} завершён</p><h2>${x.title}</h2><p class="mut sm">В лиге ${x.w} побед и ${x.l} поражений, ${x.place}-е место. Чемпион: ${esc(x.champ)}.</p><p class="num" style="font-size:22px;font-weight:700">${cash(x.prize)} <span class="mut sm" style="font-family:var(--f-b);font-weight:400">призовых</span></p><button class="btn pri" data-act="nextSeason">Начать сезон ${x.season + 1}</button></section>`;
  } else {
    const nm = nextMatch(S);
    if (!nm) {
      const pairs = S.phase === 'semi' ? S.playoff.semis : [S.playoff.final];
      main += `<section class="card"><p class="eyebrow">${S.phase === 'semi' ? 'Полуфиналы' : 'Финал'} без вашей команды</p><h2>Плей-офф продолжается</h2><div>${pairs.map(([a, b]) => `<p class="res"><span>${esc(S.teams[a].name)}</span><span class="mut">против</span><span>${esc(S.teams[b].name)}</span></p>`).join('')}</div><p class="mut sm">Неделя пройдёт как обычно: тренировки, зарплаты и спонсорские выплаты.</p><button class="btn pri" data-act="simPO">Узнать результаты</button></section>`;
    } else {
      const su = teamStr(u), so = teamStr(nm.opp), w = v => (v - 45) / 45 * 100;
      main += `<section class="card"><p class="eyebrow">${nm.stage} · следующий матч</p>
      <div class="vs"><div><b>${esc(u.tag)}</b><small>${esc(u.name)}</small></div><span class="x">VS</span><div class="r"><b>${esc(nm.opp.tag)}</b><small>${esc(nm.opp.name)} · ${nm.opp.w}-${nm.opp.l}</small></div></div>
      <div class="plain"><div class="str"><span class="mut">Наша сила</span>${bar(w(su))}<b class="num">${su.toFixed(1)}</b></div><div class="str"><span class="mut">Соперник</span>${bar(w(so), 'bad')}<b class="num">${so.toFixed(1)}</b></div></div>
      <p class="sm"><b>Карта: ${nm.map.name}.</b> <span class="mut">${nm.map.note}. Формат: до 13 раундов.</span></p>
      <p class="sm mut">${analyst(nm.opp)}</p>
      <button class="btn pri" data-act="play">Играть матч</button></section>`;
    }
  }
  return vTop() + main + `
  <div class="stats"><div class="stat"><b>${pos}<span style="font-size:12px"> из 12</span></b><span>место · ${u.w}-${u.l}</span></div><div class="stat ${eCls(avgE)}"><b>${avgE}%</b><span>энергия основы</span></div><div class="stat ${net < 0 ? 'bad' : ''}"><b>${net >= 0 ? '+' : ''}${cash(net)}</b><span>неделя без призовых</span></div></div>
  <section class="plain"><h3>Лента клуба</h3><div class="card" style="padding:4px 16px"><ul class="news">${S.news.slice(0, 7).map(n => `<li><time>С${n.s} Н${n.w}</time><span>${esc(n.t)}</span></li>`).join('')}</ul></div></section>
  <section class="plain">${askNew ? `<p class="sm">Текущая карьера будет удалена. Начать заново?</p><div class="rowb"><button class="btn dan s" data-act="newYes">Да, начать заново</button><button class="btn s" data-act="newNo">Отмена</button></div>` : `<button class="btn s" data-act="newAsk">Новая карьера</button>`}</section>`;
}
function pRow(p, extra = '', cls = '') {
  return `<button class="prow ${cls}" data-act="player" data-id="${p.id}" data-mk="${cls === 'mk' ? 1 : ''}"><span class="role">${RS[p.role]}</span><span style="min-width:0"><span class="nick">${esc(p.nick)}</span><small>${esc(p.name)} · ${p.age} лет</small></span>${extra}<span class="o">${Math.round(ovr(p))}</span></button>`;
}
function vRoster() {
  const u = userTeam(S), five = fiveOf(u), bench = u.players.filter(p => !u.five.includes(p.id));
  const e = p => `<span>${bar(p.energy, eCls(p.energy))}<small class="num" style="text-align:right">${Math.round(p.energy)}%</small></span>`;
  return vTop() + `<section class="plain"><h3>Основа · сила ${teamStr(u).toFixed(1)}</h3><div class="list">${five.map(p => pRow(p, e(p))).join('')}</div></section>
  <section class="plain"><h3>Запас · ${bench.length}</h3>${bench.length ? `<div class="list">${bench.map(p => pRow(p, e(p))).join('')}</div>` : '<p class="mut sm">Запасных нет. Без замены усталость основы придётся снимать неделей отдыха.</p>'}</section>
  <p class="mut sm">Полоска показывает энергию. Ниже 40% игрок заметно хуже стреляет. Нажмите на игрока, чтобы увидеть навыки, поставить в основу или продать.</p>`;
}
function vTrain() {
  const t = S.training, c = S.staff.coach, a = S.staff.analyst;
  const F = { aim: 'Стрельба', util: 'Гранаты', pos: 'Позиции', team: 'Командная игра', rest: 'Отдых' }, I = { light: 'Лёгкая', normal: 'Обычная', hard: 'Тяжёлая' };
  const FD = { aim: 'Растут стрельба и реакция.', util: 'Растут гранаты: сильнее выходы на точку и ретейки.', pos: 'Растут позиция и клатч: игроки лучше держат углы.', team: 'Растёт командность: быстрее ротации и размены.', rest: 'Навыки не растут. Энергия +26, мораль +4.' };
  const ID = { light: 'Энергия −1 в неделю, рост ×0,6.', normal: 'Энергия −5 в неделю.', hard: 'Энергия −11 в неделю, рост ×1,5, мораль падает.' };
  const up = (k, lvl, cost, name, desc) => `<div class="card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>${name}</b><span class="num mut sm">уровень ${lvl} из 3</span></div><p class="mut sm">${desc}</p>${lvl < 3 ? `<button class="btn s" data-act="staff" data-v="${k}" ${S.money < cost ? 'disabled' : ''}>Улучшить за ${cash(cost)}</button>` : '<p class="sm">Максимальный уровень.</p>'}</div>`;
  return vTop() + `<section class="card"><h3>Упор на неделю</h3><div class="chips">${Object.keys(F).map(k => `<button class="chip" data-act="focus" data-v="${k}" aria-pressed="${t.focus === k}">${F[k]}</button>`).join('')}</div><p class="sm mut">${FD[t.focus]}</p>
  ${t.focus !== 'rest' ? `<h3>Нагрузка</h3><div class="chips">${Object.keys(I).map(k => `<button class="chip" data-act="intensity" data-v="${k}" aria-pressed="${t.intensity === k}">${I[k]}</button>`).join('')}</div><p class="sm mut">${ID[t.intensity]}</p>` : ''}
  <p class="sm mut">План применяется после каждого матча. Матч отнимает у основы 8 энергии, за неделю все восстанавливают 10. Быстрее всех растут игроки до 21 года с высоким потенциалом.</p></section>
  <section class="plain"><h3>Штаб</h3>${up('coach', c, 40000 * (c + 1), 'Тренер', 'Каждый уровень ускоряет рост навыков на 15%. Зарплата $1 500 в неделю за уровень.')}${up('analyst', a, 30000 * (a + 1), 'Аналитик', 'Перед матчем показывает привычки соперника: точку, план атаки, расстановку в защите.')}</section>`;
}
function vMarket() {
  const u = userTeam(S), list = [...S.market].sort((a, b) => ovr(b) - ovr(a));
  return vTop() + `<section class="plain"><h3>Свободные агенты · ${list.length}</h3><p class="mut sm">В составе ${u.players.length} из 8. Каждую неделю трое игроков на рынке меняются.</p><div class="list">${list.map(p => pRow(p, `<span class="price ${value(p) > S.money ? 'mut' : ''}">${cash(value(p))}</span>`, 'mk')).join('')}</div></section>`;
}
function vLeague() {
  const st = standings(S), po = S.playoff;
  const nm = id => esc(S.teams[id].name), me = (a, b) => (a === S.userId || b === S.userId) ? 'me' : '';
  let pf = '';
  if (po) {
    pf = `<section class="plain"><h3>Плей-офф</h3><div class="card" style="gap:4px">${po.semis.map(([a, b], i) => `<p class="res ${me(a, b)}"><span>${nm(a)}</span><span>${po.sres ? po.sres[i].join(':') : 'полуфинал'}</span><span>${nm(b)}</span></p>`).join('')}${po.final ? `<p class="res ${me(...po.final)}"><span>${nm(po.final[0])}</span><span>${po.fres ? po.fres.join(':') : 'финал'}</span><span>${nm(po.final[1])}</span></p>` : ''}</div></section>`;
  }
  return vTop() + pf + `<section class="plain"><h3>Таблица лиги</h3><div class="card" style="padding:6px 10px"><table><thead><tr><th>#</th><th>Команда</th><th>В</th><th>П</th><th>± раунды</th></tr></thead><tbody>${st.map((t, i) => `<tr class="${t.user ? 'me' : ''} ${i === 4 ? 'cut' : ''}"><td>${i + 1}</td><td>${esc(t.name)}</td><td>${t.w}</td><td>${t.l}</td><td>${t.rd > 0 ? '+' : ''}${t.rd}</td></tr>`).join('')}</tbody></table></div><p class="mut sm">Четыре лучшие команды выходят в плей-офф. Призовые: чемпион $200 000, финалист $110 000, полуфиналист $60 000.</p></section>
  ${S.lastResults.length ? `<section class="plain"><h3>Последний тур</h3><div class="card" style="gap:0">${S.lastResults.map(r => `<p class="res ${r.user ? 'me' : ''}"><span>${r.a}</span><span>${r.sa}:${r.sb}</span><span>${r.b}</span></p>`).join('')}</div></section>` : ''}`;
}
function vSheet() {
  if (!sheet) return '';
  const u = userTeam(S);
  if (sheet.t === 'name') return `<div class="in"><form class="wrap col" id="f-name"><h2>Название клуба</h2><label for="in-name">Полное название<input type="text" id="in-name" maxlength="22" value="${esc(u.name)}"></label><label for="in-tag">Тег, до 4 символов<input type="text" id="in-tag" maxlength="4" value="${esc(u.tag)}"></label><div class="rowb"><button class="btn pri" type="submit">Сохранить</button><button class="btn" type="button" data-act="close">Отмена</button></div></form></div>`;
  const mk = sheet.t === 'market', p = (mk ? S.market : u.players).find(x => x.id === sheet.id);
  if (!p) { sheet = null; return ''; }
  const o = ovr(p), gap = p.pot - o, pot = gap >= 8 ? 'высокий' : gap >= 3 ? 'средний' : 'раскрыт', v = value(p), st = u.five.includes(p.id);
  let act = '';
  if (mk) {
    const full = u.players.length >= 8, poor = S.money < v;
    act = `<button class="btn pri" data-act="buy" data-id="${p.id}" ${full || poor ? 'disabled' : ''}>Подписать за ${cash(v)}</button>${full ? '<p class="sm mut">В составе уже 8 игроков. Сначала продайте кого-нибудь.</p>' : poor ? '<p class="sm mut">Не хватает денег.</p>' : `<p class="sm mut">Зарплата ${cash(salary(p))} в неделю.</p>`}`;
  } else {
    if (!st) act += `<h3>Поставить в основу вместо</h3><div class="chips">${fiveOf(u).map(q => `<button class="chip" data-act="swap" data-id="${p.id}" data-v="${q.id}">${esc(q.nick)} · ${RS[q.role]}</button>`).join('')}</div>`;
    else act += '<p class="sm mut">Играет в основе. Чтобы заменить, откройте запасного игрока.</p>';
    act += `<button class="btn dan" data-act="sell" data-id="${p.id}" ${u.players.length <= 5 ? 'disabled' : ''}>Продать за ${cash(v * .6)}</button>${u.players.length <= 5 ? '<p class="sm mut">В команде должно остаться пять игроков.</p>' : ''}`;
  }
  return `<div class="in"><div class="wrap col"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><p class="eyebrow">${ROLES[p.role]} · ${p.age} лет</p><h2>${esc(p.nick)}</h2><p class="mut sm">${esc(p.name)}</p></div><div style="text-align:right"><div class="num" style="font-size:30px;font-weight:700;line-height:1">${Math.round(o)}</div><span class="mut sm">общий</span></div></div>
  <div class="plain">${Object.keys(ATTR).map(k => `<div class="attr"><span class="mut">${ATTR[k]}</span>${bar(p.a[k])}<b>${Math.round(p.a[k])}</b></div>`).join('')}</div>
  <div class="kv"><div class="stat"><b>${pot}</b><span>потенциал</span></div><div class="stat"><b>${cash(mk ? salary(p) : p.sal)}</b><span>зарплата в неделю</span></div>${mk ? '' : `<div class="stat ${eCls(p.energy)}"><b>${Math.round(p.energy)}%</b><span>энергия</span></div><div class="stat"><b>${Math.round(p.morale)}%</b><span>мораль</span></div><div class="stat"><b>${p.k}/${p.d}</b><span>убийства/смерти за сезон</span></div><div class="stat"><b>${p.form > 1.5 ? 'в ударе' : p.form < -1.5 ? 'спад' : 'ровная'}</b><span>форма</span></div>`}</div>
  ${act}<button class="btn" data-act="close">Закрыть</button></div></div>`;
}
function render() {
  if (!S) return;
  const T = { club: ['Клуб', vClub], roster: ['Состав', vRoster], train: ['Тренировки', vTrain], market: ['Рынок', vMarket], league: ['Турнир', vLeague] };
  $('#app').innerHTML = T[tab][1]();
  $('#tabs .wrap').innerHTML = Object.keys(T).map(k => `<button data-act="tab" data-v="${k}" ${tab === k ? 'aria-current="page"' : ''}>${T[k][0]}</button>`).join('');
  const sh = $('#sheet'); sh.innerHTML = vSheet(); sh.hidden = !sheet;
}

/* ---------- Матч ---------- */
function startMatchView() {
  const nm = nextMatch(S); if (!nm) return;
  const u = userTeam(S), m = new Match(nm.map, u, nm.opp, { tactics: S.tactics });
  MV = { mine: new Set(u.five), m, nm, speed: 1, paused: true, acc: 0, last: 0, phase: 'pre', pos: {}, hold: false, stopEach: false, feedN: -1, postAt: 0, col: null };
  const el = $('#match');
  el.innerHTML = `<div class="mv wrap">
  <div class="sb"><div class="tm"><b>${esc(u.tag)}</b><span class="side" id="mv-sa"></span></div><div class="sc"><span id="mv-a">0</span>:<span id="mv-b">0</span></div><div class="tm r"><b>${esc(nm.opp.tag)}</b><span class="side" id="mv-sb"></span></div></div>
  <div class="mvsub"><span id="mv-rn"></span><span class="num" id="mv-clock"></span></div>
  <div class="hist" id="mv-hist" aria-label="История раундов"></div>
  <div class="cvw"><canvas id="mv-cv" aria-label="Карта ${nm.map.name}, вид сверху"></canvas><div class="banner" id="mv-banner" hidden></div></div>
  <div class="feed" id="mv-feed"></div>
  <div class="ctl"><button class="btn pri" id="mv-main" data-act="mvMain"></button><div class="seg" role="group" aria-label="Скорость">${[1, 2, 4].map(s => `<button data-act="mvSpeed" data-v="${s}" aria-pressed="${s === 1}">${s}×</button>`).join('')}</div></div>
  <div class="pan" id="mv-pan"></div><div class="pan" id="mv-kd"></div></div>`;
  el.hidden = false; el.scrollTop = 0;
  mvSize(); mvHead(); mvPanel(); mvKD();
  $('#mv-feed').textContent = nm.stage + '. ' + nm.map.name + ': ' + nm.map.note.toLowerCase() + '. Выберите план и начинайте.';
  requestAnimationFrame(mvLoop);
}
function mvSize() {
  const cv = $('#mv-cv'); if (!cv) return;
  const w = cv.parentElement.clientWidth, hh = Math.round(w * .98), d = Math.min(window.devicePixelRatio || 1, 2);
  cv.style.height = hh + 'px'; cv.width = Math.round(w * d); cv.height = Math.round(hh * d);
  MV.w = w; MV.h = hh; MV.d = d;
  const cs = getComputedStyle(document.documentElement), g = k => cs.getPropertyValue(k).trim();
  MV.col = { panel: g('--panel'), panel2: g('--panel2'), line: g('--line'), lane: g('--lane'), fg: g('--fg'), mut: g('--mut'), T: g('--atk'), CT: g('--def'), bad: g('--bad'), accent: g('--accent') };
}
function mvHead() {
  const m = MV.m, a = m.a, b = m.b, SN = { T: 'Атака', CT: 'Защита' };
  $('#mv-a').textContent = a.score; $('#mv-b').textContent = b.score;
  const sa = $('#mv-sa'), sb = $('#mv-sb'); sa.textContent = SN[a.side]; sa.className = 'side ' + a.side; sb.textContent = SN[b.side]; sb.className = 'side ' + b.side;
  $('#mv-rn').textContent = m.over ? 'Матч окончен' : (m.ot ? 'Овертайм ' + m.ot + ' · ' : '') + 'Раунд ' + (MV.phase === 'live' ? m.rn : m.rn + 1);
  $('#mv-hist').innerHTML = m.log.map((l, i) => (i === 12 || (i >= 24 && (i - 24) % 3 === 0) ? '<i class="gap"></i>' : '') + `<i class="${l.side} ${l.win === 'a' ? 'me' : ''}" title="Раунд ${l.rn}"></i>`).join('');
  const mb = $('#mv-main');
  mb.textContent = MV.phase === 'pre' ? 'Начать раунд ' + (m.rn + 1) : MV.phase === 'done' ? 'Завершить матч' : MV.phase === 'post' ? 'Следующий раунд…' : MV.paused ? 'Продолжить' : 'Пауза';
  mb.disabled = MV.phase === 'post';
}
function mvPanel() {
  const m = MV.m, a = m.a, b = m.b, t = S.tactics, live = MV.phase === 'live', r = m.round, ch = (act, v, on, txt, dis) => `<button class="chip" data-act="${act}" data-v="${v}" aria-pressed="${on}" ${dis ? 'disabled' : ''}>${txt}</button>`;
  if (MV.phase === 'done') { $('#mv-pan').innerHTML = `<h2>${m.winner === a ? 'Победа' : 'Поражение'} ${a.score}:${b.score}</h2><p class="mut sm">Нажмите «Завершить матч», чтобы получить призовые и провести неделю тренировок.</p>`; return; }
  let h = `<div class="econ"><div><span class="mut">Вы · ${live ? BUY_N[a.buy] : 'банк'}</span><b>${cash(a.money)}</b></div><div style="text-align:right"><span class="mut">${esc(b.team.tag)} · ${live ? BUY_N[b.buy] : 'банк'}</span><b>${cash(b.money)}</b></div></div>`;
  if (a.side === 'T') {
    h += `<h3>План атаки</h3><div class="chips">${Object.keys(PLAN_N).map(k => ch('mvPlan', k, t.T.type === k, PLAN_N[k])).join('')}</div>`;
    if (t.T.type !== 'def') h += `<div class="chips">${['A', 'B'].map(k => ch('mvSite', k, t.T.site === k, (t.T.type === 'fake' ? 'Настоящая цель ' : 'Точка ') + k)).join('')}</div>`;
    h += `<p class="hint">${PLAN_D[t.T.type]}</p>`;
    if (live) h += `<button class="btn s" data-act="mvCmd" data-v="switch" ${r.switched || r.planted || r.over ? 'disabled' : ''}>Команда в раунде: сменить точку</button>`;
  } else {
    h += `<h3>Расстановка защиты</h3><div class="chips">${Object.keys(SETUP_N).map(k => ch('mvSetup', k, t.CT === k, SETUP_N[k])).join('')}</div><p class="hint">${SETUP_D[t.CT]}</p>`;
    if (live) h += `<div class="rowb">${['A', 'B'].map(k => `<button class="btn s" data-act="mvCmd" data-v="${k}" ${r.planted || r.over ? 'disabled' : ''}>Ротация на ${k}</button>`).join('')}</div>`;
  }
  h += `<h3>Закуп</h3><div class="chips">${[['auto', 'Авто'], ['eco', 'Эко'], ['force', 'Форс'], ['full', 'Полный']].map(([k, n]) => ch('mvBuy', k, t.buy === k, n)).join('')}</div>`;
  if (live) h += '<p class="hint">План и закуп меняются со следующего раунда. Команды в раунде действуют сразу.</p>';
  h += `<div class="rowb"><button class="btn s" data-act="mvTO" ${live || a.to <= 0 ? 'disabled' : ''}>Тайм-аут · осталось ${a.to}</button><button class="btn s" data-act="mvRound">Раунд сразу</button><button class="btn s" data-act="mvAll">Матч сразу</button></div>
  <label class="chk" for="mv-stop"><input type="checkbox" id="mv-stop" ${MV.stopEach ? 'checked' : ''}> Останавливаться перед каждым раундом</label>`;
  if (a.boostR > 0) h += `<p class="hint">Тайм-аут действует: +4% к игре команды ещё ${a.boostR} раунд(а).</p>`;
  $('#mv-pan').innerHTML = h;
}
function mvKD() {
  const m = MV.m, col = c => `<div><h3>${esc(c.team.tag)}</h3>${[...c.five].sort((x, y) => c.st[y.id].k - c.st[x.id].k).map(p => `<p><span>${esc(p.nick)}</span><span class="num">${c.st[p.id].k}/${c.st[p.id].d}</span></p>`).join('')}</div>`;
  $('#mv-kd').innerHTML = `<div class="kd">${col(m.a)}${col(m.b)}</div><p class="hint">Убийства и смерти за матч.</p>`;
}
function mvPlace(r) {
  const cnt = {};
  for (const u of r.units) {
    if (!u.alive) continue;
    const k = u.z + u.side, i = cnt[k] = (cnt[k] || 0) + 1, z = r.map.zones[u.z], p = MV.pos[u.id] || (MV.pos[u.id] = {}), s = u.side === 'T' ? 1 : -1;
    p.x = z.x - 7 + ((i - 1) % 3) * 7 + (i > 3 ? 3.5 : 0); p.y = z.y + s * 7 + (i > 3 ? s * 6.5 : 0);
    if (p.px == null) { p.px = p.x; p.py = p.y; }
  }
}
function mvBegin() {
  const m = MV.m, r = m.startRound();
  MV.phase = 'live'; MV.paused = false; MV.acc = 0; MV.pos = {}; MV.feedN = -1; mvPlace(r);
  $('#mv-banner').hidden = true; mvHead(); mvPanel(); mvFeed();
}
function mvFeed() {
  const r = MV.m.round; if (!r || r.feed.length === MV.feedN) return;
  MV.feedN = r.feed.length;
  const T = MV.m.T, CT = MV.m.CT;
  $('#mv-feed').innerHTML = r.feed.length ? r.feed.slice(-3).map(f => f.plant ? `<div><span class="T">Бомба установлена на ${f.plant}</span></div>` : `<div><span class="${f.ws}">${esc(f.wn)}</span> убил <s>${esc(f.ln)}</s></div>`).join('') : `<div>${esc(T.team.tag)}: ${BUY_N[T.buy].toLowerCase()} · ${esc(CT.team.tag)}: ${BUY_N[CT.buy].toLowerCase()}</div>`;
}
function mvRoundDone() {
  const m = MV.m, r = m.round, won = r.over.win === m.a.side, why = r.over.why;
  m.endRound();
  const wt = why === 'elim' ? (won ? 'соперник уничтожен' : 'ваша пятёрка уничтожена') : WHY_N[why];
  const msgs = m.msg.splice(0), bn = $('#mv-banner');
  bn.textContent = (won ? 'Раунд ваш: ' : 'Раунд соперника: ') + wt + (msgs.length ? '. ' + msgs.join('. ') : '') + '.';
  bn.className = 'banner ' + (won ? 'w' : 'l'); bn.hidden = false;
  if (m.over) { MV.phase = 'done'; bn.textContent = (m.winner === m.a ? 'Победа ' : 'Поражение ') + m.a.score + ':' + m.b.score; bn.className = 'banner ' + (m.winner === m.a ? 'w' : 'l'); }
  else { MV.phase = 'post'; MV.postAt = performance.now() + 1500 / Math.sqrt(MV.speed); MV.hold = MV.stopEach || msgs.some(x => x.startsWith('Смена') || x.startsWith('Овертайм')); }
  mvHead(); mvPanel(); mvKD();
}
function mvStep() {
  const r = MV.m.round;
  for (const u of r.units) { const p = MV.pos[u.id]; if (p) { p.px = p.x; p.py = p.y; } }
  r.step(); mvPlace(r); mvFeed();
  if (r.over) mvRoundDone();
  else if (r.planted !== MV.wasPl || r.switched !== MV.wasSw) { MV.wasPl = r.planted; MV.wasSw = r.switched; mvPanel(); }
}
function mvLoop(ts) {
  if (!MV) return;
  const dt = Math.min(ts - (MV.last || ts), 100); MV.last = ts;
  const tickMs = { 1: 430, 2: 210, 4: 90 }[MV.speed];
  if (MV.phase === 'live' && !MV.paused) { MV.acc += dt; if (MV.acc >= tickMs) { MV.acc = 0; mvStep(); } }
  else if (MV.phase === 'post' && ts >= MV.postAt) { if (MV.hold) { MV.phase = 'pre'; mvHead(); mvPanel(); } else mvBegin(); }
  if (MV) { mvDraw(MV.phase === 'live' && !MV.paused ? MV.acc / tickMs : 1); requestAnimationFrame(mvLoop); }
}
function mvDraw(f) {
  const cv = $('#mv-cv'); if (!cv || !MV.col) return;
  const c = cv.getContext('2d'), C = MV.col, map = MV.m.map, r = MV.m.round, sx = MV.w / 100, sy = MV.h / 124, zs = map.zones;
  c.setTransform(MV.d, 0, 0, MV.d, 0, 0); c.clearRect(0, 0, MV.w, MV.h);
  c.lineCap = 'round'; c.strokeStyle = C.lane; c.lineWidth = 9 * sx;
  for (const [a, b] of map.edges) { c.beginPath(); c.moveTo(zs[a].x * sx, zs[a].y * sy); c.lineTo(zs[b].x * sx, zs[b].y * sy); c.stroke(); }
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const k in zs) {
    const z = zs[k], w = (z.site ? 22 : 26) * sx, h = (z.site ? 13 : 9) * sy, x = z.x * sx - w / 2, y = z.y * sy - h / 2;
    c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, 6); else c.rect(x, y, w, h); c.fillStyle = C.panel2; c.fill();
    c.lineWidth = z.site ? 2 : 1; c.strokeStyle = z.site ? C.accent : C.line; c.stroke();
    if (z.site) { c.fillStyle = C.accent; c.font = '700 ' + Math.round(15 * sx / 3.6) + 'px Unbounded, Arial Black, sans-serif'; }
    else { c.fillStyle = C.mut; c.font = '500 ' + Math.max(9, Math.round(2.9 * sx)) + 'px "Golos Text", system-ui, sans-serif'; }
    c.fillText(z.n, z.x * sx, z.y * sy + 1);
  }
  if (!r) return;
  if (r.planted) {
    const z = zs[r.bombZ], t = (performance.now() % 900) / 900;
    c.beginPath(); c.arc(z.x * sx, z.y * sy, (8 + 6 * t) * sx, 0, 7); c.strokeStyle = C.bad; c.globalAlpha = 1 - t; c.lineWidth = 2; c.stroke(); c.globalAlpha = 1;
  }
  const rad = 2.5 * sx;
  for (const u of r.units) {
    const p = MV.pos[u.id]; if (!p) continue;
    const x = (p.px + (p.x - p.px) * f) * sx, y = (p.py + (p.y - p.py) * f) * sy;
    if (!u.alive) { c.globalAlpha = .4; c.strokeStyle = C[u.side]; c.lineWidth = 2; c.beginPath(); c.moveTo(x - rad * .7, y - rad * .7); c.lineTo(x + rad * .7, y + rad * .7); c.moveTo(x + rad * .7, y - rad * .7); c.lineTo(x - rad * .7, y + rad * .7); c.stroke(); c.globalAlpha = 1; continue; }
    c.beginPath(); c.arc(x, y, rad, 0, 7); c.fillStyle = C[u.side]; c.fill();
    if (u.pl && MV.mine.has(u.pl.id)) { c.lineWidth = 2; c.strokeStyle = C.fg; c.stroke(); }
  }
  const cl = $('#mv-clock');
  const txt = r.over ? '' : r.planted ? 'Бомба: ' + Math.max(0, Math.ceil(r.bombT * 1.15)) + ' с' + (r.defP ? ' · разминирование' : '') : (() => { const s = Math.max(0, Math.round(115 - r.tick * 1.15)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + (r.plantP ? ' · установка' : ''); })();
  if (cl.textContent !== txt) cl.textContent = txt;
}
function mvSimRound() { const m = MV.m; if (MV.phase === 'pre' || MV.phase === 'post') mvBegin(); if (MV.phase !== 'live') return; m.round.run(); for (const u of m.round.units) { const p = MV.pos[u.id]; if (p) { p.px = p.x; p.py = p.y; } } mvPlace(m.round); mvFeed(); mvRoundDone(); }
function mvSimAll() { let g = 0; while (MV.phase !== 'done' && g++ < 80) { mvSimRound(); } }
function mvClose() {
  const m = MV.m; MV = null; $('#match').hidden = true; $('#match').innerHTML = '';
  flash = finishUserMatch(S, m); save(); tab = 'club'; render(); window.scrollTo(0, 0);
}

/* ---------- Действия ---------- */
const ACT = {
  tab(v) { tab = v; flash = tab === 'club' ? flash : null; window.scrollTo(0, 0); },
  player(v, d) { sheet = { t: d.mk ? 'market' : 'own', id: +d.id }; },
  close() { sheet = null; },
  rename() { sheet = { t: 'name' }; },
  swap(v, d) { const u = userTeam(S), i = u.five.indexOf(+v); if (i >= 0) u.five[i] = +d.id; sheet = null; },
  sell(v, d) {
    const u = userTeam(S), p = u.players.find(x => x.id === +d.id); if (!p || u.players.length <= 5) return;
    u.players = u.players.filter(x => x !== p); S.money += value(p) * .6;
    const i = u.five.indexOf(p.id); if (i >= 0) u.five[i] = u.players.find(x => !u.five.includes(x.id)).id;
    addNews(S, p.nick + ' покинул клуб за ' + cash(value(p) * .6) + '.'); sheet = null;
  },
  buy(v, d) {
    const u = userTeam(S), p = S.market.find(x => x.id === +d.id), c = p && value(p); if (!p || S.money < c || u.players.length >= 8) return;
    S.money -= c; p.sal = salary(p); p.energy = 95; p.morale = 80; S.market = S.market.filter(x => x !== p); u.players.push(p);
    addNews(S, 'Подписан ' + p.nick + ' (' + ROLES[p.role].toLowerCase() + ') за ' + cash(c) + '.'); sheet = { t: 'own', id: p.id }; tab = 'roster';
  },
  focus(v) { S.training.focus = v; }, intensity(v) { S.training.intensity = v; },
  staff(v) { const l = S.staff[v], c = (v === 'coach' ? 40000 : 30000) * (l + 1); if (l >= 3 || S.money < c) return; S.money -= c; S.staff[v]++; addNews(S, (v === 'coach' ? 'Тренер' : 'Аналитик') + ' повышен до уровня ' + S.staff[v] + '.'); },
  play() { flash = null; MV = null; startMatchView(); return false; },
  simPO() { simPlayoffWeek(S); flash = null; },
  nextSeason() { nextSeason(S); flash = null; },
  newAsk() { askNew = true; }, newNo() { askNew = false; },
  newYes() { askNew = false; flash = null; S = newCareer(); tab = 'club'; },
  mvMain() { if (MV.phase === 'pre') mvBegin(); else if (MV.phase === 'live') { MV.paused = !MV.paused; mvHead(); } else if (MV.phase === 'done') mvClose(); return false; },
  mvSpeed(v) { MV.speed = +v; document.querySelectorAll('#match .seg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v)); return false; },
  mvPlan(v) { S.tactics.T.type = v; mvPanel(); return false; },
  mvSite(v) { S.tactics.T.site = v; mvPanel(); return false; },
  mvSetup(v) { S.tactics.CT = v; mvPanel(); return false; },
  mvBuy(v) { S.tactics.buy = v; mvPanel(); return false; },
  mvCmd(v) { const m = MV.m; if (MV.phase === 'live') { m.round.cmd(m.a.side, v); mvPanel(); } return false; },
  mvTO() { const m = MV.m; if (MV.phase !== 'live' && m.timeout(m.a)) { if (MV.phase === 'post') MV.hold = true; mvPanel(); } return false; },
  mvRound() { mvSimRound(); return false; },
  mvAll() { mvSimAll(); return false; }
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) { if (e.target.id === 'sheet') { sheet = null; render(); } return; }
  if (b.disabled) return;
  const fn = ACT[b.dataset.act]; if (!fn) return;
  if (fn(b.dataset.v, b.dataset) === false) return;
  save(); render();
});
document.addEventListener('change', e => { if (e.target.id === 'mv-stop' && MV) MV.stopEach = e.target.checked; });
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id !== 'f-name') return;
  const u = userTeam(S), n = $('#in-name').value.trim(), t = $('#in-tag').value.trim().toUpperCase();
  if (n) u.name = n; if (t) u.tag = t; sheet = null; save(); render();
});
window.addEventListener('resize', () => { if (MV) mvSize(); });
try { const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', () => { if (MV) mvSize(); }); } catch (e) { /* старый браузер */ }

function start() { if (!load()) { S = newCareer(); save(); } render(); }
start();
