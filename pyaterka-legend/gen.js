/* Генератор базы игроков: teams.txt + ids.json -> data.js
   ids.json — реестр постоянных номеров карточек. Номер закреплён за парой «ник + команда» навсегда.
   Игрок, сменивший команду, получает новую карточку, а старая остаётся в базе как архивная версия
   с прежними показателями. Особые версии (Игрок недели, MVP), однажды появившись, не исчезают. */
const fs = require('fs');
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const HLTV = fs.existsSync('hltv-data.json') ? JSON.parse(fs.readFileSync('hltv-data.json', 'utf8')) : { players: {}, snapshotDate: null };
const hltvStats = (nick, role) => { const p = HLTV.players && HLTV.players[nick]; if (!p || !p.last12m || !p.last3m || p.last12m.maps < 80 || p.last3m.maps < 25) return null; const a = p.last12m, b = p.last3m, form = clamp((b.rating3 - a.rating3) * 20, -3, 3), ovr = Math.round(clamp(65 + (a.rating3 - 1) * 85 + form, 58, 99)), clutch = Math.round(a.closing * .65 + clamp(a.clutchesPer24 * 200, 0, 100) * .35), st = [a.firepower, a.opening, a.utility, a.trading, clutch, role === 4 ? 80 : 50].map(x => Math.round(clamp(x, 40, 99))); return { ovr, st, hltv: { source: 'HLTV', profileId: p.profileId, snapshotDate: HLTV.snapshotDate, last12m: { maps: a.maps, rating3: a.rating3, roundSwing: a.roundSwing }, last3m: { maps: b.maps, rating3: b.rating3, roundSwing: b.roundSwing } } }; };
const hsh = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const AWP = 'torzsi ZywOo molodoy woxic sh1ro m0NESY w0nderful 910 device Jame s1mple hallzerk saffee nicoodoz phzy ArtFr0st nqz CeRq faveN headtr1ck hypex luchov slaxz- JamYoung Starry aliStair Rainwaker story JW cmtry'.split(' ');
const IGL = 'karrigan mezii FalleN kyxsan magixx Boombl4 Aleksib siuhy bLitz huNter- nafany JT tabseN VINI nitr0 INS biguzera stanislaw Stewie2K MUTiRiS sjuush s1n arT npl max exit Magisk'.split(' ');
const STAR = { ZywOo: 11, donk: 12, m0NESY: 8, s1mple: 10, NiKo: 6, ropz: 6, sh1ro: 6, molodoy: 6, XANTARES: 5, KSCERATO: 5, Spinx: 5, flameZ: 5, frozen: 6, kyousuke: 5, '910': 5, Senzu: 6, Twistzz: 6, device: 6, stavn: 5, blameF: 6, torzsi: 4, b1t: 4, w0nderful: 4, xertioN: 4, Jimpphat: 4, mzinho: 5, NAF: 4, EliGE: 4, Staehr: 4, REZ: 5, zweih: 4, HeavyGod: 4, malbsMd: 5, Ax1Le: 4, yuurih: 4, jL: 4, iM: 3, YEKINDAR: 3, rain: 4, jabbi: 3, Brollan: 3, MATYS: 3, Jame: 3, zont1x: 3, Wicadia: 3, woxic: 3, xKacpersky: 3, insani: 3, Techno: 3, tN1R: 3, zorte: 3, Magnojez: 3, dem0n: 3, 'KaiR0N-': 3, saffee: 4, hallzerk: 4, jks: 5, autimatic: 5, Brehze: 5, CeRq: 5, Grim: 4, try: 3, dumau: 3, S1ren: 2, dziugss: 2, Krabeni: 2, makazze: 2, 'huNter-': 2, NertZ: 2, HObbit: 2, xiELO: 2, FL1T: 2, biguzera: 3, Magisk: 4, JW: 5, KRIMZ: 5, Sonic: 2, tabseN: 3, faveN: 2, JDC: 2, VINI: 2, latto: 2, lux: 2, mezii: 2, sjuush: 1, bLitz: 1, Stewie2K: 4, nitr0: 3, karrigan: 1, FalleN: 2, Aleksib: 1 };
const FIX = { ropz: 3, jL: 2, flameZ: 1, YEKINDAR: 1, KSCERATO: 3, yuurih: 2, donk: 1, zont1x: 3, tN1R: 2, NiKo: 1, kyousuke: 3, TeSeS: 2, XANTARES: 1, Wicadia: 3, Jimpphat: 2, Spinx: 3, xelex: 1, PR: 2, b1t: 3, iM: 1, makazze: 2, frozen: 3, Twistzz: 2, rain: 1, NAF: 3, EliGE: 1, stavn: 3, jabbi: 1, Staehr: 2, Brollan: 1, REZ: 1, blameF: 3, Senzu: 1, mzinho: 3, Techno: 2, Ax1Le: 1, zweih: 1, HeavyGod: 3, MATYS: 1, malbsMd: 1 };
const TIER = [8, 35, 110, 260];           // границы редкостей по месту в общем рейтинге действующих игроков
const reg = fs.existsSync('ids.json') ? JSON.parse(fs.readFileSync('ids.json', 'utf8')) : { next: 0, cards: {}, week: [], mvp: [] };
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
    const old = reg.cards[n.toLowerCase() + '|' + name.trim()], h = hltvStats(n, role[n]);
    const o = tb + ((hsh(n) % 400) / 100 - 2) + (STAR[n] || 0) - (role[n] === 4 && !(n in STAR) ? 2.5 : 0);
    cur.push([n, ti, role[n], h ? h.ovr : Math.round(Math.max(58, Math.min(96, o))), h ? h.st : old && old.st || null, h ? h.hltv : old && old.hltv || null]);
  }
});
cur.sort((a, b) => b[3] - a[3] || a[1] - b[1]);

