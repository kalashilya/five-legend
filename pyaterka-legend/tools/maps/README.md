# Подробные карты Inferno, Ancient, Anubis

Источник геометрии — радары CS2 из открытого проекта boltobserv (`src/maps/de_*/radar.png`, MIT/GPL).
Картинки в игру не попадают: с них снимаются только проходимые зоны и ящики.

1. `git clone --depth 1 https://github.com/boltgolt/boltobserv /home/claude/boltgolt/boltobserv`
2. Узлы, проходы, маршруты и расстановки — `specs.py` (координаты в процентах радара).
3. `cd tools/maps && python3 mkmap.py` → пишет `../../radar-maps.js` и контрольные картинки `de_*_graph.png`.
4. Проверка: `node mapcheck.js Inferno 25` — узлы не у стен, проходы открыты, раунды без стрельбы сквозь стены.
   `node freeat.js Inferno x0 y0 x1 y1` — самая свободная точка в прямоугольнике (подобрать узел).
