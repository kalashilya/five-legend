#!/bin/bash
cd "$(dirname "$0")"
{ cat head.html
cat <<'X'
<script>
window.__cmErr = function (m) { var a = document.getElementById('app'); if (a && !a.dataset.ok) a.innerHTML = '<div class="card"><h2>Игра не запустилась</h2><p class="sm">Скопируйте этот текст и отправьте в чат:</p><p class="num sm" style="overflow-wrap:anywhere">' + String(m).replace(/</g, '&lt;') + '</p></div>'; };
window.addEventListener('error', function (e) { window.__cmErr((e.message || 'ошибка') + ' · строка ' + (e.lineno || '?')); });
</script>
<script>
(function () {
'use strict';
X
cat data.js core.js meta.js ui.js
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
open('reveal-lab.html', 'w', encoding='utf-8').write(src.replace('/*THREE*/', three, 1).replace('/*FLAGS*/', flags, 1).replace('/*BG*/', bg, 1))
PY
