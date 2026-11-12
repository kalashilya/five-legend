/* Генератор базы игроков: teams.txt + ids.json -> data.js
   ids.json — реестр постоянных номеров карточек. Номер закреплён за парой «ник + команда» навсегда.
   Игрок, сменивший команду, получает новую карточку, а старая остаётся в базе как архивная версия
   с прежними показателями. Особые версии MVP, однажды появившись, не исчезают.
   Рейтинг карточки: HLTV Rating 3.0 за последние 12 месяцев + бонусы за награды турниров, потолок OVR_CAP для всех. */
const fs = require('fs');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const HLTV = fs.existsSync('hltv-data.json') ? JSON.parse(fs.readFileSync('hltv-data.json', 'utf8')) : { players: {}, snapshotDate: null };
const teamLogoByName = {}; for (const p of Object.values(HLTV.players || {})) if (p.team && p.teamLogo) teamLogoByName[p.team] = p.teamLogo;
const OVR_CAP = 92;                       // потолок рейтинга любой карточки
/* Топ-20 игроков HLTV за прошлый год (по порядку): 1–2 места — 92, 3–7 — 90, 8–20 — 88. Значения фиксированные,
   бонусы MVP/EVP и формула к ним не применяются. Остальные действующие и архивные карточки — не выше 88. */
const TOP20 = 'ZywOo donk ropz m0NESY sh1ro molodoy flameZ frozen KSCERATO Spinx Twistzz mezii Senzu XANTARES YEKINDAR xertioN torzsi NiKo iM b1t'.split(' ');
const top20Ovr = i => i < 2 ? 92 : i < 7 ? 90 : 88;
/* Топ-5 команд рейтинга HLTV: их игроки вне топ-20 получают 85–88, все прочие игроки — не выше 87, чтобы стоять ниже */
const TOP_TEAMS = ['Spirit', 'Vitality', 'FURIA', 'MOUZ', 'Falcons'];
const OTHER_CAP = 88, TOP_TEAM_MIN = 85, REST_CAP = 87;
const finalOvr = (n, team, raw) => { const i = TOP20.indexOf(n); if (i >= 0) return top20Ovr(i); const v = Math.round(raw); return TOP_TEAMS.includes(team) ? clamp(v, TOP_TEAM_MIN, OTHER_CAP) : clamp(v, 58, REST_CAP); };
/* Награды HLTV на турнирах: MVP даёт +2, EVP +1 (у MVP отдельного +1 за EVP нет). Бонусы разных турниров складываются. */
const AWARDS = [
  { event: 'IEM Beijing 2026', ru: 'IEM Пекин 2026', mvp: ['xertioN'], evp: ['w0nderful', 'torzsi', 'Spinx', 'b1t', 'Techno', 'PR', 'xelex'] },
  { event: 'PGL Masters Bucharest 2026', ru: 'PGL Бухарест 2026', mvp: ['YEKINDAR'], evp: ['molodoy', 'ZywOo', 'PR', 'zorte', 'syph0'] }
];
const awardsOut = () => { const o = {}, put = n => o[n] || (o[n] = {});
  AWARDS.forEach(e => { e.mvp.forEach(n => (put(n).a = put(n).a || []).push(['MVP', e.ru, 2])); e.evp.forEach(n => { if (!e.mvp.includes(n)) (put(n).a = put(n).a || []).push(['EVP', e.ru, 1]); }); });
  TOP20.forEach((n, i) => put(n).top = i + 1); return o; };
