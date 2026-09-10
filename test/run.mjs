const fakeEl = () => {
  const listeners = {};
  return {
    innerHTML: "",
    onclick: null,
    style: {},
    handlers: listeners,
    addEventListener(t, fn) { listeners[t] = fn; },
    removeEventListener() {},
    remove() {},
    appendChild() {},
    querySelectorAll: () => [],
    getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 884, height: 612 }),
    width: 884,
    height: 612,
  };
};

globalThis.document = {
  getElementById: () => fakeEl(),
  createElement: () => fakeEl(),
  appendChild: () => {},
};
globalThis.window = {};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const t0 = Date.now();

const { execSync, spawnSync } = await import("node:child_process");
const { writeFileSync, readFileSync } = await import("node:fs");
execSync("rm -rf /tmp/civmod && mkdir -p /tmp/civmod");
execSync("cp apps/civ/*.js /tmp/civmod/");
writeFileSync("/tmp/civmod/package.json", '{"type":"module"}');

const mutation = ["a", "b", "c", "d"].includes(process.env.CIV_MUTATION) ? process.env.CIV_MUTATION : null;
const fast = !!process.env.CIV_FAST;
const MUT_TARGETS = {
  a: ["foodFlat: 2", "foodFlat: 0"],
  b: ["  recomputeBorders();\n  for (const u of S.units) u.moves = UNITS[u.type].moves;", "  for (const u of S.units) u.moves = UNITS[u.type].moves;"],
  c: ['"+2 производства во всех городах", effects: { prodFlat: 2 }', '"+2 производства во всех городах", effects: { prodFlat: 0 }'],
  d: ["  aiDiplomacy();\n  aiTurn();", "  aiTurn();"],
};
if (mutation) {
  const src = readFileSync("/tmp/civmod/core.js", "utf8");
  const [from, to] = MUT_TARGETS[mutation];
  if (!src.includes(from)) {
    console.log(`FAIL mutation ${mutation} target not found in core.js copy`);
    process.exit(2);
  }
  writeFileSync("/tmp/civmod/core.js", src.replace(from, to));
}

const { civApp, debugApi } = await import("/tmp/civmod/app.js");
const api = debugApi();

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log("ok  ", name);
  else { failures++; console.log("FAIL", name); }
};

const root = fakeEl();
civApp.mount(root, { back: () => {} });

check("map generated", api.S.map.length === 26 * 18);

const flood = (map, start, isClass) => {
  const seen = new Set([start]);
  const stack = [start];
  let edge = false;
  while (stack.length) {
    const j = stack.pop();
    const x = j % 26, y = (j / 26) | 0;
    if (x === 0 || y === 0 || x === 25 || y === 17) edge = true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= 26 || ny >= 18) continue;
      const k = ny * 26 + nx;
      if (!seen.has(k) && isClass(map[k])) { seen.add(k); stack.push(k); }
    }
  }
  return { cells: [...seen], edge };
};

const allComps = (map, isClass) => {
  const seen = new Set();
  const out = [];
  for (let i = 0; i < map.length; i++) {
    if (seen.has(i) || !isClass(map[i])) continue;
    const c = flood(map, i, isClass);
    c.cells.forEach((x) => seen.add(x));
    out.push(c);
  }
  return out;
};

const waterComps = allComps(api.S.map, (t) => t === 0);
const landComps = allComps(api.S.map, (t) => t !== 0).sort((a, b) => b.cells.length - a.cells.length);
const oceanFrac = api.S.map.filter((t) => t === 0).length / api.S.map.length;
check("no enclosed puddles", waterComps.every((c) => c.edge || c.cells.length >= 6));
check("multiple continents", landComps.length >= 2);
check("largest continent size", landComps[0] && landComps[0].cells.length >= 45);
check("ocean fraction sane", oceanFrac > 0.25 && oceanFrac < 0.8);

const fish = api.S.res.filter((r) => r === "fish").length;
const whale = api.S.res.filter((r) => r === "whale").length;
check("sea resources scattered", fish > 3 && whale >= 0);

const start0 = api.S.units.find((u) => u.owner === 0);
const start1 = api.S.units.find((u) => u.owner === 1);
const compOf = (x, y) => landComps.findIndex((c) => c.cells.includes(y * 26 + x));
check("starts on different continents", compOf(start0.x, start0.y) !== compOf(start1.x, start1.y));

check("4 starting units", api.S.units.length === 4);
check("exploration started", api.S.explored.some((e) => e === 1));
check("no cities yet", api.S.cities.length === 0);

{
  let genBad = null;
  for (let g = 0; g < 20 && !genBad; g++) {
    api.newGame(1);
    const comps = allComps(api.S.map, (t) => t !== 0).filter((c) => c.cells.length >= 25);
    if (!comps.length) { genBad = "no large continent"; break; }
    for (const comp of comps)
      for (const id of ["iron", "horses", "marble"])
        if (!comp.cells.some((i) => api.S.res[i] === id)) { genBad = `no ${id} on continent of ${comp.cells.length}`; break; }
    if (genBad) break;
    for (let i = 0; i < api.S.res.length; i++) {
      const r = api.S.res[i];
      if (r !== "iron" && r !== "horses" && r !== "marble") continue;
      if (api.S.map[i] === 0 || api.S.map[i] === 5) { genBad = "land resource on bad tile"; break; }
    }
  }
  check("land resources guaranteed on every large continent", genBad === null);
  const bigComps = allComps(api.S.map, (t) => t !== 0).filter((c) => c.cells.length >= 25);
  const minNeed = Math.max(1, bigComps.length);
  const cntRes = (id) => api.S.res.filter((r) => r === id).length;
  check("land resource counts cover all continents", ["iron", "horses", "marble"].every((id) => cntRes(id) >= minNeed) &&
    ["iron", "horses", "marble"].every((id) => cntRes(id) <= 20));
  check("RESOURCES table exposed via debugApi", !!api.RESOURCES &&
    ["iron", "horses", "marble", "fish", "whale"].every((id) => api.RESOURCES[id] && api.RESOURCES[id].name && api.RESOURCES[id].icon));
}

let coastal = null;
for (let i = 0; i < api.S.map.length; i++) {
  const x = i % 26, y = (i / 26) | 0;
  if (api.S.map[i] === 0 || api.S.map[i] === 5) continue;
  const hasWater = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => {
    const nx = x + dx, ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && api.S.map[ny * 26 + nx] === 0;
  });
  if (hasWater) { coastal = [x, y]; break; }
}
check("coastal tile found", coastal !== null);
if (coastal) {
  const w = api.spawn("warrior", 0, coastal[0], coastal[1]);
  const allSea = [[1,0],[-1,0],[0,1],[0,-1]]
    .map(([dx, dy]) => [coastal[0] + dx, coastal[1] + dy])
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && api.S.map[ny * 26 + nx] === 0);
  const seaCand = allSea.filter(([nx, ny]) => [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => {
    const wx = nx + dx, wy = ny + dy;
    return wx >= 0 && wy >= 0 && wx < 26 && wy < 18 && api.S.map[wy * 26 + wx] === 0;
  }));
  const r = api.reachable(w);
  check("land unit cannot enter empty water", allSea.length > 0 && ![...r.keys()].some((k) => api.S.map[k] === 0));
  const seaKey = seaCand.length ? seaCand[0][1] * 26 + seaCand[0][0] : -1;
  if (seaKey >= 0) {
    const galley = api.spawn("galley", 0, seaCand[0][0], seaCand[0][1]);
    const gr = api.reachable(galley);
    const hasSea = [...gr.keys()].some((k) => api.S.map[k] === 0);
    const hasLand = [...gr.keys()].some((k) => api.S.map[k] !== 0);
    if (!(api.isNaval(galley) && hasSea && !hasLand)) {
      console.log("dbg galley:", JSON.stringify({
        seaKey, mapAtSea: api.S.map[seaKey],
        keys: [...gr.keys()],
        terr: [...gr.keys()].map((k) => api.S.map[k]),
      }));
    }
    check("galley sails only on water", api.isNaval(galley) && hasSea && !hasLand);
    check("land unit can board own ship", api.reachable(w).has(seaKey));
    api.moveUnit(w, seaCand[0][0], seaCand[0][1]);
    check("unit boards ship", w.x === seaCand[0][0] && w.y === seaCand[0][1]);
    const w2 = api.spawn("warrior", 0, coastal[0], coastal[1]);
    api.moveUnit(w2, seaCand[0][0], seaCand[0][1]);
    check("second unit boards ship", w2.x === seaCand[0][0] && w2.y === seaCand[0][1]);
    const w3 = api.spawn("warrior", 0, coastal[0], coastal[1]);
    check("galley capacity 2 rejects third unit", !api.reachable(w3).has(seaKey));
    const nextSea = [[1,0],[-1,0],[0,1],[0,-1]]
      .map(([dx, dy]) => [seaCand[0][0] + dx, seaCand[0][1] + dy])
      .find(([nx, ny]) => nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && api.S.map[ny * 26 + nx] === 0);
    api.moveUnit(galley, nextSea[0], nextSea[1]);
    check("ship carries passengers", w.x === nextSea[0] && w.y === nextSea[1] && w2.x === nextSea[0] && w2.y === nextSea[1]);
    api.moveUnit(galley, seaCand[0][0], seaCand[0][1]);
    w.moves = 1;
    check("passenger can disembark to shore", api.reachable(w).has(coastal[1] * 26 + coastal[0]));
    api.moveUnit(w, coastal[0], coastal[1]);
    check("passenger lands on shore", w.x === coastal[0] && w.y === coastal[1]);
    const origRandom = Math.random;
    Math.random = () => 0;
    try {
      const killer = api.spawn("catapult", 1, coastal[0], coastal[1]);
      api.declareWar(0, 1);
      api.attack(killer, galley.x, galley.y);
      check("ship death drowns passengers", !api.S.units.includes(galley) && !api.S.units.includes(w2) &&
        api.S.log.some((l) => l.includes("утонули")));
    } finally {
      Math.random = origRandom;
      api.makePeace(0, 1);
    }
  }
}

const settler = api.S.units.find((u) => u.owner === 0 && u.type === "settler");
api.foundCity(settler);
check("city founded", api.S.cities.length === 1 && api.S.cities[0].owner === 0);
api.foundCity(api.spawn("settler", 0, settler.x + 1, settler.y + 1));

for (let i = 0; i < 30; i++) {
  api.endTurn();
}
check("game stable after 30 turns", api.S.turn === 31 || !!api.S.over);
check("AI founded cities", api.S.cities.some((c) => c.owner === 1));
check("AI research started", api.S.players[1].techs.length >= 1 || api.S.players[1].researching !== null);

api.S.players[0].researching = "agriculture";
api.S.players[0].gold = 500;
api.S.units = api.S.units.filter((u) => u.owner === 0);
for (let i = 0; i < 15 && !api.S.players[0].techs.includes("agriculture"); i++) {
  api.S.over = null;
  if (!api.S.cities.some((c) => c.owner === 0)) {
    let li = -1;
    for (let j = 0; j < api.S.map.length; j++) {
      const x = j % 26, y = (j / 26) | 0;
      if (api.S.map[j] !== 0 && !api.S.cities.some((c) => c.x === x && c.y === y)) { li = j; break; }
    }
    if (li >= 0) api.foundCity(api.spawn("settler", 0, li % 26, (li / 26) | 0));
  }
  api.endTurn();
}
check("player research completes", api.S.players[0].techs.length >= 1);

const city = api.S.cities.find((c) => c.owner === 0);
if (city) {
  city.producing = { k: "unit", id: "warrior" };
  city.prodStored = 999;
  api.processEconomy();
  check("unit produced", api.S.units.some((u) => u.owner === 0 && u.type === "warrior"));

  const p0 = api.S.players[0];
  p0.techs.push("archery", "iron", "pottery", "writing", "masonry", "bronze");
  const y = api.cityYields(city);
  check("city yields sane", y.food >= 2 && y.prod >= 1 && y.sci >= 2 && y.gold >= 2 && y.tradeGold >= 0);
} else {
  console.log("info", "player eliminated before production test");
}

const w1 = api.S.units.find((u) => u.owner === 0 && u.type === "warrior");
const enemy = api.spawn("settler", 1, w1.x + 1, w1.y);
w1.moves = 1;
api.declareWar(0, 1);
api.attack(w1, enemy.x, enemy.y);
check("combat resolved", !api.S.units.includes(enemy) || !api.S.units.includes(w1));

const aiCity = api.S.cities.find((c) => c.owner === 1);
if (aiCity) {
  api.S.cities.filter((c) => c.owner === 1).forEach((c) => { c.owner = 0; });
  api.endTurn();
  console.log("info", "victory check ran");
}

