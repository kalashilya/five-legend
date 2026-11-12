/* самая свободная точка в прямоугольнике: node freeat.js Map x0 y0 x1 y1 */
const fs = require('fs'), dir = __dirname + '/../..';
const src = ['data.js', 'core.js', 'meta.js', 'radar.js', 'radar-maps.js'].map(f => fs.readFileSync(dir + '/' + f, 'utf8')).join('\n');
const E = new Function('module', 'exports', 'document', src + '\nreturn { rdFree, rdMap };')({ exports: {} }, {}, undefined);
const M = E.rdMap(process.argv[2]); const a = process.argv.slice(3).map(Number);
for (let q = 0; q < a.length; q += 4) { const [x0, y0, x1, y1] = a.slice(q, q + 4); let best = null, bf = -1e9;
  for (let y = y0; y <= y1; y += .5) for (let x = x0; x <= x1; x += .5) { const f = E.rdFree(M, [x, y]); if (f > bf) { bf = f; best = [x, y]; } }
  console.log(`[${x0},${y0},${x1},${y1}] → [${best}] запас ${bf.toFixed(2)}`); }
