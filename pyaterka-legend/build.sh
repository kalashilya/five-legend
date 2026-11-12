#!/bin/bash
cd "$(dirname "$0")"
{ cat head.html
echo '<!--RV3D-->'
echo '<!--CASEIMG-->'
echo '<!--THREE3D-->'
cat <<'X'
<script>
window.__cmErr = function (m) {
  var a = document.getElementById('app');
  if (a && !a.dataset.ok) a.innerHTML = '<div class="card"><h2>Игра не запустилась</h2><p class="sm">Подробности ошибки:</p><pre class="num sm" style="white-space:pre-wrap;overflow-wrap:anywhere">' + String(m).replace(/</g, '&lt;') + '</pre></div>';
};
window.addEventListener('error', function (e) {
  var detail = e.error && (e.error.stack || e.error.message) || e.message || 'ошибка';
  window.__cmErr(detail + ' · строка ' + (e.lineno || '?'));
});
window.addEventListener('unhandledrejection', function (e) {
  var reason = e.reason && (e.reason.stack || e.reason.message) || e.reason || 'неизвестная ошибка';
  window.__cmErr('Unhandled rejection: ' + reason);
});

</script>
<script>
(function () {
'use strict';
X
cat data.js core.js meta.js radar.js ui.js live.js live3d.js
echo "try { start(); document.getElementById('app').dataset.ok = 1; } catch (e) { window.__cmErr(e && e.stack || e); }"
echo '})();'; echo '</script>'; } > pyaterka-legend.html
{ echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'; cat pyaterka-legend.html; echo '</body></html>'; } > pyaterka-legend-offline.html
cat data.js core.js meta.js > _t.js
rm -f pyaterka-legend.html
ls -la pyaterka-legend-offline.html | awk '{print $5" bytes"}'

# Эталон 3D-открытия: Three.js встраивается в файл, интернет не нужен
python3 -I - <<'PY'
src = open('reveal-lab.src.html', encoding='utf-8').read()
three = open('vendor/three.min.js', encoding='utf-8').read()
flags = open('vendor/flags.js', encoding='utf-8').read()
import base64
bg = 'const BG_SRC = "data:image/jpeg;base64,' + base64.b64encode(open('vendor/stage-bg.jpg','rb').read()).decode() + '";'
assert '/*THREE*/' in src
out = src.replace('/*THREE*/', three, 1).replace('/*FLAGS*/', flags, 1).replace('/*BG*/', bg, 1)
open('reveal-lab.html', 'w', encoding='utf-8').write(out)
# 3D-открытие кейса встраивается в игру целиком (base64), игра запускает его в отдельном слое
g = open('pyaterka-legend-offline.html', encoding='utf-8').read()
assert g.count('<!--RV3D-->') == 1
assert g.count('<!--CASEIMG-->') == 1
# значки кейсов — снимки 3D-кейсов из сцены открытия (vendor/case-*.webp, прозрачный фон)
ci = ','.join('"%s":"data:image/webp;base64,%s"' % (k, base64.b64encode(open('vendor/case-%s.webp' % k, 'rb').read()).decode()) for k in ('basic', 'pro', 'elite'))
g = g.replace('<!--CASEIMG-->', '<script>window.CASE_IMG={' + ci + '};</script>', 1)
g = g.replace('<!--RV3D-->', '<script>window.RV_SRC="' + base64.b64encode(out.encode('utf-8')).decode() + '";</script>', 1)
# Three.js для 3D-матча — прямо в игре (без интернета)
assert g.count('<!--THREE3D-->') == 1 and '</script' not in three.lower() and '<!--' not in three
g = g.replace('<!--THREE3D-->', '<script>' + three + '</script>', 1)
open('pyaterka-legend-offline.html', 'w', encoding='utf-8').write(g)
PY

# Прототип матча в 3D: Three.js и движок игры (данные, правила, радар) встраиваются в файл
python3 -I - <<'PY'
src = open('match-lab.src.html', encoding='utf-8').read()
three = open('vendor/three.min.js', encoding='utf-8').read()
game = ''.join(open(f, encoding='utf-8').read() + '\n' for f in ('data.js', 'core.js', 'meta.js', 'radar.js'))
assert '</script' not in game.lower() and '/*GAME*/' in src
open('match-lab.html', 'w', encoding='utf-8').write(src.replace('/*THREE*/', three, 1).replace('/*GAME*/', game, 1))
PY