api.S.players[0].techs.push("sailing");
api.S.over = null;
const wcComps = allComps(api.S.map, (t) => t === 0);
const wcId = new Map();
wcComps.forEach((c, i) => c.cells.forEach((k) => wcId.set(k, i)));
const byComp = new Map();
for (let i = 0; i < api.S.map.length; i++) {
  const x = i % 26, y = (i / 26) | 0;
  if (api.S.map[i] === 0) continue;
  if (api.S.cities.some((c) => c.x === x && c.y === y)) continue;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= 26 || ny >= 18) continue;
    const k = ny * 26 + nx;
    if (api.S.map[k] !== 0) continue;
    const id = wcId.get(k);
    if (!byComp.has(id)) byComp.set(id, []);
    byComp.get(id).push([x, y]);
    break;
  }
}
let pair = null;
for (const [, tiles] of byComp) {
  if (tiles.length >= 2) { pair = [tiles[0], tiles[1]]; break; }
}
if (pair) {
  for (const ct of pair) api.foundCity(api.spawn("settler", 0, ct[0], ct[1]));
  const traded = api.S.cities.filter((c) => c.owner === 0 && api.tradeActive(c));
  check("sea trade between coastal cities", traded.length >= 2);
  if (traded[0]) {
    const yy = api.cityYields(traded[0]);
    check("sea trade bonus applied", yy.trade === true && yy.tradeGold >= 2 &&
      yy.gold === 3 + Math.floor(traded[0].pop / 2) + yy.tradeGold);
    traded[0].buildings.push("market");
    const ym = api.cityYields(traded[0]);
    check("market doubles sea trade", ym.tradeGold === yy.tradeGold * 2 && ym.gold === yy.gold + yy.tradeGold &&
      ym.prod === yy.prod && ym.sci === yy.sci);
  }
} else {
  check("sea trade between coastal cities", false);
}

civApp.mount(root, { back: () => {} });
check("remount ok", api.S.map.length === 26 * 18);

api.newGame(2);
check("difficulty stored", api.S.difficulty === 2);
const aiSettler = api.S.units.find((u) => u.owner === 1 && u.type === "settler");
api.foundCity(aiSettler);
const diffCity = api.S.cities.find((c) => c.owner === 1);
diffCity.producing = null;
api.S.difficulty = 0;
diffCity.prodStored = 0;
api.processEconomy();
const prodEasy = diffCity.prodStored;
api.S.difficulty = 2;
diffCity.prodStored = 0;
diffCity.pop = 1;
api.processEconomy();
const prodHard = diffCity.prodStored;
check("difficulty scales AI economy", prodHard > prodEasy);

api.newGame(1);
check("tileOwner init neutral", Array.isArray(api.S.tileOwner) && api.S.tileOwner.length === 26 * 18 && api.S.tileOwner.every((o) => o === -1));

const bSettler = api.S.units.find((u) => u.owner === 0 && u.type === "settler");
check("foundCity returns true", api.foundCity(bSettler) === true);
const bc = api.S.cities[0];
let ringOk = api.getTileOwner()[bc.y * 26 + bc.x] === 0;
for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
  const nx = bc.x + dx, ny = bc.y + dy;
  if (nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && api.getTileOwner()[ny * 26 + nx] !== 0) ringOk = false;
}
check("new city owns radius 1", ringOk);

bc.pop = 4;
api.recomputeBorders();
const own4 = api.getTileOwner();
const dist2 = [[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,-2],[2,-2],[-2,2]]
  .map(([dx, dy]) => [bc.x + dx, bc.y + dy])
  .filter(([x, y]) => x >= 0 && y >= 0 && x < 26 && y < 18);
check("pop 4 radius 2", dist2.length > 0 && dist2.every(([x, y]) => own4[y * 26 + x] === 0));

bc.pop = 1;
bc.culture = 80;
api.recomputeBorders();
const ownC = api.getTileOwner();
const dist3 = [[3,0],[-3,0],[0,3],[0,-3],[3,3],[-3,-3]]
  .map(([dx, dy]) => [bc.x + dx, bc.y + dy])
  .filter(([x, y]) => x >= 0 && y >= 0 && x < 26 && y < 18);
check("culture 80 radius 3", dist3.length > 0 && dist3.every(([x, y]) => ownC[y * 26 + x] === 0));
check("cityRadius formula", api.cityRadius({ pop: 1, culture: 0 }) === 1 && api.cityRadius({ pop: 10, culture: 500 }) === 4);

api.newGame(1);
api.foundCity(api.spawn("settler", 0, 5, 5));
api.foundCity(api.spawn("settler", 1, 7, 5));
const cityA = api.S.cities.find((c) => c.owner === 0);
const cityB = api.S.cities.find((c) => c.owner === 1);
cityB.culture = 80;
api.recomputeBorders();
const ownX = api.getTileOwner();
check("border conflict resolved", ownX[5 * 26 + 5] === 0 && ownX[5 * 26 + 7] === 1 && ownX[4 * 26 + 6] === 1 && ownX[4 * 26 + 4] === 0);

const citiesBefore = api.S.cities.length;
const p0 = api.spawn("settler", 0, 6, 6);
const p1 = api.spawn("settler", 1, 4, 5);
check("foundCity rejected on foreign soil", api.foundCity(p0) === false && api.foundCity(p1) === false);
check("settler not consumed on reject", api.S.cities.length === citiesBefore && api.S.units.includes(p0) && api.S.units.includes(p1));

cityA.pop = 5;
cityA.culture = 0;
for (const [x, y] of [[4,4],[4,5],[4,6],[5,4],[5,6],[5,5]]) api.S.map[y * 26 + x] = 1;
for (const [x, y] of [[6,4],[6,5],[6,6]]) api.S.map[y * 26 + x] = 3;
for (let y = 4; y <= 6; y++)
  for (let x = 4; x <= 6; x++) api.S.res[y * 26 + x] = null;
const yF = api.cityYields(cityA);
api.S.cities = api.S.cities.filter((c) => c !== cityB);
api.recomputeBorders();
const yU = api.cityYields(cityA);
check("cityYields filters foreign tiles", yF.food === 12 && yF.prod === 1 && yU.food === 9 && yU.prod === 7);

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
delete api.S.tileOwner;
for (const c of api.S.cities) delete c.culture;
api.save();
const rawOld = JSON.parse(store["civ1_save"]);
check("old save serialized without borders", !("tileOwner" in rawOld) && rawOld.cities.every((c) => !("culture" in c)));
check("old save migrates on load", api.load() === true);
const ownMig = api.getTileOwner();
check("migration restores borders", Array.isArray(api.S.tileOwner) && api.S.tileOwner.length === 26 * 18 &&
  api.S.cities.every((c) => c.culture === 0) && api.S.cities.every((c) => ownMig[c.y * 26 + c.x] === c.owner));
check("migration restores radius 1 borders", api.S.cities.every((c) => {
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
    const nx = c.x + dx, ny = c.y + dy;
    if (nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && ownMig[ny * 26 + nx] === -1) return false;
  }
  return true;
}));
api.save();
const rawNew = JSON.parse(store["civ1_save"]);
check("tileOwner serialized as array", Array.isArray(rawNew.tileOwner) && rawNew.tileOwner.length === 26 * 18);
check("save-load roundtrip borders", api.load() === true && api.getTileOwner().join(",") === rawNew.tileOwner.join(","));
for (let i = 0; i < 10; i++) api.endTurn();
check("stable after migration + 10 turns", Array.isArray(api.S.tileOwner) && (api.S.turn === 11 || !!api.S.over));

api.newGame(1);
const TT = api.TECHS, UT = api.UNITS, BT = api.BUILDINGS;
check("debugApi exposes tables", !!(TT && UT && BT && BT.aqueduct.effects.maxPop === 3));

const techIds = Object.keys(TT);
const reqsValid = techIds.every((id) => TT[id].req.every((r) => techIds.includes(r)));
const color = {};
let cycle = false;
const dfs = (id) => {
  color[id] = 1;
  for (const r of TT[id].req) {
    if (color[r] === 1) cycle = true;
    else if (!color[r]) dfs(r);
  }
  color[id] = 2;
};
techIds.forEach((id) => { if (!color[id]) dfs(id); });
const roots = techIds.filter((id) => TT[id].req.length === 0);
const reach = new Set(roots);
const q = [...roots];
while (q.length) {
  const cur = q.pop();
  for (const id of techIds) if (TT[id].req.includes(cur) && !reach.has(id)) { reach.add(id); q.push(id); }
}
check("tech tree acyclic, reqs valid", reqsValid && !cycle);
check("tech tree fully reachable from roots", roots.length > 0 && reach.size === techIds.length);
check("9 new techs added", ["mysticism", "horsebackriding", "monarchy", "feudalism", "engineering", "machinery", "banking", "education", "gunpowder"].every((t) => TT[t] && TT[t].cost > 0 && TT[t].name));
check("5 new units added", ["spearman", "horseman", "catapult", "knight", "musketman"].every((u) => UT[u] && UT[u].atk > 0 && UT[u].icon && UT[u].cost > 0));
check("5 new buildings have effects", ["temple", "market", "university", "barracks", "aqueduct"].every((b) => BT[b] && BT[b].effects && BT[b].desc));

const stackUnits = [{ id: 11 }, { id: 12 }, { id: 13 }];
check("nextInStack cycles through stack",
  api.nextInStack(stackUnits, 11).id === 12 &&
  api.nextInStack(stackUnits, 12).id === 13 &&
  api.nextInStack(stackUnits, 13).id === 11 &&
  api.nextInStack(stackUnits, 99).id === 11 &&
  api.nextInStack(stackUnits, null).id === 11 &&
  api.nextInStack([], 11) === null);

const fxSettler = api.S.units.find((u) => u.owner === 0 && u.type === "settler");
api.foundCity(fxSettler);
const fx = api.S.cities.find((c) => c.owner === 0);
check("effects test city founded", !!fx);
if (fx) {
  const yNone = api.cityYields(fx);
  fx.buildings = ["granary"];
  const yGran = api.cityYields(fx);
  fx.buildings = ["granary", "library"];
  const yLib = api.cityYields(fx);
  fx.buildings = ["forge"];
  const yForge = api.cityYields(fx);
  check("granary +2 food", yGran.food === yNone.food + 2);
  check("library sciMult 1.5", yLib.sci === Math.round((2 + Math.floor(fx.pop / 2)) * 1.5) && yLib.sci > yGran.sci);
  check("forge +2 prod", yForge.prod === yNone.prod + 2);

  fx.buildings = ["walls"];
  check("walls defMult 1.5 via buildingEffects", api.buildingEffects(fx).defMult === 1.5);
  fx.buildings = [];
  check("defMult defaults to 1", api.buildingEffects(fx).defMult === 1);

  fx.culture = 0;
  fx.buildings = ["temple"];
  api.processEconomy();
  const cult1 = fx.culture;
  api.processEconomy();
  check("temple +3 culture per turn", cult1 === 3 && fx.culture === 6);
  fx.buildings = ["library"];
  fx.culture = 0;
  api.processEconomy();
  check("library no longer gives culture", fx.culture === 1);

  fx.buildings = ["barracks"];
  fx.producing = { k: "unit", id: "warrior" };
  fx.prodStored = 999;
  const n0 = api.S.units.length;
  api.processEconomy();
  const born = api.S.units[api.S.units.length - 1];
  check("barracks grants atkBonus 1", api.S.units.length === n0 + 1 && born.type === "warrior" && born.atkBonus === 1);
  fx.buildings = [];
  fx.producing = { k: "unit", id: "warrior" };
  fx.prodStored = 999;
  api.processEconomy();
  check("no barracks atkBonus 0", api.S.units[api.S.units.length - 1].atkBonus === 0);

  api.S.players[0].techs.push("gunpowder");
  fx.producing = { k: "unit", id: "musketman" };
  fx.prodStored = 999;
  api.processEconomy();
  check("musketman produced with tech", api.S.units.some((u) => u.owner === 0 && u.type === "musketman" && u.moves === UT.musketman.moves));
  check("new units spawnable", ["spearman", "horseman", "catapult", "knight", "musketman"].every((t) => api.spawn(t, 0, fx.x, fx.y).type === t));

  fx.buildings = ["aqueduct"];
  fx.pop = 10;
  fx.foodStored = 999;
  api.processEconomy();
  check("aqueduct raises pop cap above 10", fx.pop === 11);
  fx.buildings = [];
  fx.pop = 10;
  fx.foodStored = 999;
  api.processEconomy();
  check("pop capped at 10 without aqueduct", fx.pop === 10);
}

const aiSettler2 = api.S.units.find((u) => u.owner === 1 && u.type === "settler");
api.foundCity(aiSettler2);
const aiFx = api.S.cities.find((c) => c.owner === 1);
check("AI test city founded", !!aiFx);
if (aiFx) {
  api.S.players[1].techs.push("machinery");
  api.spawn("settler", 1, aiFx.x, aiFx.y);
  aiFx.producing = null;
  aiFx.pop = 1;
  api.aiTurn();
  check("AI produces new unit type", aiFx.producing && aiFx.producing.k === "unit" && aiFx.producing.id === "catapult");
}

const coreSrc = readFileSync("apps/civ/core.js", "utf8");
check("core.js free of DOM access", !(/\bdocument\b/.test(coreSrc) || /\bwindow\b/.test(coreSrc) || coreSrc.includes("createElement") || coreSrc.includes("getContext")));
const appSrc = readFileSync("apps/civ/app.js", "utf8");
check("app.js has no static three/renderer3d import", !/^[ \t]*import\s[^\n]*\b(?:three|renderer3d)\b/m.test(appSrc));