const awardBonus = nick => AWARDS.reduce((s, e) => s + (e.mvp.includes(nick) ? 2 : e.evp.includes(nick) ? 1 : 0), 0);
const hltvStats = (nick, role) => { const p = HLTV.players && HLTV.players[nick]; if (!p || !p.last12m || p.last12m.maps < 80) return null; const a = p.last12m, b = p.last3m, raw = 65 + (a.rating3 - 1) * 85 + awardBonus(nick), ovr = Math.round(clamp(raw, 58, OVR_CAP)), clutch = Math.round(a.closing * .65 + clamp(a.clutchesPer24 * 200, 0, 100) * .35), st = [a.firepower, a.opening, a.utility, a.trading, clutch, role === 4 ? 80 : 50].map(x => Math.round(clamp(x, 40, 99))); return { ovr, raw, st, hltv: Object.assign({ source: 'HLTV', profileId: p.profileId, snapshotDate: HLTV.snapshotDate, last12m: { maps: a.maps, rating3: a.rating3, roundSwing: a.roundSwing } }, b ? { last3m: { maps: b.maps, rating3: b.rating3, roundSwing: b.roundSwing } } : {}) }; };
const hsh = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const AWP = 'torzsi ZywOo molodoy woxic sh1ro m0NESY w0nderful 910 device Jame s1mple hallzerk saffee nicoodoz phzy ArtFr0st nqz CeRq faveN headtr1ck hypex luchov slaxz- JamYoung Starry aliStair Rainwaker story JW cmtry junior lattykk'.split(' ');
const IGL = 'karrigan mezii FalleN kyxsan magixx Boombl4 Aleksib siuhy bLitz huNter- nafany JT tabseN VINI nitr0 INS biguzera stanislaw Stewie2K MUTiRiS sjuush s1n arT npl max exit Magisk apEX'.split(' ');
const STAR = { ZywOo: 11, donk: 12, m0NESY: 8, s1mple: 10, NiKo: 6, ropz: 6, sh1ro: 6, molodoy: 6, XANTARES: 5, KSCERATO: 5, Spinx: 5, flameZ: 5, frozen: 6, kyousuke: 5, '910': 5, Senzu: 6, Twistzz: 6, device: 6, stavn: 5, blameF: 6, torzsi: 4, b1t: 4, w0nderful: 4, xertioN: 4, Jimpphat: 4, mzinho: 5, NAF: 4, EliGE: 4, Staehr: 4, REZ: 5, zweih: 4, HeavyGod: 4, malbsMd: 5, Ax1Le: 4, yuurih: 4, jL: 4, apEX: 4, iM: 3, YEKINDAR: 3, rain: 4, jabbi: 3, Brollan: 3, MATYS: 3, Jame: 3, zont1x: 3, Wicadia: 3, woxic: 3, xKacpersky: 3, insani: 3, Techno: 3, tN1R: 3, zorte: 3, Magnojez: 3, dem0n: 3, 'KaiR0N-': 3, saffee: 4, hallzerk: 4, jks: 5, autimatic: 5, Brehze: 5, CeRq: 5, Grim: 4, try: 3, dumau: 3, S1ren: 2, dziugss: 2, Krabeni: 2, makazze: 2, 'huNter-': 2, NertZ: 2, HObbit: 2, xiELO: 2, FL1T: 2, biguzera: 3, Magisk: 4, JW: 5, KRIMZ: 5, Sonic: 2, tabseN: 3, faveN: 2, JDC: 2, VINI: 2, latto: 2, lux: 2, mezii: 2, sjuush: 1, bLitz: 1, Stewie2K: 4, nitr0: 3, karrigan: 1, FalleN: 2, Aleksib: 1 };
const FIX = { ropz: 3, jL: 2, apEX: 4, flameZ: 1, YEKINDAR: 1, KSCERATO: 3, yuurih: 2, donk: 1, zont1x: 3, tN1R: 2, NiKo: 1, kyousuke: 3, TeSeS: 2, XANTARES: 1, Wicadia: 3, Jimpphat: 2, Spinx: 3, xelex: 1, PR: 2, b1t: 3, iM: 1, makazze: 2, frozen: 3, Twistzz: 2, rain: 1, NAF: 3, EliGE: 1, stavn: 3, jabbi: 1, Staehr: 2, Brollan: 1, REZ: 1, blameF: 3, Senzu: 1, mzinho: 3, Techno: 2, Ax1Le: 1, zweih: 1, HeavyGod: 3, MATYS: 1, malbsMd: 1 };
const TIER = [8, 35, 110, 260];           // границы редкостей по месту в общем рейтинге действующих игроков
const reg = fs.existsSync('ids.json') ? JSON.parse(fs.readFileSync('ids.json', 'utf8')) : { next: 0, cards: {}, mvp: [] };
delete reg.week;                          // «Игрок недели» убран из игры
const rows = fs.readFileSync('teams.txt', 'utf8').trim().split('\n').map(l => l.split('|'));
const TM = [], cur = [], seen = new Set(); const pmax = +rows[0][1], pmin = +rows[rows.length - 1][1];
rows.forEach(([rk, pts, name, ros], ti) => {
  TM.push(name.trim());
  const tb = 62 + 24 * Math.pow((pts - pmin) / (pmax - pmin), .75);
  const ps = ros.split(',').map(s => s.trim()).filter(n => n && !seen.has(n.toLowerCase()));
  const role = {}; for (const n of ps) if (n in FIX) role[n] = FIX[n]; let awp = ps.find(n => AWP.includes(n)), igl = ps.find(n => IGL.includes(n) && n !== awp);
  const rest = () => ps.filter(n => !(n in role)).sort((a, b) => hsh(a + 'r') - hsh(b + 'r'));
  if (!awp) awp = rest()[0]; if (awp) role[awp] = 0;
  if (!igl) igl = rest()[0]; if (igl) role[igl] = 4;
  { const have = new Set(Object.values(role)); const need = [1, 2, 3].filter(r => !have.has(r)).concat([1, 2, 3]); rest().forEach((n, i) => role[n] = need[i]); }
  for (const n of ps) {
    seen.add(n.toLowerCase());
    const old = reg.cards[n.toLowerCase() + '|' + name.trim()], h = hltvStats(n, role[n]), p = HLTV.players && HLTV.players[n], meta = p && p.profileId ? { source: 'HLTV', profileId: p.profileId, profileUrl: p.profileUrl, photo: p.photo, country: p.country, countryCode: p.countryCode, team: p.team, teamLogo: p.teamLogo || teamLogoByName[name.trim()], verifiedAt: HLTV.snapshotDate } : null;
    const o = tb + ((hsh(n) % 400) / 100 - 2) + (STAR[n] || 0) - (role[n] === 4 && !(n in STAR) ? 2.5 : 0);
    const hv = Object.assign({}, old && old.hltv || {}, h && h.hltv || {}, meta || {}); const rawO = h ? h.raw : o + awardBonus(n);   // без потолка: нужен только чтобы упорядочить игроков с равным рейтингом
    const t20 = TOP20.indexOf(n), sortKey = t20 >= 0 ? 1000 - t20 : rawO;   // топ-20 при равенстве — в порядке списка HLTV
    cur.push([n, ti, role[n], finalOvr(n, name.trim(), rawO), h ? h.st : old && old.st || null, Object.keys(hv).length ? hv : null, sortKey]);
  }
});
cur.sort((a, b) => b[3] - a[3] || b[6] - a[6] || a[1] - b[1]);

