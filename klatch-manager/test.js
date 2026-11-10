const E = require('./engine.js');
const N = +process.argv[2] || 1500;
const mkT = (o, id) => { const t = E.genTeam(id, 'T' + id, 'T' + id, o); t.players.forEach(p => { p.energy = 90; p.morale = 75; }); return t; };
// 1. Матрица тактик: доля раундов атаки при равных командах и полном закупе
const plans = [['rush', 'A'], ['exec', 'A'], ['fake', 'A'], ['def', 'A']], setups = ['standard', 'stackA', 'stackB', 'aggro', 'retake'];
for (const mapId of E.MAP_ORDER) {
  console.log('\n' + mapId + '  (T win %)   ' + setups.join('  '));
  let tot = 0, cnt = 0;
  for (const [type, site] of plans) {
    let row = (type + '     ').slice(0, 6);
    for (const s of setups) {
      let w = 0;
      for (let i = 0; i < N; i++) {
        const a = mkT(70, 1), b = mkT(70, 2);
        const T = { five: a.players.slice(0, 5), plan: { type, site }, buy: 'full', boost: 1, util: E.avgA(a.players.slice(0, 5), 'util') };
        const C = { five: b.players.slice(0, 5), setup: s, buy: 'full', boost: 1, util: E.avgA(b.players.slice(0, 5), 'util') };
        const r = new E.Round(E.MAPS[mapId], T, C); if (r.run().win === 'T') w++;
      }
      row += '  ' + (100 * w / N).toFixed(0).padStart(8); tot += w; cnt += N;
    }
    console.log(row);
  }
  console.log('avg T', (100 * tot / cnt).toFixed(1));
}
// 2. Полные матчи ИИ против ИИ
function series(oa, ob, n) {
  let w = 0, tr = 0, rr = 0, ot = 0, why = {};
  for (let i = 0; i < n; i++) {
    const a = mkT(oa, 1), b = mkT(ob, 2), m = new E.Match(E.MAPS[E.MAP_ORDER[i % 3]], a, b).playAll();
    if (m.winner === m.a) w++; if (m.ot) ot++;
    for (const l of m.log) { rr++; if (l.side === 'T') tr++; why[l.why] = (why[l.why] || 0) + 1; }
  }
  return { win: (100 * w / n).toFixed(1), Tpct: (100 * tr / rr).toFixed(1), rounds: (rr / n).toFixed(1), ot: (100 * ot / n).toFixed(1), why };
}
console.log('\nequal 70v70', series(70, 70, 600));
console.log('72v68', series(72, 68, 600));
console.log('75v65', series(75, 65, 600));
// 3. Быстрый расчёт для сравнения
for (const [x, y] of [[72, 68], [75, 65]]) { let w = 0; for (let i = 0; i < 3000; i++) { const [a, b] = E.quickMatch(mkT(x, 1), mkT(y, 2)); if (a > b) w++; } console.log('quick', x, y, (w / 30).toFixed(1)); }
// 4. Сезон целиком
const S = E.newCareer();
let guard = 0;
while (S.phase !== 'end' && guard++ < 40) {
  const nm = E.nextMatch(S);
  if (!nm) { E.simPlayoffWeek(S); continue; }
  const m = new E.Match(nm.map, E.userTeam(S), nm.opp, { tactics: S.tactics }).playAll();
  E.finishUserMatch(S, m);
}
console.log('\nseason', S.summary, 'money', S.money, 'weeks', guard);
console.log(E.standings(S).map(t => t.tag + ' ' + t.w + '-' + t.l).join(' | '));
E.nextSeason(S); console.log('next season ok', S.season, S.phase, JSON.stringify(S).length + ' bytes save');