{
  const ids = Object.keys(TT);
  const have = new Set();
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of ids)
      if (!have.has(id) && TT[id].req.every((r) => have.has(r))) { have.add(id); grew = true; }
  }
  check("tech tree researchable from empty set", have.size === ids.length);
}

api.newGame(1);
const ebSettler = api.S.units.find((u) => u.owner === 0 && u.type === "settler");
api.foundCity(ebSettler);
const ebCity = api.S.cities[0];
ebCity.culture = 80;
api.processEconomy();
const ownE = api.getTileOwner();
const farTiles = [];
for (let dy = -3; dy <= 3; dy++)
  for (let dx = -3; dx <= 3; dx++) {
    const nx = ebCity.x + dx, ny = ebCity.y + dy;
    if (nx < 0 || ny < 0 || nx >= 26 || ny >= 18) continue;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 2) farTiles.push(ny * 26 + nx);
  }
check("processEconomy updates borders after growth", farTiles.length > 0 && farTiles.every((k) => ownE[k] === 0));

for (let diff = 0; diff <= 2; diff++) {
  api.newGame(diff);
  const sSettler = api.S.units.find((u) => u.owner === 0 && u.type === "settler");
  api.foundCity(sSettler);
  let stressErr = null;
  try {
    for (let t = 0; t < 60; t++) {
      api.S.over = null;
      if (!api.S.cities.some((c) => c.owner === 0) && !api.S.units.some((u) => u.owner === 0 && u.type === "settler")) {
        const to = api.getTileOwner();
        let li = -1;
        for (let j = 0; j < api.S.map.length; j++) {
          const x = j % 26, y = (j / 26) | 0;
          if (api.S.map[j] !== 0 && !api.S.cities.some((c) => c.x === x && c.y === y) && (to[j] === -1 || to[j] === 0)) { li = j; break; }
        }
        if (li >= 0) api.foundCity(api.spawn("settler", 0, li % 26, (li / 26) | 0));
      }
      api.endTurn();
    }
  } catch (e) { stressErr = e; }
  check(`stress diff ${diff}: 60 turns without exceptions`, stressErr === null);
  const toS = api.getTileOwner();
  check(`stress diff ${diff}: turn advanced`, api.S.turn >= 61);
  check(`stress diff ${diff}: map intact`, api.S.map.length === 26 * 18 && api.S.map.every((t) => Number.isInteger(t) && t >= 0 && t <= 5));
  check(`stress diff ${diff}: tileOwner matches cities`, Array.isArray(api.S.tileOwner) && api.S.tileOwner.length === 26 * 18 &&
    api.S.cities.every((c) => toS[c.y * 26 + c.x] === c.owner) &&
    toS.every((o, i) => o === -1 || api.S.cities.some((c) => c.owner === o &&
      Math.max(Math.abs(c.x - (i % 26)), Math.abs(c.y - ((i / 26) | 0))) <= api.cityRadius(c))));
  check(`stress diff ${diff}: units within map`, api.S.units.every((u) => u.x >= 0 && u.y >= 0 && u.x < 26 && u.y < 18));
  check(`stress diff ${diff}: unit types valid`, api.S.units.every((u) => !!UT[u.type]));
  check(`stress diff ${diff}: buildings valid`, api.S.cities.every((c) => c.buildings.every((b) => !!BT[b])));
}

const freeLandPair = () => {
  for (let j = 0; j < api.S.map.length; j++) {
    const x = j % 26, y = (j / 26) | 0;
    if (api.S.map[j] === 0 || api.S.map[j] === 5) continue;
    if (api.S.units.some((u) => Math.abs(u.x - x) <= 1 && Math.abs(u.y - y) <= 1)) continue;
    if (api.S.cities.some((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= 26 || ny >= 18) continue;
      if (api.S.map[ny * 26 + nx] === 0 || api.S.map[ny * 26 + nx] === 5) continue;
      return [[x, y], [nx, ny]];
    }
  }
  return null;
};

api.newGame(1);
const obPair = freeLandPair();
const obAtt = api.spawn("warrior", 0, obPair[0][0], obPair[0][1]);
const obDef = api.spawn("settler", 1, obPair[1][0], obPair[1][1]);
delete obAtt.atkBonus;
delete obDef.atkBonus;
api.save();
check("old save loaded with bonusless units", api.load() === true && api.S.units.every((u) => !("atkBonus" in u)));
const ldAtt = api.S.units.find((u) => u.id === obAtt.id);
const ldDef = api.S.units.find((u) => u.id === obDef.id);
ldAtt.moves = 1;
api.declareWar(0, 1);
api.attack(ldAtt, ldDef.x, ldDef.y);
check("combat works after old-save load", !(api.S.units.some((u) => u.id === obAtt.id) && api.S.units.some((u) => u.id === obDef.id)));

api.newGame(1, 3);
check("peace by default for all pairs", Object.keys(api.S.relations).length === 6 &&
  Object.entries(api.S.relations).every(([, r]) => r.war === false && r.since === -1));

const dPair = freeLandPair();
const dAtt = api.spawn("warrior", 0, dPair[0][0], dPair[0][1]);
const dDef = api.spawn("settler", 1, dPair[1][0], dPair[1][1]);
dAtt.moves = 1;
api.attack(dAtt, dDef.x, dDef.y);
check("attack no-op at peace, move not spent", api.S.units.includes(dAtt) && api.S.units.includes(dDef) && dAtt.moves === 1);
api.declareWar(0, 1);
check("declareWar flags war since current turn", api.atWar(0, 1) &&
  api.S.relations["0:1"].war === true && api.S.relations["0:1"].since === api.S.turn);
dAtt.moves = 1;
api.attack(dAtt, dDef.x, dDef.y);
check("attack resolves after declareWar", !api.S.units.includes(dAtt) || !api.S.units.includes(dDef));
api.makePeace(0, 1);
check("makePeace restores peace", !api.atWar(0, 1) && api.S.relations["0:1"].since === -1);

api.newGame(1);
let capSpot = null;
for (let j = 0; j < api.S.map.length && !capSpot; j++) {
  const x = j % 26, y = (j / 26) | 0;
  if (x < 25 && api.S.map[j] !== 0 && api.S.map[j] !== 5) capSpot = [x, y];
}
api.foundCity(api.spawn("settler", 1, capSpot[0], capSpot[1]));
const capCity = api.S.cities[0];
const capUnit = api.spawn("warrior", 0, capSpot[0] + 1, capSpot[1]);
capUnit.moves = 1;
check("enemy city not in reachable at peace", !api.reachable(capUnit).has(capSpot[1] * 26 + capSpot[0]));
api.moveUnit(capUnit, capSpot[0], capSpot[1]);
check("city capture impossible at peace", capUnit.x === capSpot[0] + 1 && capUnit.moves === 1 && capCity.owner === 1);
api.declareWar(0, 1);
api.moveUnit(capUnit, capSpot[0], capSpot[1]);
check("city capture works at war", capCity.owner === 0);

api.newGame(1);
api.S.units = api.S.units.filter((u) => u.owner !== 1);
let weakSpot = null;
for (let j = 0; j < api.S.map.length && !weakSpot; j++) {
  const x = j % 26, y = (j / 26) | 0;
  if (api.S.map[j] !== 0 && api.S.map[j] !== 5) weakSpot = [x, y];
}
api.foundCity(api.spawn("settler", 1, weakSpot[0], weakSpot[1]));
api.declareWar(0, 1);
const weakRel = api.S.relations["0:1"];
weakRel.since = api.S.turn - 3;
check("AI refuses peace early in war", api.offerPeace(0, 1) === false && api.atWar(0, 1));
weakRel.since = api.S.turn - 11;
api.S.cities[0].pop = 10;
check("AI refuses peace when strong", api.offerPeace(0, 1) === false && api.atWar(0, 1));
api.S.cities[0].pop = 1;
check("AI accepts peace when weak after long war", api.offerPeace(0, 1) === true && !api.atWar(0, 1));

api.newGame(1, 2);
api.declareWar(1, 2);
api.S.relations["1:2"].since = api.S.turn - 11;
api.S.units = api.S.units.filter((u) => u.owner !== 2);
api.endTurn();
check("AI-AI peace concluded via endTurn", !api.atWar(1, 2));

api.newGame(1, 2);
delete api.S.relations;
api.save();
check("old save without relations migrates to peace", api.load() === true &&
  Object.keys(api.S.relations).length === 3 &&
  Object.values(api.S.relations).every((r) => r.war === false && r.since === -1));

api.newGame(1);
const gtp = api.S.players[0];
check("grantTech adds tech and logs", api.grantTech(gtp, "agriculture") === true &&
  gtp.techs.includes("agriculture") && api.S.log.some((l) => l.includes("Получена технология: Земледелие")));
check("grantTech ignores duplicates", api.grantTech(gtp, "agriculture") === false &&
  gtp.techs.filter((t) => t === "agriculture").length === 1);
gtp.researching = "writing";
gtp.progress = 5;
api.grantTech(gtp, "writing");
check("grantTech resets research on match", gtp.researching === null && gtp.progress === 0 && gtp.techs.includes("writing"));
gtp.researching = "archery";
gtp.progress = 3;
api.grantTech(gtp, "mysticism");
check("grantTech keeps research on mismatch", gtp.researching === "archery" && gtp.progress === 3 && gtp.techs.includes("mysticism"));
check("grantFreeTech regression via grantTech", api.grantFreeTech(gtp) === "archery" && gtp.techs.includes("archery"));

api.newGame(1);
api.S.players[0].techs.push("writing");
api.S.players[1].techs.push("sailing");
const tt1 = api.offerTechTrade(0, 1, "writing", "sailing");
check("tech trade succeeds in peace, both sides get techs", tt1.ok === true &&
  api.S.players[0].techs.includes("sailing") && api.S.players[1].techs.includes("writing"));
check("trade sets lastTradeTurn", api.S.relations["0:1"].lastTradeTurn === api.S.turn);
check("trade logged", api.S.log.some((l) => l.includes("Обмен технологиями:")));
api.S.players[0].techs.push("pottery");
api.S.players[1].techs.push("mysticism");
const ltt = api.S.relations["0:1"].lastTradeTurn;
const tt2 = api.offerTechTrade(0, 1, "pottery", "mysticism");
check("trade blocked by cooldown", tt2.ok === false && tt2.reason.includes("недавно") &&
  !api.S.players[0].techs.includes("mysticism") && !api.S.players[1].techs.includes("pottery") &&
  api.S.relations["0:1"].lastTradeTurn === ltt);
api.S.turn += 9;
const tt3 = api.offerTechTrade(0, 1, "pottery", "mysticism");
check("cooldown still active at 9 turns", tt3.ok === false && tt3.reason.includes("недавно"));
api.S.turn += 1;
const tt4 = api.offerTechTrade(0, 1, "pottery", "mysticism");
check("trade works after 10 turns", tt4.ok === true &&
  api.S.players[0].techs.includes("mysticism") && api.S.players[1].techs.includes("pottery") &&
  api.S.relations["0:1"].lastTradeTurn === api.S.turn);

api.newGame(1);
api.S.players[0].techs.push("writing");
api.S.players[1].techs.push("sailing");
api.declareWar(0, 1);
check("trade refused at war", api.offerTechTrade(0, 1, "writing", "sailing").ok === false);
api.makePeace(0, 1);
check("trade works after peace", api.offerTechTrade(0, 1, "writing", "sailing").ok === true);

api.newGame(1);
api.S.players[0].techs.push("agriculture");
api.S.players[1].techs.push("gunpowder");
check("AI refuses cheap-for-expensive", api.offerTechTrade(0, 1, "agriculture", "gunpowder").ok === false);
api.newGame(1);
api.S.players[0].techs.push("education");
api.S.players[1].techs.push("literature");
check("AI accepts within 0.8 parity", api.offerTechTrade(0, 1, "education", "literature").ok === true &&
  api.S.players[0].techs.includes("literature") && api.S.players[1].techs.includes("education"));

api.newGame(1);
api.S.players[1].techs.push("sailing");
check("trade refuses unknown tech", api.offerTechTrade(0, 1, "nope", "sailing").ok === false);
check("trade refuses unowned tech", api.offerTechTrade(0, 1, "writing", "sailing").ok === false);

api.newGame(1);
api.S.players[0].techs.push("wheel", "horsebackriding");
api.S.players[1].techs.push("bronze", "iron");
const mtStart = api.S.units.find((u) => u.owner === 0);
const mtW1 = api.spawn("warrior", 0, mtStart.x, mtStart.y);
const mtW2 = api.spawn("warrior", 0, mtStart.x, mtStart.y);
check("AI refuses military tech to stronger player",
  api.valueOfDeal(1, "iron", "horsebackriding") === false &&
  api.offerTechTrade(0, 1, "horsebackriding", "iron").ok === false);
api.S.units = api.S.units.filter((u) => u !== mtW1 && u !== mtW2);
check("AI gives military tech at equal strength",
  api.valueOfDeal(1, "iron", "horsebackriding") === true &&
  api.offerTechTrade(0, 1, "horsebackriding", "iron").ok === true &&
  api.S.players[0].techs.includes("iron") && api.S.players[1].techs.includes("horsebackriding"));

api.newGame(1);
api.S.players[0].techs.push("pottery");
api.S.players[0].researching = "sailing";
api.S.players[0].progress = 10;
api.S.players[1].techs.push("sailing");
const ttR = api.offerTechTrade(0, 1, "pottery", "sailing");
check("received tech switches research", ttR.ok === true && api.S.players[0].researching === null &&
  api.S.players[0].progress === 0 && api.S.players[0].techs.includes("sailing"));

api.newGame(1, 2);
api.S.players[1].techs.push("writing");
api.S.players[2].techs.push("sailing");
const aiAiRnd = Math.random;
Math.random = () => 0;
try { api.aiDiplomacy(); } finally { Math.random = aiAiRnd; }
check("AI-AI tech trade in aiDiplomacy", api.S.players[1].techs.includes("sailing") &&
  api.S.players[2].techs.includes("writing") && api.S.relations["1:2"].lastTradeTurn === api.S.turn &&
  api.S.log.some((l) => l.includes("Обмен технологиями:")));
check("human untouched by AI-AI trade", api.S.players[0].techs.length === 0);
api.S.players[1].techs.push("mysticism");
api.S.players[2].techs.push("pottery");
Math.random = () => 0;
try { api.aiDiplomacy(); } finally { Math.random = aiAiRnd; }
check("AI-AI trade cooldown blocks repeat", !api.S.players[1].techs.includes("pottery") &&
  !api.S.players[2].techs.includes("mysticism"));
api.newGame(1, 2);
api.S.players[1].techs.push("writing");
api.S.players[2].techs.push("sailing");
Math.random = () => 0.99;
try { api.aiDiplomacy(); } finally { Math.random = aiAiRnd; }
check("AI-AI trade needs chance", !api.S.players[1].techs.includes("sailing"));

api.newGame(1, 2);
api.save();
const rawTt = JSON.parse(store["civ1_save"]);
for (const k of Object.keys(rawTt.relations)) delete rawTt.relations[k].lastTradeTurn;
store["civ1_save"] = JSON.stringify(rawTt);
check("old save migrates lastTradeTurn", api.load() === true &&
  Object.values(api.S.relations).every((r) => r.lastTradeTurn === -99));
api.S.players[0].techs.push("writing");
api.S.players[1].techs.push("sailing");
check("trade available right after migration", api.offerTechTrade(0, 1, "writing", "sailing").ok === true);
const ttTurn = api.S.relations["0:1"].lastTradeTurn;
api.save();
check("lastTradeTurn survives save-load roundtrip", api.load() === true &&
  api.S.relations["0:1"].lastTradeTurn === ttTurn);


api.newGame(1);
check("religions empty after newGame", Array.isArray(api.S.religions) && api.S.religions.length === 0 && api.S.cities.length === 0);
check("RELIGIONS table exposed", !!api.RELIGIONS && ["oracle", "muses", "sungod"].every((id) =>
  api.RELIGIONS[id] && api.RELIGIONS[id].name && api.RELIGIONS[id].icon && !!api.TECHS[api.RELIGIONS[id].tech]));

api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const relCap = api.S.cities.find((c) => c.owner === 0);
api.S.players[0].researching = "mysticism";
api.S.players[0].progress = api.TECHS.mysticism.cost;
api.processEconomy();
const oracle = api.S.religions.find((r) => r.id === "oracle");
check("mysticism completion founds oracle in capital", !!oracle && oracle.owner === 0 && oracle.tech === "mysticism" &&
  oracle.holyCityId === relCap.id && relCap.religion === "oracle" && api.isHolyCity(relCap) === true);
check("founding logged", api.S.log.some((l) => l.includes("основана религия")));
check("religion founded only once", api.foundReligion(0, "oracle") === false && api.foundReligion(1, "oracle") === false &&
  api.S.religions.filter((r) => r.id === "oracle").length === 1);

api.foundCity(api.S.units.find((u) => u.owner === 1 && u.type === "settler"));
const p1RelCity = api.S.cities.find((c) => c.owner === 1);
api.S.players[1].techs.push("mysticism", "literature");
api.checkFoundReligions();
const muses = api.S.religions.find((r) => r.id === "muses");
check("second player founds muses, oracle kept", !!muses && muses.owner === 1 && muses.holyCityId === p1RelCity.id &&
  p1RelCity.religion === "muses" && api.S.religions.filter((r) => r.id === "oracle").length === 1 && oracle.owner === 0);

api.newGame(1);
api.S.units = api.S.units.filter((u) => u.owner === 0);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const spCap = api.S.cities[0];
api.foundReligion(0, "oracle");
api.foundCity(api.spawn("settler", 0, spCap.x + 2 <= 25 ? spCap.x + 2 : spCap.x - 2, spCap.y));
api.foundCity(api.spawn("settler", 0, spCap.x + 12 <= 25 ? spCap.x + 12 : spCap.x - 12, spCap.y));
const spNear = api.S.cities[1];
const spFar = api.S.cities[2];
spNear.relPressure = 0;
spFar.relPressure = 0;
api.processEconomy();
check("pressure grows from neighbor source", spNear.relPressure >= 1 && spNear.religion === null);
check("isolated city untouched", spFar.relPressure === 0 && spFar.religion === null);
for (let i = 0; i < 6 && spNear.religion !== "oracle"; i++) api.processEconomy();
check("city converts at pressure 5", spNear.religion === "oracle" && spNear.relPressure === 0 && spFar.religion === null);

spCap.pop = 3; spCap.buildings = []; spCap.producing = null; spCap.foodStored = 0;
spNear.pop = 3; spNear.buildings = []; spNear.producing = null; spNear.foodStored = 0;
check("holy city +2 science before multipliers", api.cityYields(spCap).sci === api.cityYields(spNear).sci + 2 &&
  api.cityYields(spNear).sci === 2 + Math.floor(3 / 2));
spCap.buildings = ["library"];
check("holy bonus multiplied by library", api.cityYields(spCap).sci === Math.round((2 + 1 + 2) * 1.5));
spCap.buildings = [];
spNear.culture = 0; spNear.buildings = [];
spFar.culture = 0; spFar.buildings = [];
api.processEconomy();
check("religious city +1 culture per turn", spNear.culture === 2 && spFar.culture === 1);

api.newGame(1);
api.S.units = api.S.units.filter((u) => u.owner === 0);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const seaCap = api.S.cities[0];
api.S.players[0].techs.push("sailing");
const coastTiles = [];
for (let i = 0; i < api.S.map.length; i++) {
  const x = i % 26, y = (i / 26) | 0;
  if (api.S.map[i] === 0) continue;
  const w = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => {
    const wx = x + dx, wy = y + dy;
    return wx >= 0 && wy >= 0 && wx < 26 && wy < 18 && api.S.map[wy * 26 + wx] === 0;
  });
  if (w) coastTiles.push({ x, y, comp: api.S.waterComp[(y + w[1]) * 26 + (x + w[0])] });
}
let seaPair = null;
for (let i = 0; i < coastTiles.length && !seaPair; i++)
  for (let j = i + 1; j < coastTiles.length && !seaPair; j++) {
    const a = coastTiles[i], b = coastTiles[j];
    if (a.comp !== b.comp) continue;
    if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 3) continue;
    if (Math.max(Math.abs(a.x - seaCap.x), Math.abs(a.y - seaCap.y)) <= 3) continue;
    if (Math.max(Math.abs(b.x - seaCap.x), Math.abs(b.y - seaCap.y)) <= 3) continue;
    seaPair = [a, b];
  }
