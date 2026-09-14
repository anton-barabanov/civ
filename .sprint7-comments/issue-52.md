## Дизайн-ревью (архитектор) — S7-4 Контент, волна 3 из 6 (после #50; #51 ребейзится — обе TECHS-append). Отступления от тела issue согласованы: 3+1 чудо вместо 3-4 с новыми механиками — счастье/GP-очки/анти-анархия НЕ вводятся (только существующие поля + freeUnits по образцу freeTech и два новых агрегата playerEffects по одной строке); 2 техи вместо 5-7 — консервативный добор, остальное в следующих спринтах.

### Ключевые решения

1. **WONDERS — 4 записи, append в конец (после worldcouncil:70), существующие строки не переформатировать**:
   - `gardens: { name: "Висячие сады", icon: "🌿", cost: 170, tech: "mathematics", desc: "+2 еды во всех городах", effects: { foodFlat: 2 } }`
   - `artemis: { name: "Храм Артемиды", icon: "🦌", cost: 180, tech: "construction", desc: "+2 культуры во всех городах", effects: { culture: 2 } }`
   - `terracotta: { name: "Терракотовая армия", icon: "🏺", cost: 200, tech: "bureaucracy", desc: "3 бесплатных мечника при завершении", effects: { freeUnits: { id: "swordsman", n: 3 } } }` (вместо воинов — мечники: к эре bureaucracy воины мусорные; поле то же, при плейтесте можно понизить до warrior)
   - `lighthouse: { name: "Маяк Александрийский", icon: "🗼", cost: 190, tech: "compass", desc: "+50% золотого дохода от морской торговли во всех городах", effects: { tradeMult: 1.5 } }` — нулевой новый код (playerEffects.tradeMult уже агрегируется, cityYields перемножает).

2. **TECHS — 2 записи, append в конец (после flight:108)**:
   - `bureaucracy: { name: "Государственное управление", cost: 200, req: ["banking", "education"] }` — открывает Терракотовую армию, мостик рядом с democracy (160).
   - `compass: { name: "Компас", cost: 150, req: ["astronomy"] }` — открывает Маяк; движение кораблей НЕ трогаем (по брифу — пассив-разблокировка, механик ноль).
   Ацикличность/достижимость: оба req — существующие техи, новых рёбер вниз нет; общий тест дерева уже generic.

3. **Эффекты — три точки, все вне мутационных строк**:
   - **playerEffects** (958-975): в init объекта e добавить `foodFlat: 0, culture: 0`; в цикл чудес добавить `e.foodFlat += f.foodFlat || 0;` и `e.culture += f.culture || 0;` Блок gov/anarchy (971-973, мутация m) не трогать.
   - **cityYields** (1105): после `food += e.foodFlat;` добавить строку `food += pe.foodFlat || 0;` (pe вычислен в 1104). Строку gold (1113, мутация e) НЕ трогать.
   - **processEconomy** (1318): cultGrowth — добавить `(pe.culture || 0)` и объявить `const pe = playerEffects(c.owner);` рядом с e (1317). Строку менять только вставкой члена, порядок остальных не трогать.
   - **freeUnits**: ветка завершения чуда в processEconomy (1355-1369), рядом с freeTech (1364-1367): `if (def.effects.freeUnits) { const fu = def.effects.freeUnits; for (let i = 0; i < fu.n; i++) spawn(fu.id, c.owner, c.x, c.y); addLog(\`${def.name}: ${fu.n} ${UNITS[fu.id].name} вступают в строй ${c.name}\`); }` — как и freeTech, в playerEffects не агрегируется (одноразовое событие).

4. **UI**: showCity wonderOpts (566-575) и showTech (669-677) перечисляют данные автоматически — app.js НЕ менять. models3d.createWonderMesh — switch по id (430): добавить 4 кейса из примитивов (сады — терраса+зелень, храм — колоннада (переиспользовать приёмы greatlibrary), терракотовая — шеренга фигурок (addFigure), маяк — башня+огонь); renderer3d уже вызывает createWonderMesh(wonder) для c.wonders[0] (434).

### Порядок правки (мерж-точки)
core.js: WONDERS append (64-71) → TECHS append (79-109) → playerEffects (958-966) → cityYields (1105) → processEconomy (1317-1320, 1364+) → ВСЁ. models3d.js: createWonderMesh 4 кейса. app.js — ноль правок (критерий issue «новые данные только в таблицах»).

### Запреты мутаций
- **TECHS/WONDERS/UNITS append-only**: существующие записи не переформатировать — гранка `foodFlat: 2` (a, BUILDINGS:52) и пирамиды `prodFlat: 2` (c, WONDERS:65) байт-в-байт.
- playerEffects: вставки агрегатов ВНУТРИ цикла чудес, строку `else if (gov.government === "democracy") e.sciMult *= 1.25;` (973, m) не трогать.
- cityYields: только новая строка после `food += e.foodFlat;`; золотая строка (1113, e) и сортировка cand — дословно.
- processEconomy: правка cultGrowth (1318) — вставка члена, остальная функция (b-пара 1431-1432, порядок хвоста) не меняется.

### Тест-сценарии (headless)
1. Таблицы: 4 новых WONDERS с валидными tech/эффектами; 2 новых TECHS с req из существующих; req-ацикличность всего дерева; стоимости в коридоре 150-200.
2. Сады: построить (S.wonders push) → cityYields всех городов владельца +2 еды (проверить food арифметикой, не снапшотом).
3. Артемида: +2 в cultGrowth → культура города растёт на +2/ход, gpPoints быстрее.
4. Маяк: tradeGold города с tradeActive × 1.5 (в дополнение к колоссу — перемножение pe.tradeMult).
5. Терракотовая: город с prodStored ≥ cost + producing wonder → processEconomy → +3 мечника владельца в клетке города, лог записан.
6. Чудеса уникальны глобально: второй игрок строит то же чудо → «уже построено», 50% возврат (существующая ветка 1356-1359).

### Риски
- Баланс foodFlat+2: с амбаром(+2)+садами(+2) луга-город растёт быстро — при плейтесте понизить сады до +1 (поле то же).
- createWonderMesh-кейсы: гео-кэш `geo("w:…")` — не переиспользовать имена существующих ключей.
