## Дизайн-ревью (архитектор) — S7-2 Варвары, волна 2 из 6 (СТРОГО после #49: общий computeVision/buildViewModel — ребейз)

### Ключевые решения

1. **Представление**: спец-владелец `const BARB_ID = 99` (core.js, рядом с PEACE_WAR_LEN:46) — юниты `S.units` с owner 99; В S.players НЕ добавляется (не ломает индексацию relations/выборы/победы — всё итерирует S.players). Константы `BARB_NAME = "Варвары"`, `BARB_COLOR = "#a05a2c"`, в экспорты.
2. **Гварды от краша по S.players[owner]**:
   - `atWar` (1959): первой строкой `if (i === BARB_ID || j === BARB_ID) return i !== j;` — вечная война со всеми, дипломатией варвары не занимаются (offerDeal/demandTribute до них не доходят: цели только из S.players).
   - `computeVision` (596): в цикле юнитов пропускать owner 99 (у варваров нет разведки, иначе exploredOf(99) = undefined → краш).
   - playerAlive/strengthOf/councilSupport/processRevolts/aiDiplomacy — итерируют S.players, 99 не попадает. Военные циклы aiTurnOne видят варваров через atWar → ИИ защищается от них автоматически (фича).
   - buildViewModel (app.js): в vm.players добавить слот 99 `{ color: BARB_COLOR }` — renderer3d красит юниты/города по vm.players[u.owner].color (renderer3d.js:363, 434) — без слота краш.
3. **Лагеря**: `S.camps = [{ id, x, y, nextSpawn }]`; генерация в newGame ПОСЛЕ спавна стартов (535), ДО computeVision: `placeCamps()` — 3-5 лагерей по сложности (easy 3 / normal 4 / hard 5): passable суша, Chebyshev dist ≥ 6 от каждого старта, ≥ 5 между лагерями, внутри сухопутных компонент ≥ 25 клеток (floodComponents уже есть). При создании лагерь спавнит 1 воина-охранника (owner 99). tileOwner не трогаем (лагерь — фича, не владение). Новых лагерей после старта НЕ создаём (упрощение; критерий «вне видимости» выполняется тривиально).
4. **Спавн рейдеров** — в barbarianTurn(): каждый лагерь каждые SPAWN_TURN ходов (easy 12 / normal 8 / hard 6, счётчик nextSpawn) рождает 1 юнита; эра — по медиане числа изученных тех по всем игрокам: < 6 → "warrior"; < 11 → случайно warrior/horseman/archer; ≥ 11 → musketman/knight. Спавн через spawn() (без unitAvailable — варварам ресурсы не нужны). Антизатоп: не спавнить, если в радиусе 2 лагеря уже ≥ 3 варваров.
5. **Поведение** `barbarianTurn()` (новая, рядом с aiTurn): для каждого юнита owner 99: ближайшая цель (юнит любого игрока или город) в радиусе 4 → stepToward, при смежности attack (работает через atWar(99, x) = true); цели нет и юнит в радиусе 2 от своего лагеря → стоит (moves 0); иначе возвращается к лагерю. **Осада без захвата**: варвар на клетке города без защитников-юнитов владельца → грабёж `c.pop = Math.max(1, c.pop - 1)` при `S.turn - (c.sackedTurn ?? 0) >= 3` (кулдаун), лог «Варвары разграбили {город} (−1 нас.)», владелец НЕ меняется. Для этого ветка захвата в moveUnit (659) получает гейт `u.owner !== BARB_ID`.
6. **Награда**: в moveUnit после перемещения — если не-варвар встал на клетку лагеря и на ней нет живых варваров → `clearCamp(owner, camp)`: лагерь удалён, `gold += 50 + 10 * Math.floor(S.turn / 50)`, разведка exploredOf(owner) радиус 2 вокруг, лог «Разграблен лагерь варваров: +N🪙».
7. **Отрисовка**: vm.camps = [{x, y}] только на explored-клетках (+visible для «живого» вида); renderer3d — ruin-меш нового `models3d.createCampMesh()` (шатёр/кольцо камней из примитивов, без ассетов), уровень отрисовки — слой улучшений (под юнитами, над рельефом); тултип onTileHover: строка «⛺ Лагерь варваров» (только explored). Юниты-варвары идут через общий конвейер vm.units (слот players[99] даёт цвет).

### Порядок правки (мерж-точки)
core.js: BARB_* константы (49) → atWar (1959) → computeVision (596) → moveUnit (648-662: гейт захвата, грабёж, clearCamp) → newGame: S.camps в состояние (519) + placeCamps() после 535 → barbarianTurn/placeCamps/clearCamp (новые, после aiTurnOne) → endTurn: ОДНА строка `  barbarianTurn();` СТРОГО после `  aiTurn();` (2361) → load(): `if (!Array.isArray(S.camps)) S.camps = [];` + в cities-цикл (2415) `if (typeof c.sackedTurn !== "number") c.sackedTurn = 0;` (старые сейвы остаются без лагерей — сознательно) → экспорты + debugApi (barbarianTurn, placeCamps, BARB_ID, S.camps). app.js: buildViewModel (camps + players[99]), onTileHover. renderer3d.js + models3d.js: createCampMesh и вызов в слое улучшений.

### Запреты мутаций
- **processEconomy НЕ трогать вообще** — в #50 нет ни одной вставки в него: пара recomputeBorders+moves (b) и хвост processDeals святы. Спавн-таймеры живут в barbarianTurn (endTurn), НЕ в processEconomy. Вставки в конец processEconomy (после processDeals) запрещены здесь тоже — не нужны.
- **endTurn**: только строка `barbarianTurn();` после `aiTurn();` — пара `aiDiplomacy();\n  aiTurn();` (мутация d) обязана остаться дословной (вставка ПОСЛЕ пары replace-цель не рвёт, пару не редактировать).
- reachable (628, i), тело attack (676-719), declareWar purge-блок (1975-1978, j), cityYields/cityHappiness (e/g) — не задеты.
- computeVision: фильтр варваров в цикле юнитов (596), тело mark() не менять (наследует cur из #49).

### Тест-сценарии (headless)
1. newGame(1,2): S.camps.length = 4 (normal); все лагеря — passable суша, dist ≥ 6 от стартов.
2. Спавн: N вызовов barbarianTurn → у лагеря появляются юниты owner 99 с интервалом по сложности (8/12/6).
3. Набег: юнит игрока в радиусе 4 → barbarianTurn → варвар сместился к цели/атаковал; вне радиуса 4 — остался у лагеря.
4. Осада: город без гарнизона, варвар входит → pop −1, владелец НЕ сменился, повтор не раньше 3 ходов (sackedTurn).
5. Награда: юнит на клетке лагеря без охраны → gold +50+10*floor(turn/50), лагерь удалён, explored радиус 2, лог есть.
6. Изоляция/совместимость: endTurn с лагерями не падает (computeVision пропускает 99, vm.players[99] есть), выборы/победы варваров не считают, ИИ атакует варваров при контакте; hot-seat (#49): варвары видны каждому человеку по его visible.

### Риски
- Краш-поверхность owner 99 по всем индексациям S.players[u.owner]: после реализации — grep `\.owner` по core.js/app.js/renderer*.js (известные точки перечислены, проверить все).
- Баланс: 3-5 лагерей × спавн/8 ходов; крутить интервал, а не число лагерей.
- Тесты с Math.random (спавн-эра): фиксировать Math.random по образцу run.mjs:208-217.