if (seaPair) {
  api.foundCity(api.spawn("settler", 0, seaPair[0].x, seaPair[0].y));
  api.foundCity(api.spawn("settler", 0, seaPair[1].x, seaPair[1].y));
  api.S.cities[1].religion = "sungod";
  api.S.cities[2].relPressure = 0;
  api.processEconomy();
  check("sea link adds pressure", api.S.cities[2].relPressure === 1 && api.S.cities[2].religion === null);
  for (let i = 0; i < 5 && api.S.cities[2].religion !== "sungod"; i++) api.processEconomy();
  check("sea spread converts", api.S.cities[2].religion === "sungod");
} else {
  check("sea link adds pressure", false);
  check("sea spread converts", false);
}

api.newGame(1);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
api.foundReligion(0, "oracle");
api.save();
const rawRel = JSON.parse(store["civ1_save"]);
delete rawRel.religions;
rawRel.cities.forEach((c) => { delete c.religion; delete c.relPressure; });
store["civ1_save"] = JSON.stringify(rawRel);
check("old save without religion fields migrates", api.load() === true && Array.isArray(api.S.religions) &&
  api.S.religions.length === 0 && api.S.cities.every((c) => c.religion === null && c.relPressure === 0));
let relMigErr = null;
try { api.processEconomy(); api.spreadReligions(); } catch (e) { relMigErr = e; }
check("religion logic stable after migration", relMigErr === null);

api.newGame(1);
api.S.units = api.S.units.filter((u) => u.owner === 0);
const wS = api.S.units.find((u) => u.owner === 0 && u.type === "settler");
api.foundCity(wS);
api.foundCity(api.spawn("settler", 0, wS.x + 2 <= 25 ? wS.x + 2 : wS.x - 2, wS.y));
for (const c of api.S.cities) { c.pop = 1; c.culture = 0; c.foodStored = 0; c.prodStored = 0; c.buildings = []; c.producing = null; }
const WT = api.WONDERS;
check("WONDERS table valid", !!WT && Object.keys(WT).length === 5 &&
  ["pyramids", "greatlibrary", "colossus", "greatwall", "oraclew"].every((id) =>
    WT[id] && WT[id].name && WT[id].icon && WT[id].desc && api.TECHS[WT[id].tech]) &&
  Object.values(WT).every((w) => w.cost >= 130 && w.cost <= 180 && w.effects && Object.keys(w.effects).length > 0));

const wA = api.S.cities[0], wB = api.S.cities[1];
api.S.players[0].techs.push("masonry");
const aP0 = api.cityYields(wA).prod, bP0 = api.cityYields(wB).prod, bS0 = api.cityYields(wB).sci;
wA.producing = { k: "wonder", id: "pyramids" };
api.processEconomy();
check("wonder chosen as production and accumulates", wA.producing && wA.producing.k === "wonder" &&
  wA.producing.id === "pyramids" && wA.prodStored > 0 && api.S.wonders.length === 0);

wA.prodStored = WT.pyramids.cost;
const wTurn = api.S.turn;
api.processEconomy();
check("wonder completion recorded in S.wonders", api.S.wonders.length === 1 &&
  api.S.wonders[0].id === "pyramids" && api.S.wonders[0].owner === 0 &&
  api.S.wonders[0].cityId === wA.id && api.S.wonders[0].turn === wTurn);
check("pyramids +2 prod in all owner cities", api.cityYields(wA).prod === aP0 + 2 && api.cityYields(wB).prod === bP0 + 2);

api.S.players[0].techs.push("literature");
wA.producing = { k: "wonder", id: "greatlibrary" };
wA.prodStored = WT.greatlibrary.cost;
api.processEconomy();
check("greatlibrary +50% sci in all owner cities", api.cityYields(wB).sci === Math.round(bS0 * 1.5));

api.S.players[1].techs.push("masonry", "construction");
api.foundCity(api.spawn("settler", 1, wA.x, wA.y + 3 <= 17 ? wA.y + 3 : wA.y - 3));
const wC = api.S.cities.find((c) => c.owner === 1);
wC.pop = 1; wC.culture = 0; wC.foodStored = 0; wC.buildings = []; wC.producing = null;
const cY = api.cityYields(wC).prod;
wC.producing = { k: "wonder", id: "pyramids" };
wC.prodStored = 999;
api.processEconomy();
check("race lost: 50% compensation, wonder not duplicated", api.S.wonders.filter((w) => w.id === "pyramids").length === 1 &&
  wC.producing === null && wC.prodStored === 999 + cY + Math.floor(WT.pyramids.cost / 2) &&
  api.S.log.some((l) => l.includes("уже построено")));

wC.producing = { k: "wonder", id: "greatwall" };
wC.prodStored = 999;
api.processEconomy();
check("greatwall defMult 1.5 via playerEffects", api.playerEffects(1).defMult === 1.5 && api.playerEffects(0).defMult === 1);
wC.owner = 0;
check("captured city transfers wonder effect", api.playerEffects(0).defMult === 1.5 && api.playerEffects(1).defMult === 1);

api.newGame(1);
api.S.units = api.S.units.filter((u) => u.owner === 0);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const orc = api.S.cities[0];
api.S.players[0].techs.push("mysticism");
const cheapest0 = Object.keys(api.TECHS).filter((t) => api.techAvailable(api.S.players[0], t))
  .sort((a, b) => api.TECHS[a].cost - api.TECHS[b].cost)[0];
