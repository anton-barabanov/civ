## Дизайн-ревью (архитектор) — S7-1 Hot-seat, волна 1 из 6 (первая; #50/#51/#52/#54 ребейзятся поверх)

### Ключевые решения

1. **Данные**: `S.humanOrder = [0, 1, …, h-1]` (первые h слотов — люди в порядке рассадки, остальные — ИИ), `S.currentPlayer` — чей сейчас ход (индекс в S.players). `newGame(diff, opponents, humans = 1)`: total = humans + opponents ≤ 5 (как сейчас, NATIONS 6); `p.isHuman = i < humans` вместо `i === 0` (core.js:504). Одиночная игра = humans 1 — все старые пути идентичны.

2. **Конец хода** — новый экспорт `finishTurn()` (рядом с endTurn, отдельная функция):
   - если после S.currentPlayer в humanOrder есть живой человек (playerAlive) → `S.sel = null; S.currentPlayer = следующий живой; computeVision(); save(); return { handoff: S.currentPlayer };`
   - иначе полный раунд: `S.currentPlayer = первый живой из humanOrder; S.sel = null; const r = endTurn();` (тело раунда НЕ дублировать — endTurn остаётся единственным местом с парой aiDiplomacy/aiTurn), `return { handoff: humans > 1 ? S.currentPlayer : null }`.
   Сам `endTurn()` (2358-2369) НЕ менять. Кнопка «Конец хода» в app.js вызывает finishTurn(); headless-тесты продолжают звать endTurn напрямую (полный раунд).

3. **computeVision** (577-605): «текущий человек» `const cur = S.currentPlayer ?? 0;` — mark() пишет в visible + exploredOf(cur) вместо нуля. Смысл глобального буфера visible прежний: «видит текущий человек» — getVisible/buildViewModel не меняются по структуре.

4. **aiTurn** (1518-1520): `for (let i = 1; …) aiTurnOne(i);` → `for (let i = 0; i < S.players.length; i++) if (!S.players[i].isHuman) aiTurnOne(i);` — при humanOrder=[0] идентично. **aiDiplomacy** (2172-2263): циклы «от 1» (2186, 2212, 2215, 2217) — по всем игрокам с !isHuman; pendingTribute/pendingMapOffer получают поле **target** (индекс человека-адресата): оферта генерируется для случайного живого человека, показывается в UI только когда currentPlayer === target (лежит до его хода, expiry по S.turn уже есть).

5. **Победа/поражение индивидуальны** — checkVictory (2323-2356): нет живых людей → over, winner = первый живой ?? -1 (старое поведение одиночки); нет живых ИИ → при ≥2 живых людях игра продолжается (дуэль до последнего), иначе winner = живой человек; culture/space/diplomacy уже per-player — без правок. Выбывший человек: ход пропускается (next/first фильтруют playerAlive), нации/города остаются (spectate не делаем — упрощение по брифу).

6. **Экран передачи хода** (app.js): модал `#civ-handoff` — opaque full-screen поверх топбара/карты/панели, «Ход {нация, цвет-точка}. Передайте устройство», кнопка «Начать ход». При открытии: `S.sel = null` + не рисовать vm предыдущего игрока (пока открыт — renderer.draw не вызывать из refresh). Подтверждение → computeVision(); refresh(). Показ: при mount (humans>1) и после каждого finishTurn с handoff ≠ null.

7. **Дипломатия человек↔человек** — те же offerDeal/offerTechTrade/demandTribute: aiAcceptsDeal уже пропускается при `to.isHuman` (core.js:2126), сделка мгновенная по клику предлагающего (оба за столом), кулдаун TRADE_COOLDOWN общий. Список партнёров в showDiplo: вместо slice(1) — все, кроме currentPlayer.

8. **Сейв-миграция** (load): до players-forEach: `if (!Array.isArray(S.humanOrder)) S.humanOrder = [0];` `if (!Number.isInteger(S.currentPlayer)) S.currentPlayer = 0;` строка 2426 `p.isHuman = i === 0;` → `p.isHuman = S.humanOrder.includes(i);` pendingTribute/pendingMapOffer: `target ?? 0` + проверки atWar(0,…) (2410-2413) → atWar(x.target,…).

