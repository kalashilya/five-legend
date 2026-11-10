# Пятёрка Легенд (five-legend)

```
Проекты игр по CS2
==================

pyaterka-legend/  — «Пятёрка Легенд», коллекционная карточная игра (текущая)
  pyaterka-legend-offline.html  готовая игра, открывается двойным щелчком в браузере
  photos/     сюда кладутся фото игроков; имена файлов — в photos/_имена_файлов.txt
  head.html   стили, сцена за интерфейсом и разметка
  data.js     база: 101 команда и 500 игроков (сгенерирована gen.js)
  core.js     логика: карточки, кейсы, состав, матч до 13 побед, экономика
  meta.js     сохранения, составы, контракты, задания, сезоны и прогресс
  ui.js       интерфейс: лобби, вскрытие кейса, матч в реальном времени, звук
  gen.js      генератор data.js из teams.txt и hltv-data.json (node gen.js)
  teams.txt   топ-101 команд из рейтинга Valve от 2 ноября 2026
  hltv-data.json проверенный снимок HLTV за 12 и 3 месяца (пока 15 игроков)
  test.js     проверка игровой логики и баланса (bash build.sh && node test.js)
  browser-smoke.js headless-проверка запуска HTML в Chromium на мобильном viewport
  build.sh    сборка одного HTML-файла из head.html, data.js, core.js, meta.js, ui.js (bash build.sh)

  После правок в head.html, data.js, core.js, meta.js или ui.js нужно запустить build.sh,
  иначе pyaterka-legend-offline.html останется прежним.

klatch-manager/  — «Клатч Менеджер», менеджер команды (первая версия, отложена)
  clutch-manager-offline.html  готовая игра
  engine.js   симуляция раундов, матч, карьера
  ui.js       интерфейс и карта матча
  head.html   стили и разметка
  test.js     проверка баланса (node test.js)

Для запуска игр ничего устанавливать не нужно.
Для gen.js, test.js и build.sh нужны Node.js и bash.
15 карточек используют проверенные показатели HLTV; остальные пока предварительные. Методика: docs/HLTV_DATA_PIPELINE.md. Методика: docs/HLTV_DATA_PIPELINE.md.
Игра работает без сервера: прогресс хранится в браузере игрока.
```