orc.producing = { k: "wonder", id: "oraclew" };
orc.prodStored = 999;
api.processEconomy();
check("oracle grants cheapest free tech on completion", api.S.wonders.some((w) => w.id === "oraclew") &&
  api.S.players[0].techs.includes(cheapest0) && api.S.log.some((l) => l.includes("дарует знание")));

api.newGame(2);
const awS = api.S.units.find((u) => u.owner === 1 && u.type === "settler");
api.foundCity(awS);
const awCity = api.S.cities.find((c) => c.owner === 1);
api.S.players[1].techs.push("masonry", "construction", "currency", "literature", "mysticism");
awCity.pop = 5;
awCity.producing = null;
const origRndW = Math.random;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = origRndW; }
check("AI starts wonder in strong city", awCity.producing && awCity.producing.k === "wonder" && !!api.WONDERS[awCity.producing.id]);
awCity.producing = null;
awCity.pop = 2;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = origRndW; }
check("AI skips wonder in small city", awCity.producing && awCity.producing.k !== "wonder");

check("attack applies wonder defMult", readFileSync("apps/civ/core.js", "utf8").includes("playerEffects(city.owner).defMult"));

api.newGame(1);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const migCity = api.S.cities[0];
api.S.players[0].techs.push("construction");
migCity.producing = { k: "wonder", id: "greatwall" };
api.save();
check("wonders serialized in save", Array.isArray(JSON.parse(store["civ1_save"]).wonders));
const rawW = JSON.parse(store["civ1_save"]);
delete rawW.wonders;
store["civ1_save"] = JSON.stringify(rawW);
check("old save without S.wonders migrates", api.load() === true && Array.isArray(api.S.wonders) &&
  api.S.wonders.length === 0 && api.S.cities[0].producing && api.S.cities[0].producing.k === "wonder");
let wErr = null;
try { api.processEconomy(); } catch (e) { wErr = e; }
check("wonder production stable after migration", wErr === null);

check("culture win constants exposed", api.CULTURE_WIN_CITIES === 3 && api.CULTURE_WIN_THRESHOLD === 200);

const cultSpots = () => {
  const spots = [];
  for (let j = 0; j < api.S.map.length && spots.length < 4; j++) {
    const x = j % 26, y = (j / 26) | 0;
    if (api.S.map[j] === 0 || api.S.map[j] === 5) continue;
    if (spots.every(([sx, sy]) => Math.max(Math.abs(sx - x), Math.abs(sy - y)) >= 3)) spots.push([x, y]);
  }
  return spots;
};

api.newGame(1);
api.S.units = [];
const cs1 = cultSpots();
for (let i = 0; i < 3; i++) api.foundCity(api.spawn("settler", 0, cs1[i][0], cs1[i][1]));
api.foundCity(api.spawn("settler", 1, cs1[3][0], cs1[3][1]));
api.S.cities.filter((c) => c.owner === 0).forEach((c) => { c.culture = 200; });
check("legendaryCities counts own cities at threshold",
  api.legendaryCities(0).length === 3 && api.legendaryCities(1).length === 0);
api.endTurn();
check("player culture victory", api.S.over && api.S.over.winner === 0 && api.S.over.type === "culture");
check("culture victory logged", api.S.log.some((l) => l.toLowerCase().includes("легендарн")));

api.newGame(1);
api.S.units = [];
const cs2 = cultSpots();
api.foundCity(api.spawn("settler", 0, cs2[0][0], cs2[0][1]));
for (let i = 1; i < 4; i++) api.foundCity(api.spawn("settler", 1, cs2[i][0], cs2[i][1]));
api.S.cities.filter((c) => c.owner === 1).forEach((c) => { c.culture = 200; });
api.endTurn();
check("AI culture victory is player defeat", api.S.over && api.S.over.winner === 1 && api.S.over.type === "culture");

api.newGame(1);
api.S.units = [];
const cs3 = cultSpots();
for (let i = 0; i < 3; i++) api.foundCity(api.spawn("settler", 1, cs3[i][0], cs3[i][1]));
api.S.cities.forEach((c) => { c.culture = 200; });
api.endTurn();
check("conquest priority over culture", api.S.over && api.S.over.type === "conquest" && api.S.over.winner === 1);

api.S.over = { winner: 0, type: "culture" };
api.endTurn();
check("victory type not overwritten", api.S.over.winner === 0 && api.S.over.type === "culture");

api.newGame(1);
api.S.units = [];
const cs4 = cultSpots();
for (let i = 0; i < 3; i++) api.foundCity(api.spawn("settler", 0, cs4[i][0], cs4[i][1]));
api.foundCity(api.spawn("settler", 1, cs4[3][0], cs4[3][1]));
const pc4 = api.S.cities.filter((c) => c.owner === 0);
pc4[0].culture = 200;
pc4[1].culture = 200;
pc4[2].culture = 199;
check("city below threshold not legendary", api.legendaryCities(0).length === 2);
pc4[2].culture = 198;
api.endTurn();
check("no culture victory below threshold", api.S.over === null);

api.newGame(1);
api.S.over = { winner: 1 };
api.save();
check("old over migrates to conquest", api.load() === true && api.S.over.winner === 1 && api.S.over.type === "conquest");
api.S.over = { winner: 0, type: "culture" };
api.save();
check("over type survives save-load roundtrip", api.load() === true && api.S.over.winner === 0 && api.S.over.type === "culture");

const overAppSrc = readFileSync("apps/civ/app.js", "utf8");
const topbarSrc = overAppSrc.slice(overAppSrc.indexOf("function renderTopbar"), overAppSrc.indexOf("function renderPanel"));
check("renderTopbar culture indicator", topbarSrc.includes("Легендарные города") && topbarSrc.includes("legendaryCities"));
check("renderOver uses unified new game controls",
  overAppSrc.includes('id="civ-ng-controls"') && !overAppSrc.includes("newGameButtons"));

api.newGame(1);
api.S.units = [];
let shoreSpot = null;
for (let j = 0; j < api.S.map.length && !shoreSpot; j++) {
  const x = j % 26, y = (j / 26) | 0;
  if (api.S.map[j] === 0 || api.S.map[j] === 5) continue;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && api.S.map[ny * 26 + nx] === 0) { shoreSpot = { x, y, sx: nx, sy: ny }; break; }
  }
}
if (shoreSpot) {
  const shoreGalley = api.spawn("galley", 0, shoreSpot.sx, shoreSpot.sy);
  const marine = api.spawn("warrior", 0, shoreSpot.x, shoreSpot.y);
  api.moveUnit(marine, shoreSpot.sx, shoreSpot.sy);
  const beachEnemy = api.spawn("settler", 1, shoreSpot.x, shoreSpot.y);
  marine.moves = 1;
  shoreGalley.moves = 1;
  api.declareWar(0, 1);
  api.attack(marine, shoreSpot.x, shoreSpot.y);
  check("passenger cannot attack from ship", api.S.units.includes(beachEnemy) && api.S.units.includes(marine) && marine.moves === 1);
  api.attack(shoreGalley, shoreSpot.x, shoreSpot.y);
  check("galley cannot attack land tile", api.S.units.includes(beachEnemy) && api.S.units.includes(shoreGalley) && shoreGalley.moves === 1);
} else {
  check("passenger cannot attack from ship", false);
  check("galley cannot attack land tile", false);
}

api.newGame(1);
api.S.units = api.S.units.filter((u) => u.owner === 0);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
api.S.units = [];
api.S.players[0].techs.push("currency");
const coloCity = api.S.cities[0];
coloCity.producing = { k: "wonder", id: "colossus" };
coloCity.prodStored = 999;
api.processEconomy();
check("colossus grants owner tradeMult 2", api.S.wonders.some((w) => w.id === "colossus") && api.playerEffects(0).tradeMult === 2);

api.newGame(1);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
api.S.units = [];
const holdPair = freeLandPair();
const holdAi = api.spawn("warrior", 1, holdPair[0][0], holdPair[0][1]);
const holdVictim = api.spawn("settler", 0, holdPair[1][0], holdPair[1][1]);
api.S.turn = 99;
holdAi.moves = 1;
const holdRnd = Math.random;
Math.random = () => 0;
try {
  api.declareWar(1, 0);
  api.aiTurnOne(1);
} finally { Math.random = holdRnd; }
check("AI attacks adjacent enemy at war", !api.S.units.includes(holdVictim));
const holdVictim2 = api.spawn("settler", 0, holdPair[1][0], holdPair[1][1]);
holdAi.x = holdPair[0][0];
holdAi.y = holdPair[0][1];
holdAi.moves = 1;
api.makePeace(0, 1);
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = holdRnd; }
check("AI holds fire after makePeace", !api.atWar(0, 1) && api.S.units.includes(holdVictim2) &&
  holdAi.x === holdPair[0][0] && holdAi.y === holdPair[0][1]);

api.newGame(1, 3);
api.S.units = [];
const dipSpots = cultSpots();
for (let i = 0; i < 4; i++) api.foundCity(api.spawn("settler", i, dipSpots[i][0], dipSpots[i][1]));
api.S.turn = 99;
api.declareWar(1, 2);
api.S.cities.find((c) => c.owner === 1).pop = 10;
api.spawn("knight", 1, dipSpots[1][0], dipSpots[1][1]);
const dipRnd = Math.random;
Math.random = () => 0;
try { api.aiDiplomacy(); } finally { Math.random = dipRnd; }
check("fighting AI opens no second war", api.atWar(1, 2) && !api.atWar(0, 1) && !api.atWar(1, 3));

api.newGame(1, 3);
api.S.units = [];
const warSpots = cultSpots();
for (let i = 0; i < 4; i++) api.foundCity(api.spawn("settler", i, warSpots[i][0], warSpots[i][1]));
api.S.turn = 99;
api.S.cities.find((c) => c.owner === 3).pop = 10;
api.spawn("knight", 3, warSpots[3][0], warSpots[3][1]);
api.spawn("knight", 3, warSpots[3][0], warSpots[3][1]);
Math.random = () => 0;
try { api.aiDiplomacy(); } finally { Math.random = dipRnd; }
check("strong idle AI declares exactly one war", [0, 1, 2].filter((j) => api.atWar(3, j)).length === 1);

api.newGame(1);
const preMap = api.S.map.slice();
const preRes = api.S.res.slice();
let psLand = null, psSea = null, psCity = null;
for (let j = 0; j < preMap.length; j++) {
  const x = j % 26, y = (j / 26) | 0;
  if (preMap[j] === 0 || preMap[j] === 5) continue;
  if (!psLand) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && preMap[ny * 26 + nx] === 0) { psLand = [x, y]; psSea = [nx, ny]; break; }
    }
  }
  if (psLand && !psCity && Math.max(Math.abs(x - psLand[0]), Math.abs(y - psLand[1])) >= 4) psCity = [x, y];
}
if (psLand && psCity) {
  store["civ1_save"] = JSON.stringify({
    turn: 17, nextId: 100, difficulty: 1,
    map: preMap, res: preRes,
    players: [
      { name: "Рим", color: "#4a90d9", techs: ["agriculture"], researching: null, progress: 0, isHuman: true },
      { name: "Галлы", color: "#d9534f", techs: [], researching: null, progress: 0, isHuman: false },
    ],
    units: [
      { id: 90, type: "settler", owner: 0, x: psLand[0], y: psLand[1], moves: 1 },
      { id: 91, type: "galley", owner: 0, x: psSea[0], y: psSea[1], moves: 3 },
      { id: 92, type: "warrior", owner: 1, x: psCity[0], y: psCity[1], moves: 1 },
    ],
    cities: [{ id: 80, owner: 1, x: psCity[0], y: psCity[1], name: "Герговия", pop: 2, foodStored: 0, prodStored: 0, producing: null, buildings: [] }],
    explored: new Array(26 * 18).fill(0),
    log: ["старый сейв"],
    over: { winner: 1 },
    sel: null,
  });
  check("pre-S2 save loads", api.load() === true);
  check("pre-S2 migration fills sprint 2 state",
    Object.keys(api.S.relations).length === 1 && api.S.relations["0:1"].war === false && api.S.relations["0:1"].since === -1 &&
    Array.isArray(api.S.religions) && api.S.religions.length === 0 &&
    Array.isArray(api.S.wonders) && api.S.wonders.length === 0 &&
    api.S.over.winner === 1 && api.S.over.type === "conquest" &&
    api.S.cities[0].religion === null && api.S.cities[0].relPressure === 0 && api.S.cities[0].culture === 0);
  check("pre-S2 migration restores derived world",
    Array.isArray(api.S.waterComp) && api.S.waterComp.length === 26 * 18 &&
    Array.isArray(api.S.tileOwner) && api.S.tileOwner.length === 26 * 18 &&
    api.getTileOwner()[psCity[1] * 26 + psCity[0]] === 1 &&
    Array.isArray(api.S.players[0].cityNames) && api.S.players[0].cityNames.length > 0);
  const preBoarder = api.spawn("warrior", 0, psLand[0], psLand[1]);
  check("pre-S2 galley keeps transport role", api.reachable(preBoarder).has(psSea[1] * 26 + psSea[0]));
  api.moveUnit(preBoarder, psSea[0], psSea[1]);
  check("pre-S2 galley boards unit", preBoarder.x === psSea[0] && preBoarder.y === psSea[1]);
  api.S.over = null;
  api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
  let preErr = null;
  try { for (let i = 0; i < 5; i++) { api.S.over = null; api.endTurn(); } } catch (e) { preErr = e; }
  check("pre-S2 save lives 5 turns", preErr === null && api.S.turn === 22);
} else {
  check("pre-S2 save loads", false);
}

