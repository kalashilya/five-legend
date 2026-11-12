/* проверка подробной карты: узлы в проходах, проходы между узлами, маршруты; затем раунды (simtest) */
const fs = require('fs'), dir = __dirname + '/../..', mapN = process.argv[2], R = +(process.argv[3] || 10);
const src = ['data.js', 'core.js', 'meta.js', 'radar.js', 'radar-maps.js'].map(f => fs.readFileSync(dir + '/' + f, 'utf8')).join('\n');
const E = new Function('module', 'exports', 'document', src + '\nreturn { rdSnap, Match, ALL, squadInfo, MAPS, rdScript, rdPos, rdLos, rdFree, rdMap, rdD, rdGeo, rdRoute, rdPlanOf, rdPath };')({ exports: {} }, {}, undefined);
const { Match, ALL, squadInfo, MAPS, rdScript, rdPos, rdLos, rdFree, rdMap, rdD, rdGeo, rdRoute, rdPlanOf, rdPath } = E;
const M = rdMap(mapN), g = rdGeo(M), bad = [];
for (const k in M.n) { const f = rdFree(M, M.n[k]); if (f < 1) { const q = E.rdSnap(M, M.n[k], 1.6); bad.push(`узел ${k} ${M.n[k]} запас ${f.toFixed(2)} → лучше [${q.map(v => +v.toFixed(1)).join(', ')}]`); } }
for (const e of M.e) { if (e[3] === 'v') continue; const a = M.n[e[0]], b = M.n[e[1]]; if (!rdLos(M, a, b, .9) && !g.via[e[0] + '>' + e[1]]) bad.push(`проход ${e[0]}–${e[1]} закрыт`); }
for (const s of ['A', 'B']) for (const r of M.tr[s]) for (let i = 1; i < r.length; i++) if (!M.e.some(e => (e[0] === r[i - 1] && e[1] === r[i]) || (e[1] === r[i - 1] && e[0] === r[i]))) bad.push(`маршрут ${s}: нет прохода ${r[i - 1]}–${r[i]}`);
const P = rdPlanOf(M); for (const z in P.ct) P.ct[z].forEach((q, i) => { if (rdFree(M, q.p) < .8) bad.push(`позиция CT ${z}${i} ${q.p} у стены ${rdFree(M, q.p).toFixed(2)}`); });
for (const s of ['A', 'B']) P.fs[s].forEach((q, i) => { if (rdFree(M, q) < .8) bad.push(`место после закладки ${s}${i} ${q} у стены`); });
P.spT.concat(P.spCT).forEach((q, i) => { if (rdFree(M, q) < .8) bad.push(`респаун ${i} ${q} у стены`); });
console.log(mapN, 'зон', (M.rects || []).length, 'узлов', Object.keys(M.n).length, bad.length ? '\n  ' + bad.join('\n  ') : 'геометрия ok');
/* длины путей до точек */
for (const [a, b, side] of [['TS', 'A', 'T'], ['TS', 'B', 'T'], ['CTS', 'A', 'CT'], ['CTS', 'B', 'CT']]) { const p = rdPath(M, M.n[a], M.n[b], side); let l = 0; for (let i = 1; i < p.length; i++) l += rdD(p[i - 1], p[i]); console.log(`  ${a}→${b}: ${l.toFixed(0)} ед., ${(l / 11.5).toFixed(1)} с бегом`); }
if (!R) process.exit();
const best = r => ALL.filter(c => !c.sp && c.role === r).sort((a, b) => b.ovr - a.ovr)[8], SQ = [0, 1, 2, 3, 4].map(r => ({ c: best(r), lv: 1 }));
const S0 = { rounds: 0, kills: 0, losBad: 0, far: 0, wall: 0, wallP: [], dur: [], ends: {} }, t0 = Date.now();
for (let gm = 0; gm < R; gm++) { const m = new Match(SQ, 900, squadInfo(SQ).rating, { capt: 4 }); m.map = MAPS.find(x => x.n === mapN) || { n: mapN };
  while (!m.over) { const L = m.play([], { dir: 'ASB'[(Math.random() * 3) | 0], tempo: ['fast', 'norm', 'slow'][(Math.random() * 3) | 0], focus: -1 });
    const S = rdScript(L, mapN); S0.rounds++; S0.dur.push(S.T); S0.ends[L.end] = (S0.ends[L.end] || 0) + 1;
    for (const e of S.ev) if (e.type === 'kill') { S0.kills++; const K = S.dots.find(d => d.team === (e.k.byA ? 'a' : 'b') && d.i === e.k.k), V = S.dots.find(d => d.team === (e.k.byA ? 'b' : 'a') && d.i === e.k.v);
      const a = rdPos(K, e.t - .001), b = V.dp; if (!rdLos(M, a, b, .3)) S0.losBad++; if (rdD(a, b) > 47) S0.far++; }
    for (const d of S.dots) for (let t = 0; t < S.T; t += .25) { const p = rdPos(d, t); if (rdFree(M, p) < -.2) { S0.wall++; if (S0.wallP.length < 8) S0.wallP.push(p.map(v => v.toFixed(1)).join(',')); break; } } } }
const D = S0.dur.sort((a, b) => a - b);
console.log('  раундов', S0.rounds, 'убийств', S0.kills, 'без видимости', S0.losBad, 'далеко', S0.far, 'в стене', S0.wall, S0.wallP.join(' '), 'длит. мед', D[D.length >> 1].toFixed(1), 'мин', D[0].toFixed(1), JSON.stringify(S0.ends), ((Date.now() - t0) / 1000).toFixed(1) + ' с');