### Вычистка «игрока 0» из app.js — все точки (→ currentPlayer)
- **buildViewModel** (44): 47 explored; 49 sel.owner; 76-77 фильтр/ready юнитов; + `currentPlayer` в VM (для renderer3d.js:386 ring `u.owner === 0` → `u.owner === vm.currentPlayer`; renderer2d зависимостей не имеет).
- **onTileClick** (92): 95 explored, 97-98 bomber, 100/111-112 owner!==0, 121 mine, 127 свой город.
- **sciTotal** (138): owner 0.
- **renderTopbar** (143): 145/148/151/165 p, gold, города, legendaryCities(0); 166 S.space[0]; бейдж активной нации при humans>1.
- **renderPanel** (192): 201 stack, 210 tOwner, 226 reason, 244 atWar(0,…), 251/256/263-264 свой город/территория, 267-271 unitAvailable/techs/gold, 278 myCities.
- **onTileHover** (359): 363 explored, 370 owner===0.
- **showWorldMap** (396): 414 explored.
- **renderOver** (471): 483 winner===0 → currentPlayer; 484 fallback; 504/511/523 myCities/legends/techs.
- **showCity** (535): 547 p, 550 held, 554 resourceConnected(0), 625/646 S.space[0], 647 unitAvailable(0). Открывать только c.owner === currentPlayer.
- **showTech** (657): 660 p.
- **showDiplo** (701): 704 me; 706-707 pending только с target === currentPlayer; 735 slice(1) → все кроме cur; 737 relKey(0,i); 744-745 resourceOwned; 746-747 ключи дани `${cur}:${i}`/`${i}:${cur}`; 748 pairDeals; 760-763 strengthOf(0); 819 tributes[`0:${…}`]; 831 declareWar(pd.ai, 0); 841-847 pmBuy meP; 863-864 data-war; 872 offerPeace(0,i); 948 offerDeal(0,i,…); 968 demandTribute(0,i).
- **showReligion** (979): 983/985/986-987/1020 owner 0; 1031 declareStateReligion(0,…).
- **showGov** (1039): 1042 p; 1076 startRevolution(0,…).
- **renderElectionModal** (444): 453 fallback players[0].
- **newGameControls** (1089): + селектор «Люди за устройством: 1-4», лимит humans+opps ≤ 5 (дизейбл лишних кнопок ИИ), `newGame(diff, opps, humans)`; renderOver-рестарт (532) — humans прокинуть.

Лог-строки «для человека» в core.js (670, 990, 1202, 1311, 1329, 1336, 1379, 1385, 1391, 1412, 1471, 1474): заменить условие `i === 0`/`owner === 0` на isHuman — тексты сообщений не менять.

### Порядок правки (мерж-точки)
core.js: newGame (479-538) → finishTurn (новая, после 2369) → computeVision (577) → aiTurn (1518) → aiDiplomacy (2186-2262 + target) → checkVictory (2323) → load (2380-2449) → экспорты (2454) + debugApi (2467: finishTurn). app.js: все точки выше + handoff-модал + newGameControls. renderer3d.js:386. style.css: .civ-handoff.

### Запреты мутаций
- **cityYields (1078-1115) и cityHappiness (950-956) НЕ трогать вовсе**: строки e (`3 + Math.floor(c.pop / 2) + tradeGold`, 1113) и g (`Math.max(0, c.pop - 4)`, 953) — символ-в-символ.
- **processEconomy-хвост (1431-1437)**: пара `recomputeBorders();\n  for (const u of S.units) u.moves = …` (b) и порядок processWork → processRevolts → processDeals — без изменений.
- **endTurn (2358-2369)**: пара `aiDiplomacy();\n  aiTurn();` (d) и порядок вызовов — дословно; раунд вызывать через endTurn(), не копировать.
- declareWar purge-блок resDeals (1975-1978, j), cooldown-строка (2061, f), mapValue (2023, l), 0.6-порог (2303, k), democracy 1.25 (973, m), road-cost (628, i), granary/pyramids-строки (a/c) — не задеты.

### Тест-сценарии (headless, debugApi)
1. newGame(1, 2, 2): humanOrder=[0,1], isHuman у 0 и 1; finishTurn() → handoff 1; explored игрока 1 изолирован (город/юниты 0 не видны при cur=1).
2. Сделка двух людей offerDeal(0,1,…): проходит без aiAcceptsDeal, золото/техи переведены, кулдаун установлен.
3. Выбытие человека: снести города/юниты игрока 1 → finishTurn пропускает его (handoff нет, сразу раунд).
4. Победа второго человека: space-части игроку 1 → S.over.winner = 1.
5. Миграция: сейв без humanOrder/currentPlayer → load() даёт [0]/0, isHuman по humanOrder, pending*.target = 0.
6. Одиночка: newGame(1,2,1) → finishTurn ≡ endTurn (handoff null), полный suite без регрессий.

### Риски
- Крупнейшая регрессионная поверхность спринта (весь UI) — обязательный ручной прогон вдвоём + одиночка.
- Утечка S.sel между людьми — чистить в finishTurn И при открытии handoff-модала.
- Слот pending-оффер один на игру: за раунд ИИ адресует максимум одного человека — задокументировать (иначе долги перед каждым).