if (!fast) {
  api.newGame(1, 3);
  const startUnits = [0, 1, 2, 3].map((i) => api.S.units.find((u) => u.owner === i && u.type === "settler"));
  check("4 nations with unique names and colors", api.S.players.length === 4 &&
    new Set(api.S.players.map((p) => p.name)).size === 4 &&
    new Set(api.S.players.map((p) => p.color)).size === 4 &&
    startUnits.every((u) => !!u));
  let minStartD = 99;
  for (let a = 0; a < 4; a++)
    for (let b = a + 1; b < 4; b++)
      minStartD = Math.min(minStartD, Math.max(Math.abs(startUnits[a].x - startUnits[b].x), Math.abs(startUnits[a].y - startUnits[b].y)));
  check("player starts pairwise separated", minStartD >= 4);
  api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
  const aliveInt = (i) => api.S.cities.some((c) => c.owner === i) || api.S.units.some((u) => u.owner === i && u.type === "settler");
  const refound0 = () => {
    const to = api.getTileOwner();
    let li = -1;
    for (let j = 0; j < api.S.map.length; j++) {
      const x = j % 26, y = (j / 26) | 0;
      if (api.S.map[j] !== 0 && api.S.map[j] !== 5 && !api.S.cities.some((c) => c.x === x && c.y === y) && (to[j] === -1 || to[j] === 0)) { li = j; break; }
    }
    if (li >= 0) api.foundCity(api.spawn("settler", 0, li % 26, (li / 26) | 0));
  };
  let integErr = null, waterAlone = false, invBad = null, aiCitySeen = false;
  try {
    for (let t = 0; t < 80; t++) {
      api.S.over = null;
      if (!aliveInt(0)) refound0();
      api.endTurn();
      if (api.S.cities.some((c) => c.owner > 0)) aiCitySeen = true;
      for (const u of api.S.units) {
        if (api.isNaval(u) || api.S.map[u.y * 26 + u.x] !== 0) continue;
        if (!api.S.units.some((s) => api.isNaval(s) && s.owner === u.owner && s.x === u.x && s.y === u.y)) waterAlone = true;
      }
      if ((t + 1) % 10 === 0) {
        for (let a = 0; a < 4; a++)
          for (let b = a + 1; b < 4; b++)
            if (api.atWar(a, b) !== api.atWar(b, a)) invBad = `war asymmetry ${a}:${b}`;
        const rk = Object.keys(api.S.relations);
        if (rk.length !== 6 || rk.some((k) => { const [a, b] = k.split(":").map(Number); return rk.includes(b + ":" + a); })) invBad = "relation keys";
        if (api.S.religions.length > 3 || new Set(api.S.religions.map((r) => r.id)).size !== api.S.religions.length ||
          api.S.religions.some((r) => !api.RELIGIONS[r.id])) invBad = "religion duplicates";
        const wIds = api.S.wonders.map((w) => w.id);
        if (new Set(wIds).size !== wIds.length || api.S.wonders.some((w) => !api.WONDERS[w.id])) invBad = "wonder duplicates";
        const toInv = api.getTileOwner();
        if (api.S.cities.some((c) => toInv[c.y * 26 + c.x] !== c.owner)) invBad = "tileOwner mismatch";
        for (let a = 1; a < 4; a++)
          for (let b = a + 1; b < 4; b++) {
            if (!api.atWar(a, b) || (aliveInt(a) && aliveInt(b))) continue;
            if (!api.S.cities.some((c) => c.owner === a || c.owner === b)) continue;
            if (api.S.turn - api.S.relations[a + ":" + b].since > 11) invBad = `war with eliminated ${a}:${b}`;
          }
      }
    }
  } catch (e) { integErr = e; }
  check("80-turn 4-player game runs clean", integErr === null);
  check("80 turns advanced", api.S.turn === 81);
  check("no land units stranded on water", !waterAlone);
  check("periodic invariants hold", invBad === null);
  check("AI nations active across the game", aiCitySeen);
  check("player elimination ends in defeat not limbo", aliveInt(0) ||
    (!!api.S.over && api.S.over.winner !== 0 && !!api.S.over.type));
}

if (!fast) {
  for (const sDiff of [0, 2]) for (const sOpp of [1, 3]) {
    const tag = `stress 100 diff ${sDiff} opp ${sOpp}`;
    api.newGame(sDiff, sOpp);
    api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
    let sErr = null;
    try {
      for (let t = 0; t < 100; t++) {
        api.S.over = null;
        if (!api.S.cities.some((c) => c.owner === 0) && !api.S.units.some((u) => u.owner === 0 && u.type === "settler")) {
          const to = api.getTileOwner();
          let li = -1;
          for (let j = 0; j < api.S.map.length; j++) {
            const x = j % 26, y = (j / 26) | 0;
            if (api.S.map[j] !== 0 && api.S.map[j] !== 5 && !api.S.cities.some((c) => c.x === x && c.y === y) && (to[j] === -1 || to[j] === 0)) { li = j; break; }
          }
          if (li >= 0) api.foundCity(api.spawn("settler", 0, li % 26, (li / 26) | 0));
        }
        api.endTurn();
      }
    } catch (e) { sErr = e; }
    check(`${tag}: no exceptions`, sErr === null);
    check(`${tag}: 100 turns advanced`, api.S.turn >= 101);
    check(`${tag}: world intact`, api.S.map.length === 26 * 18 &&
      api.S.map.every((t) => Number.isInteger(t) && t >= 0 && t <= 5) &&
      api.S.units.every((u) => u.x >= 0 && u.y >= 0 && u.x < 26 && u.y < 18 && !!UT[u.type]) &&
      api.S.cities.every((c) => c.buildings.every((b) => !!BT[b])));
    const toS2 = api.getTileOwner();
    check(`${tag}: borders consistent`, api.S.cities.every((c) => toS2[c.y * 26 + c.x] === c.owner) &&
      toS2.every((o, i) => o === -1 || api.S.cities.some((c) => c.owner === o &&
        Math.max(Math.abs(c.x - (i % 26)), Math.abs(c.y - ((i / 26) | 0))) <= api.cityRadius(c))));
    const nP = api.S.players.length;
    let diploOk = Object.keys(api.S.relations).length === (nP * (nP - 1)) / 2;
    for (let a = 0; a < nP && diploOk; a++)
      for (let b = a + 1; b < nP && diploOk; b++)
        if (api.atWar(a, b) !== api.atWar(b, a)) diploOk = false;
    const swIds = api.S.wonders.map((w) => w.id);
    if (new Set(swIds).size !== swIds.length) diploOk = false;
    if (api.S.religions.length > 3 || new Set(api.S.religions.map((r) => r.id)).size !== api.S.religions.length) diploOk = false;
    check(`${tag}: diplomacy state consistent`, diploOk);
  }
}

api.newGame(1);
check("gold starts at 50", api.S.players.every((p) => p.gold === 50));
const gp0 = api.playerGoldPerTurn(0);
check("upkeep counts units without cities", gp0.income === 0 && gp0.upkeep === 2 && gp0.net === -2);

api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const goldCity = api.S.cities.find((c) => c.owner === 0);
const gt = api.playerGoldPerTurn(0);
check("city tax and upkeep converge", api.cityYields(goldCity).gold === 3 &&
  gt.income === 3 && gt.upkeep === 3 && gt.net === 0);
api.endTurn();
check("gold accrues net per turn", api.S.players[0].gold === 50);

api.newGame(1);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const strikeCity = api.S.cities.find((c) => c.owner === 0);
api.S.players[0].gold = 0;
api.S.players[0].researching = "agriculture";
api.S.players[0].progress = 0;
for (let i = 0; i < 10; i++) api.spawn("warrior", 0, strikeCity.x, strikeCity.y);
api.endTurn();
check("empty treasury stops science", api.S.players[0].gold === 0 && api.S.players[0].progress === 0 &&
  api.S.log.some((l) => l.includes("Казна пуста")));
api.S.players[0].gold = 20;
api.endTurn();
check("science resumes with funded treasury", api.S.players[0].gold === 10 && api.S.players[0].progress > 0);

api.newGame(1);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const buyCity = api.S.cities.find((c) => c.owner === 0);
api.S.players[0].gold = 1000;
buyCity.prodStored = 5;
const warriors0 = api.S.units.filter((u) => u.owner === 0 && u.type === "warrior").length;
const rbu = api.buyForGold(buyCity.id, "unit", "warrior");
check("buyForGold unit charges and spawns", rbu.ok === true &&
  api.S.players[0].gold === 1000 - Math.ceil(UT.warrior.cost * 3) &&
  api.S.units.filter((u) => u.owner === 0 && u.type === "warrior").length === warriors0 + 1 &&
  buyCity.prodStored === 5);
api.S.players[0].techs.push("currency");
const rbb = api.buyForGold(buyCity.id, "building", "market");
check("buyForGold building charges and builds", rbb.ok === true && buyCity.buildings.includes("market") &&
  api.S.players[0].gold === 1000 - Math.ceil(UT.warrior.cost * 3) - Math.ceil(BT.market.cost * 3));
check("buyForGold rejects built building", api.buyForGold(buyCity.id, "building", "market").ok === false);
check("buyForGold rejects wonders", api.buyForGold(buyCity.id, "wonder", "pyramids").ok === false);
api.S.players[0].gold = 10;
check("buyForGold rejects when short of gold", api.buyForGold(buyCity.id, "unit", "scout").ok === false &&
  api.S.players[0].gold === 10);

api.newGame(1);
const awSet = api.S.units.find((u) => u.owner === 1 && u.type === "settler");
api.foundCity(awSet);
const auCity = api.S.cities.find((c) => c.owner === 1);
api.S.players[1].gold = 300;
const aiUnits0 = api.S.units.filter((u) => u.owner === 1).length;
api.declareWar(0, 1);
const aiRnd2 = Math.random;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = aiRnd2; }
check("AI buys combat unit at war", api.S.units.filter((u) => u.owner === 1).length === aiUnits0 + 1 &&
  api.S.players[1].gold === 300 - Math.ceil(UT.warrior.cost * 3));

api.newGame(1);
const apSet = api.S.units.find((u) => u.owner === 1 && u.type === "settler");
api.foundCity(apSet);
const apCity = api.S.cities.find((c) => c.owner === 1);
api.S.players[1].techs.push("currency");
api.S.players[1].gold = 250;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = aiRnd2; }
check("AI buys economy building at peace", apCity.buildings.includes("market") &&
  api.S.players[1].gold === 250 - Math.ceil(BT.market.cost * 3));

api.newGame(1);
api.S.players[0].gold = 77;
api.save();
const rawGold = JSON.parse(store["civ1_save"]);
rawGold.players.forEach((p) => { delete p.gold; });
store["civ1_save"] = JSON.stringify(rawGold);
check("old save without gold migrates to 50", api.load() === true && api.S.players.every((p) => p.gold === 50));
api.S.players[0].gold = 64;
api.save();
check("gold survives save-load roundtrip", api.load() === true && api.S.players[0].gold === 64);

check("unit resource requirement data", JSON.stringify(api.UNITS.swordsman.res) === '["iron"]' &&
  JSON.stringify(api.UNITS.horseman.res) === '["horses"]' &&
  JSON.stringify(api.UNITS.knight.res) === '["iron","horses"]');
check("debugApi exposes resource gates", !!api.RESOURCES &&
  typeof api.unitAvailable === "function" && typeof api.resourceConnected === "function" &&
  typeof api.hasMarble === "function" && typeof api.wonderCost === "function");

api.newGame(1);
api.foundCity(api.S.units.find((u) => u.owner === 0 && u.type === "settler"));
const gateCity = api.S.cities[0];
for (let i = 0; i < api.S.res.length; i++)
  if (api.S.res[i] === "iron" || api.S.res[i] === "horses" || api.S.res[i] === "marble") api.S.res[i] = null;
api.S.players[0].techs.push("masonry", "bronze", "iron", "wheel", "pottery", "horsebackriding", "mysticism", "monarchy", "feudalism", "machinery");
api.recomputeBorders();
const ownTiles = [];
for (let i = 0; i < api.S.tileOwner.length; i++)
  if (api.S.tileOwner[i] === 0 && i !== gateCity.y * 26 + gateCity.x) ownTiles.push(i);
check("swordsman locked without iron despite tech", api.unitAvailable(0, "swordsman") === false);
check("horseman and knight locked without resources", api.unitAvailable(0, "horseman") === false && api.unitAvailable(0, "knight") === false);
check("units without resource requirement unaffected", api.unitAvailable(0, "warrior") === true && api.unitAvailable(0, "catapult") === true);
check("tech gate still applies", api.unitAvailable(0, "musketman") === false);