const key = (n, team) => n.toLowerCase() + '|' + team, live = new Set(), PL = [];
cur.forEach(([n, ti, role, ovr, st, hltv], rank) => {
  const k = key(n, TM[ti]), rar = rank < TIER[0] ? 4 : rank < TIER[1] ? 3 : rank < TIER[2] ? 2 : rank < TIER[3] ? 1 : 0;
  const id = reg.cards[k] ? reg.cards[k].id : reg.next++;
  reg.cards[k] = { id, nick: n, team: TM[ti], role, ovr, rar, st, hltv }; live.add(k);
  PL.push([n, ti, role, ovr, id, rar, 0, st, hltv]);
  if (rank < TIER[0] && !reg.mvp.includes(id)) reg.mvp.push(id);
  if (hsh(n + 'week') % 100 < 8 && !reg.week.includes(id)) reg.week.push(id);
});
let archived = 0;
for (const k in reg.cards) if (!live.has(k)) {                 // архивные версии: игрок сменил команду или выбыл из рейтинга
  const c = reg.cards[k]; let ti = TM.indexOf(c.team); if (ti < 0) { ti = TM.length; TM.push(c.team); }
  PL.push([c.nick, ti, c.role, c.ovr, c.id, c.rar, 1, c.st || null, c.hltv || null]); archived++;
}
PL.sort((a, b) => b[3] - a[3] || a[1] - b[1] || a[4] - b[4]);
fs.writeFileSync('ids.json', JSON.stringify(reg));
const verified = Object.keys(HLTV.players || {}).filter(n => cur.some(x => x[0] === n)).length;
fs.writeFileSync('data.js', '/* Составы: рейтинг Valve Regional Standings от 2 ноября 2026. HLTV-верифицировано игроков: ' + verified + '. Остальные карточки пока предварительные. */\n/* Строка игрока: ник, команда, роль, рейтинг, постоянный номер, редкость, архивная версия, характеристики HLTV или null, источник HLTV или null */\nconst TM=' + JSON.stringify(TM) + ';\nconst PL=' + JSON.stringify(PL) + ';\nconst SPW=' + JSON.stringify(reg.week) + ',SPM=' + JSON.stringify(reg.mvp) + ';\n');
console.log(PL.length, 'карточек,', archived, 'архивных,', TM.length, 'команд, особых:', reg.week.length, '+', reg.mvp.length);