const key = (n, team) => n.toLowerCase() + '|' + team, live = new Set(), PL = [];
cur.forEach(([n, ti, role, ovr, st, hltv], rank) => {
  const k = key(n, TM[ti]), rar = rank < TIER[0] ? 4 : rank < TIER[1] ? 3 : rank < TIER[2] ? 2 : rank < TIER[3] ? 1 : 0;
  const id = reg.cards[k] ? reg.cards[k].id : reg.next++;
  reg.cards[k] = { id, nick: n, team: TM[ti], role, ovr, rar, st, hltv }; live.add(k);
  PL.push([n, ti, role, ovr, id, rar, 0, st, hltv]);
  if (rank < TIER[0] && !reg.mvp.includes(id)) reg.mvp.push(id);
});
let archived = 0;
for (const k in reg.cards) if (!live.has(k)) {                 // архивные версии: игрок сменил команду или выбыл из рейтинга
  const c = reg.cards[k]; let ti = TM.indexOf(c.team); if (ti < 0) { ti = TM.length; TM.push(c.team); }
  const p = HLTV.players && HLTV.players[c.nick];
  if (p && p.profileId) c.hltv = Object.assign({}, c.hltv || {}, { source: 'HLTV', profileId: p.profileId, profileUrl: p.profileUrl, photo: p.photo, country: p.country, countryCode: p.countryCode, team: p.team, teamLogo: p.teamLogo || teamLogoByName[c.team], verifiedAt: HLTV.snapshotDate });
  const capA = TOP20.includes(c.nick) ? top20Ovr(TOP20.indexOf(c.nick)) : OTHER_CAP;   // архивная версия игрока из топ-20 сохраняет его рейтинг
  PL.push([c.nick, ti, c.role, Math.min(capA, c.ovr), c.id, c.rar, 1, c.st || null, c.hltv || null]); archived++;
}
PL.sort((a, b) => b[3] - a[3] || a[1] - b[1] || a[4] - b[4]);
fs.writeFileSync('ids.json', JSON.stringify(reg));
const verified = Object.keys(HLTV.players || {}).filter(n => HLTV.players[n].photo && cur.some(x => x[0] === n)).length;
fs.writeFileSync('data.js', '/* Составы: Valve global ranking от 11 ноября 2026. HLTV-верифицировано игроков с фото: ' + verified + '. Игроки без фото остаются с затемнённым силуэтом. */\n/* Строка игрока: ник, команда, роль, рейтинг, постоянный номер, редкость, архивная версия, характеристики HLTV или null, источник HLTV или null */\nconst TM=' + JSON.stringify(TM) + ';\nconst PL=' + JSON.stringify(PL) + ';\nconst SPM=' + JSON.stringify(reg.mvp) + ';\n' +
  '/* Награды для подписи на карточке: a — [MVP|EVP, турнир, бонус], top — место в топ-20 HLTV за год */\nconst AWD=' + JSON.stringify(awardsOut()) + ';\n');
console.log(PL.length, 'карточек,', archived, 'архивных,', TM.length, 'команд, особых MVP:', reg.mvp.length);