api.S.res[ownTiles[0]] = "iron";
check("iron inside borders unlocks swordsman", api.resourceConnected(0, "iron") === true && api.unitAvailable(0, "swordsman") === true);
check("knight still locked with iron only", api.unitAvailable(0, "knight") === false);
api.S.res[ownTiles[1]] = "horses";
check("knight unlocked with both resources", api.unitAvailable(0, "knight") === true && api.unitAvailable(0, "horseman") === true);

const gatePair = freeLandPair();
api.foundCity(api.spawn("settler", 0, gatePair[0][0], gatePair[0][1]));
const plainCity = api.S.cities.find((x) => x !== gateCity);
check("wonderCost full price without marble", api.hasMarble(gateCity) === false && api.hasMarble(plainCity) === false &&
  api.wonderCost(gateCity, "pyramids") === 160 && api.wonderCost(plainCity, "pyramids") === 160);
plainCity.producing = { k: "wonder", id: "greatwall" };
plainCity.prodStored = 111;
api.processEconomy();
check("wonder not completed below full price without marble", api.S.wonders.length === 0 && plainCity.producing !== null);
api.S.res[ownTiles[2]] = "marble";
check("marble in borders cuts wonder cost 25%", api.hasMarble(gateCity) === true &&
  api.wonderCost(gateCity, "pyramids") === 120 && api.wonderCost(gateCity, "greatwall") === 112);
plainCity.producing = null;
gateCity.producing = { k: "wonder", id: "pyramids" };
gateCity.prodStored = 119;
api.processEconomy();
check("marble city completes wonder at discounted cost", api.S.wonders.some((w) => w.id === "pyramids" && w.cityId === gateCity.id));

api.newGame(1);
const arSet = api.S.units.find((u) => u.owner === 1 && u.type === "settler");
api.foundCity(arSet);
const arCity = api.S.cities[0];
for (let i = 0; i < api.S.res.length; i++)
  if (api.S.res[i] === "iron" || api.S.res[i] === "horses") api.S.res[i] = null;
api.S.players[1].techs.push("pottery", "bronze", "wheel", "mysticism", "iron", "monarchy", "horsebackriding", "feudalism", "machinery");
api.spawn("settler", 1, arCity.x, arCity.y);
arCity.producing = null;
const arRnd = Math.random;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = arRnd; }
check("AI does not produce resource-locked units", arCity.producing && arCity.producing.k === "unit" && arCity.producing.id === "catapult");
const arOwn = [];
for (let i = 0; i < api.S.tileOwner.length; i++) if (api.S.tileOwner[i] === 1) arOwn.push(i);
api.S.res[arOwn[0]] = "iron";
api.S.res[arOwn[1]] = "horses";
api.spawn("settler", 1, arCity.x, arCity.y);
arCity.producing = null;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = arRnd; }
check("AI builds best unit once resources connected", arCity.producing && arCity.producing.k === "unit" && arCity.producing.id === "knight");

api.newGame(1);
const seaResBefore = api.S.res.filter((r) => r === "fish" || r === "whale").length;
api.S.res = api.S.res.map((r) => (r === "iron" || r === "horses" || r === "marble") ? null : r);
api.save();
check("old save without land resources loads with backfill", api.load() === true &&
  api.S.res.some((r) => r === "iron") && api.S.res.some((r) => r === "horses") && api.S.res.some((r) => r === "marble"));
check("backfill preserves sea resources", api.S.res.filter((r) => r === "fish" || r === "whale").length === seaResBefore);
check("backfilled resources on valid land", api.S.res.every((r, i) =>
  (r !== "iron" && r !== "horses" && r !== "marble") || (api.S.map[i] !== 0 && api.S.map[i] !== 5)));
const ironKept = api.S.res.filter((r) => r === "iron").length;
const horsesKept = api.S.res.filter((r) => r === "horses").length;
api.save();
check("load does not double-backfill", api.load() === true &&
  api.S.res.filter((r) => r === "iron").length === ironKept &&
  api.S.res.filter((r) => r === "horses").length === horsesKept);

api.newGame(1);
check("crossbowman locked without machinery", api.unitAvailable(0, "crossbowman") === false);
const upCoast = (() => {
  for (let i = 0; i < api.S.map.length; i++) {
    const x = i % 26, y = (i / 26) | 0;
    if (api.S.map[i] === 0 || api.S.map[i] === 5) continue;
    if (api.S.cities.some((c) => c.x === x && c.y === y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= 26 || ny >= 18) continue;
      if (api.S.map[ny * 26 + nx] === 0) return [x, y];
    }
  }
  return null;
})();
if (!upCoast) {
  check("upgrade test city founded on coast", false);
} else {
  api.foundCity(api.spawn("settler", 0, upCoast[0], upCoast[1]));
  const upCity = api.S.cities[0];
  for (let i = 0; i < api.S.res.length; i++)
    if (api.S.res[i] === "iron" || api.S.res[i] === "horses" || api.S.res[i] === "marble") api.S.res[i] = null;
  api.S.players[0].techs.push("archery", "bronze", "iron", "machinery", "gunpowder", "feudalism", "sailing", "astronomy");
  const upOwn = [];
  for (let i = 0; i < api.S.tileOwner.length; i++) if (api.S.tileOwner[i] === 0) upOwn.push(i);
  api.S.res[upOwn[0]] = "iron";
  api.S.res[upOwn[1]] = "horses";

  check("crossbowman unit data", UT.crossbowman.name === "Арбалетчик" && UT.crossbowman.letter === "Ар" &&
    UT.crossbowman.icon === "🎯" && UT.crossbowman.atk === 6 && UT.crossbowman.def === 5 &&
    UT.crossbowman.moves === 1 && UT.crossbowman.cost === 55 && UT.crossbowman.tech === "machinery");
  check("crossbowman buildable with machinery", api.unitAvailable(0, "crossbowman") === true);
  upCity.producing = { k: "unit", id: "crossbowman" };
  upCity.prodStored = 999;
  api.processEconomy();
  check("crossbowman produced in city", api.S.units.some((u) => u.owner === 0 && u.type === "crossbowman"));
  upCity.producing = null;

  check("upgrade chains declared", UT.warrior.upgrade === "swordsman" && UT.swordsman.upgrade === "musketman" &&
    UT.archer.upgrade === "crossbowman" && UT.spearman.upgrade === "musketman" &&
    UT.horseman.upgrade === "knight" && UT.galley.upgrade === "caravel" &&
    UT.settler.upgrade === null && UT.scout.upgrade === null && UT.catapult.upgrade === null &&
    UT.crossbowman.upgrade === null && UT.knight.upgrade === null && UT.musketman.upgrade === null &&
    UT.caravel.upgrade === null);
  let upCyc = false;
  for (const id in UT) {
    let cur = id, steps = 0;
    while (UT[cur].upgrade) {
      cur = UT[cur].upgrade;
      if (cur === id || ++steps > Object.keys(UT).length) { upCyc = true; break; }
    }
    if (upCyc) break;
  }
  check("upgrade chains acyclic and strictly priced", !upCyc &&
    Object.entries(UT).every(([, d]) => !d.upgrade || !!UT[d.upgrade] && UT[d.upgrade].cost > d.cost));
  check("upgradeCost formula max(10, 2x diff)", api.upgradeCost({ type: "warrior" }) === 50 &&
    api.upgradeCost({ type: "swordsman" }) === 110 && api.upgradeCost({ type: "archer" }) === 40 &&
    api.upgradeCost({ type: "spearman" }) === 120 && api.upgradeCost({ type: "horseman" }) === 60 &&
    api.upgradeCost({ type: "galley" }) === 40 && api.upgradeCost({ type: "musketman" }) === 0);
  check("debugApi exposes upgrade functions", typeof api.upgradeUnit === "function" && typeof api.upgradeCost === "function");

  const upW = api.spawn("warrior", 0, upCity.x, upCity.y);
  upW.atkBonus = 1;
  upW.moves = 1;
  const upWId = upW.id, upWX = upW.x, upWY = upW.y;
  api.S.players[0].gold = 100;
  const upr1 = api.upgradeUnit(upW);
  check("warrior upgraded to swordsman", upr1.ok === true && upW.type === "swordsman" && api.S.players[0].gold === 50);
  check("upgrade preserves id position atkBonus and spends turn",
    upW.id === upWId && upW.x === upWX && upW.y === upWY && upW.atkBonus === 1 && upW.moves === 0);
  check("upgrade logged", api.S.log.some((l) => l.includes("повышен до") && l.includes("−50")));
  api.S.players[0].gold = 200;
  check("swordsman upgraded to musketman", api.upgradeUnit(upW).ok === true && upW.type === "musketman" &&
    api.S.players[0].gold === 90 && upW.atkBonus === 1);
  const upA = api.spawn("archer", 0, upCity.x, upCity.y);
  api.S.players[0].gold = 100;
  check("archer upgraded to crossbowman", api.upgradeUnit(upA).ok === true && upA.type === "crossbowman" &&
    api.S.players[0].gold === 60);
  const upS = api.spawn("spearman", 0, upCity.x, upCity.y);
  api.S.players[0].gold = 200;
  check("spearman upgraded to musketman", api.upgradeUnit(upS).ok === true && upS.type === "musketman" &&
    api.S.players[0].gold === 80);

  const upH = api.spawn("horseman", 0, upCity.x, upCity.y);
  api.S.players[0].gold = 300;
  api.S.res[upOwn[0]] = null;
  const uprH1 = api.upgradeUnit(upH);
  check("horseman upgrade refused without iron", uprH1.ok === false && uprH1.reason.includes("ресурс") &&
    upH.type === "horseman" && api.S.players[0].gold === 300);
  api.S.res[upOwn[0]] = "iron";
  api.S.res[upOwn[1]] = null;
  const uprH2 = api.upgradeUnit(upH);
  check("horseman upgrade refused without horses", uprH2.ok === false && uprH2.reason.includes("ресурс") && upH.type === "horseman");
  api.S.res[upOwn[1]] = "horses";
  check("horseman upgraded to knight with resources", api.upgradeUnit(upH).ok === true && upH.type === "knight" &&
    api.S.players[0].gold === 240);

  let ownedSea = -1, freeSea = -1;
  for (let i = 0; i < api.S.map.length; i++) {
    if (api.S.map[i] !== 0) continue;
    if (api.S.tileOwner[i] === 0 && ownedSea === -1) ownedSea = i;
    if (api.S.tileOwner[i] === -1 && freeSea === -1) freeSea = i;
  }
  const upG = api.spawn("galley", 0, ownedSea % 26, (ownedSea / 26) | 0);
  api.S.players[0].gold = 100;
  check("galley upgraded on owned water", api.upgradeUnit(upG).ok === true && upG.type === "caravel" &&
    api.S.players[0].gold === 60);
  const upG2 = api.spawn("galley", 0, freeSea % 26, (freeSea / 26) | 0);
  const uprG2 = api.upgradeUnit(upG2);
  check("galley upgrade refused on neutral water", uprG2.ok === false && uprG2.reason.includes("территор") &&
    upG2.type === "galley" && api.S.players[0].gold === 60);

  let freeLand = -1;
  for (let i = 0; i < api.S.map.length; i++)
    if (api.S.map[i] !== 0 && api.S.map[i] !== 5 && api.S.tileOwner[i] === -1) { freeLand = i; break; }
  const upOff = api.spawn("warrior", 0, freeLand % 26, (freeLand / 26) | 0);
  api.S.players[0].gold = 999;
  const uprOff = api.upgradeUnit(upOff);
  check("upgrade refused off own territory", uprOff.ok === false && uprOff.reason.includes("территор") &&
    upOff.type === "warrior" && api.S.players[0].gold === 999);

  api.S.players[0].techs = api.S.players[0].techs.filter((t) => t !== "gunpowder");
  const upNoTech = api.spawn("spearman", 0, upCity.x, upCity.y);
  const uprNT = api.upgradeUnit(upNoTech);
  check("upgrade refused without target tech", uprNT.ok === false && uprNT.reason.includes("технолог") &&
    upNoTech.type === "spearman" && api.S.players[0].gold === 999);
  api.S.players[0].techs.push("gunpowder");

  const upPoor = api.spawn("warrior", 0, upCity.x, upCity.y);
  api.S.players[0].gold = 49;
  const uprP = api.upgradeUnit(upPoor);
  check("upgrade refused when short of gold", uprP.ok === false && uprP.reason.includes("золота") &&
    upPoor.type === "warrior" && api.S.players[0].gold === 49);
  const upDone = api.spawn("musketman", 0, upCity.x, upCity.y);
  check("upgrade refused without upgrade path", api.upgradeUnit(upDone).ok === false && upDone.type === "musketman");
}

api.newGame(1);
const ugSet = api.S.units.find((u) => u.owner === 1 && u.type === "settler");
api.foundCity(ugSet);
const ugCity = api.S.cities[0];
for (let i = 0; i < api.S.res.length; i++)
  if (api.S.res[i] === "iron" || api.S.res[i] === "horses" || api.S.res[i] === "marble") api.S.res[i] = null;
api.S.players[1].techs.push("iron");
const ugOwn = [];
for (let i = 0; i < api.S.tileOwner.length; i++) if (api.S.tileOwner[i] === 1) ugOwn.push(i);
api.S.res[ugOwn[0]] = "iron";
api.spawn("warrior", 1, ugCity.x, ugCity.y);
api.spawn("warrior", 1, ugCity.x, ugCity.y);
const ugRnd = Math.random;
api.declareWar(0, 1);
api.S.players[1].gold = 120;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = ugRnd; }
check("AI does not upgrade at war", api.S.units.filter((u) => u.owner === 1 && u.type === "swordsman").length === 0 &&
  api.S.players[1].gold === 120);
api.makePeace(0, 1);
api.S.players[1].gold = 300;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = ugRnd; }
check("AI upgrades one unit per turn at peace",
  api.S.units.filter((u) => u.owner === 1 && u.type === "swordsman").length === 1 &&
  api.S.units.filter((u) => u.owner === 1 && u.type === "warrior").length === 2 &&
  api.S.players[1].gold === 250);

api.newGame(1);
check("newGame initializes gp fields", api.S.players.every((p) => p.gpPoints === 0 && p.gpNext === 30 && p.gpRotate === 0));
check("great people unit data", ["gp_scientist", "gp_engineer", "gp_artist", "gp_prophet"].every((t) => {
  const d = UT[t];
  return d && d.gp && d.atk === 0 && d.def === 1 && d.moves === 2 && d.cost === 0 &&
    d.tech === null && d.upgrade === null && !!d.icon && !!d.letter;
}));
check("GREAT_PEOPLE table exposed", !!api.GREAT_PEOPLE && ["scientist", "engineer", "artist", "prophet"].every((k) =>
  api.GREAT_PEOPLE[k] && api.GREAT_PEOPLE[k].name && api.GREAT_PEOPLE[k].icon && api.GREAT_PEOPLE[k].desc) &&
  JSON.stringify(api.GP_ORDER) === '["scientist","engineer","artist","prophet"]');

const gpAppSrc = readFileSync("apps/civ/app.js", "utf8");
check("GP filtered from production list, action button in panel",
  gpAppSrc.includes("!d.gp") && gpAppSrc.includes('id="civ-gp"') && gpAppSrc.includes("useGreatPerson"));
check("3D models for 4 great people", readFileSync("apps/civ/models3d.js", "utf8")
  .split("gp_scientist").length === 2 && ["gp_engineer", "gp_artist", "gp_prophet"].every((t) =>
  readFileSync("apps/civ/models3d.js", "utf8").includes(`"${t}"`)));

api.S.units = [];
api.foundCity(api.spawn("settler", 0, cultSpots()[0][0], cultSpots()[0][1]));
const gpHome = api.S.cities[0];
check("buyForGold refuses GP units", api.buyForGold(gpHome.id, "unit", "gp_scientist").ok === false &&
  !api.S.units.some((u) => UT[u.type].gp));

const gpPair = freeLandPair();
const gpAtt = api.spawn("gp_prophet", 0, gpPair[0][0], gpPair[0][1]);
const gpPrey = api.spawn("settler", 1, gpPair[1][0], gpPair[1][1]);
api.declareWar(0, 1);
gpAtt.moves = 2;
api.attack(gpAtt, gpPrey.x, gpPrey.y);
check("GP cannot attack", api.S.units.includes(gpPrey) && api.S.units.includes(gpAtt) && gpAtt.moves === 2);
api.makePeace(0, 1);
api.S.units = api.S.units.filter((u) => u !== gpPrey && u !== gpAtt);

gpHome.pop = 1; gpHome.buildings = []; gpHome.religion = null; gpHome.producing = null;
api.S.players[0].researching = null;
api.S.players[0].gpPoints = 0;
api.processEconomy();
check("no culture bonus gives 0 gp points", api.S.players[0].gpPoints === 0);
gpHome.buildings = ["temple"];
const gpCult0 = gpHome.culture;
api.S.players[0].gpPoints = 0;
api.processEconomy();
check("gp points are floor of culture growth", gpHome.culture === gpCult0 + 3 && api.S.players[0].gpPoints === 1);
gpHome.religion = "oracle";
api.S.players[0].gpPoints = 0;
api.processEconomy();
check("temple plus religion gives 2 gp points", api.S.players[0].gpPoints === 2);

api.S.players[0].gpPoints = 28;
api.processEconomy();
check("GP born at threshold in city", api.S.units.some((u) => u.type === "gp_scientist" && u.x === gpHome.x && u.y === gpHome.y));
check("birth spends points and raises threshold", api.S.players[0].gpPoints === 0 &&
  api.S.players[0].gpNext === 45 && api.S.players[0].gpRotate === 1);
check("birth logged", api.S.log.some((l) => l.includes("родился в") && l.includes("Учёный")));

api.S.players[0].gpPoints = 43;
api.processEconomy();
check("second birth engineer, threshold 68", api.S.units.filter((u) => u.type === "gp_engineer").length === 1 &&
  api.S.players[0].gpNext === 68 && api.S.players[0].gpRotate === 2);
api.S.players[0].gpPoints = 66;
api.processEconomy();
api.S.players[0].gpPoints = 100;
api.processEconomy();
const gpBorn0 = api.S.units.filter((u) => UT[u.type].gp).length;
api.S.players[0].gpPoints = 999;
api.processEconomy();
check("round-robin scientist-engineer-artist-prophet-scientist",
  api.S.units.filter((u) => u.type === "gp_scientist").length === 2 &&
  api.S.units.filter((u) => u.type === "gp_engineer").length === 1 &&
  api.S.units.filter((u) => u.type === "gp_artist").length === 1 &&
  api.S.units.filter((u) => u.type === "gp_prophet").length === 1);
check("at most one GP birth per player per turn", api.S.units.filter((u) => UT[u.type].gp).length === gpBorn0 + 1);

api.S.units = api.S.units.filter((u) => !UT[u.type].gp);
api.foundCity(api.spawn("settler", 0, cultSpots()[1][0], cultSpots()[1][1]));
const gpSecond = api.S.cities[api.S.cities.length - 1];
gpHome.pop = 2; gpSecond.pop = 5;
api.S.players[0].gpPoints = api.S.players[0].gpNext;
api.processEconomy();
check("GP born in most populous city", api.S.units[api.S.units.length - 1].x === gpSecond.x &&
  api.S.units[api.S.units.length - 1].y === gpSecond.y);
api.S.units = api.S.units.filter((u) => !UT[u.type].gp);
gpHome.pop = 5; gpSecond.pop = 5;
api.S.players[0].gpPoints = api.S.players[0].gpNext;
api.processEconomy();
check("pop tie broken by smaller city id", api.S.units[api.S.units.length - 1].x === gpHome.x &&
  api.S.units[api.S.units.length - 1].y === gpHome.y);
api.S.units = api.S.units.filter((u) => !UT[u.type].gp);

const gpEng = api.spawn("gp_engineer", 0, gpHome.x, gpHome.y);
gpHome.prodStored = 17;
const gpEngR = api.useGreatPerson(gpEng.id);
check("engineer adds 300 production and is consumed", gpEngR.ok === true && gpHome.prodStored === 317 &&
  !api.S.units.includes(gpEng));
api.foundCity(api.spawn("settler", 1, cultSpots()[2][0], cultSpots()[2][1]));
const gpForeign = api.S.cities[api.S.cities.length - 1];
const gpEng2 = api.spawn("gp_engineer", 0, gpForeign.x, gpForeign.y);
const gpEng2R = api.useGreatPerson(gpEng2.id);
check("engineer refused outside own city", gpEng2R.ok === false && gpEng2R.reason.includes("своём городе") &&
  api.S.units.includes(gpEng2) && gpForeign.prodStored === 0);

const gpProph = api.spawn("gp_prophet", 0, gpSecond.x, gpSecond.y);
const gpProphR = api.useGreatPerson(gpProph.id);
check("prophet founds religion in standing city", gpProphR.ok === true &&
  api.S.religions.some((r) => r.id === "oracle" && r.owner === 0 && r.holyCityId === gpSecond.id) &&
  gpSecond.religion === "oracle" && !api.S.units.includes(gpProph));
api.foundReligion(0, "muses");
api.foundReligion(0, "sungod");
const gpProph2 = api.spawn("gp_prophet", 0, gpHome.x, gpHome.y);
api.S.players[0].gold = 100;
const gpProph2R = api.useGreatPerson(gpProph2.id);
check("prophet fallback +50 gold when all religions founded", gpProph2R.ok === true &&
  api.S.players[0].gold === 150 && !api.S.units.includes(gpProph2));

api.S.cities = api.S.cities.filter((c) => c === gpHome);
gpHome.pop = 1; gpHome.culture = 0; gpHome.buildings = []; gpHome.religion = null;
api.recomputeBorders();
const gpArt = api.spawn("gp_artist", 0, gpHome.x, gpHome.y);
const artTileX = gpHome.x + 2 <= 25 ? gpHome.x + 2 : gpHome.x - 2;
const artBefore = api.getTileOwner()[gpHome.y * 26 + artTileX];
const gpArtR = api.useGreatPerson(gpArt.id);
check("artist adds 100 culture, borders grow instantly", gpArtR.ok === true && gpHome.culture === 100 &&
  !api.S.units.includes(gpArt) && artBefore !== 0 &&
  api.getTileOwner()[gpHome.y * 26 + artTileX] === 0);

const gpSciPair = freeLandPair();
api.S.players[0].techs = [];
api.S.players[0].researching = "agriculture";
api.S.players[0].progress = 7;
const gpSci = api.spawn("gp_scientist", 0, gpSciPair[0][0], gpSciPair[0][1]);
const gpSciR = api.useGreatPerson(gpSci.id);
check("scientist grants cheapest tech in the field and is consumed", gpSciR.ok === true &&
  api.S.players[0].techs.includes("agriculture") && api.S.players[0].researching === null &&
  api.S.players[0].progress === 0 && !api.S.units.includes(gpSci));
api.S.players[0].techs = Object.keys(api.TECHS);
const gpSci2 = api.spawn("gp_scientist", 0, gpSciPair[0][0], gpSciPair[0][1]);
const gpSci2R = api.useGreatPerson(gpSci2.id);
check("scientist refused when tech tree exhausted", gpSci2R.ok === false && api.S.units.includes(gpSci2));

api.newGame(1);
const gpAiSet = api.S.units.find((u) => u.owner === 1 && u.type === "settler");
api.foundCity(gpAiSet);
const gpAiCity = api.S.cities.find((c) => c.owner === 1);
api.S.units = api.S.units.filter((u) => u.owner !== 1 || u.type !== "warrior");
const gpAiSci = api.spawn("gp_scientist", 1, gpAiCity.x, gpAiCity.y);
const gpAiTechs0 = api.S.players[1].techs.length;
const gpAiRnd = Math.random;
Math.random = () => 0;
try { api.aiTurnOne(1); } finally { Math.random = gpAiRnd; }
check("AI uses great person in its city", !api.S.units.includes(gpAiSci) &&
  api.S.players[1].techs.length === gpAiTechs0 + 1);

api.newGame(1);
api.save();
const rawGp = JSON.parse(store["civ1_save"]);
rawGp.players.forEach((p) => { delete p.gpPoints; delete p.gpNext; delete p.gpRotate; });
store["civ1_save"] = JSON.stringify(rawGp);
check("old save migrates gp fields", api.load() === true &&
  api.S.players.every((p) => p.gpPoints === 0 && p.gpNext === 30 && p.gpRotate === 0));
api.S.players[0].gpPoints = 12;
api.S.players[0].gpNext = 77;
api.S.players[0].gpRotate = 3;
api.save();
check("gp fields survive save-load roundtrip", api.load() === true &&
  api.S.players[0].gpPoints === 12 && api.S.players[0].gpNext === 77 && api.S.players[0].gpRotate === 3);

api.newGame(1);
const gft0 = api.grantFreeTech(api.S.players[0]);
check("grantFreeTech gives cheapest available", gft0 === "agriculture" && api.S.players[0].techs.includes("agriculture"));
api.S.players[0].researching = "archery";
api.S.players[0].progress = 10;
const gft1 = api.grantFreeTech(api.S.players[0]);
check("grantFreeTech resets matching research", gft1 === "archery" &&
  api.S.players[0].researching === null && api.S.players[0].progress === 0);

if (!mutation) {
  const expectFail = {
    a: "FAIL granary +2 food",
    b: "FAIL processEconomy updates borders after growth",
    c: "FAIL pyramids +2 prod in all owner cities",
    d: "FAIL AI-AI peace concluded via endTurn",
  };
  for (const m of ["a", "b", "c", "d"]) {
    const r = spawnSync("node", ["test/run.mjs"], { encoding: "utf8", env: { ...process.env, CIV_MUTATION: m, CIV_FAST: "1" } });
    check(`mutation ${m} caught by tests`, r.status !== 0 && r.status !== null && (r.stdout || "").includes(expectFail[m]));
  }
}

check("suite within time budget", Date.now() - t0 < 30000);

console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
