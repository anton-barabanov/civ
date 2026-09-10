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

const mutation = process.env.CIV_MUTATION === "a" || process.env.CIV_MUTATION === "b" ? process.env.CIV_MUTATION : null;
const MUT_TARGETS = {
  a: ["foodFlat: 2", "foodFlat: 0"],
  b: ["  recomputeBorders();\n  for (const u of S.units) u.moves = UNITS[u.type].moves;", "  for (const u of S.units) u.moves = UNITS[u.type].moves;"],
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

let coastal = null;
for (let i = 0; i < api.S.map.length; i++) {
  const x = i % 26, y = (i / 26) | 0;
  if (api.S.map[i] === 0) continue;
  const hasWater = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx, dy]) => {
    const nx = x + dx, ny = y + dy;
    return nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && api.S.map[ny * 26 + nx] === 0;
  });
  if (hasWater) { coastal = [x, y]; break; }
}
check("coastal tile found", coastal !== null);
if (coastal) {
  const w = api.spawn("warrior", 0, coastal[0], coastal[1]);
  const r = api.reachable(w);
  const seaCand = [[1,0],[-1,0],[0,1],[0,-1]]
    .map(([dx, dy]) => [coastal[0] + dx, coastal[1] + dy])
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < 26 && ny < 18 && api.S.map[ny * 26 + nx] === 0);
  const seaKey = seaCand.length ? seaCand[0][1] * 26 + seaCand[0][0] : -1;
  check("land unit can embark", seaKey >= 0 && r.has(seaKey));
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
  check("city yields sane", y.food >= 2 && y.prod >= 1 && y.sci >= 2);
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
    check("sea trade bonus applied", yy.trade === true && yy.prod >= 3 && yy.sci >= 3);
    traded[0].buildings.push("market");
    const ym = api.cityYields(traded[0]);
    check("market doubles sea trade", ym.prod === yy.prod + 2 && ym.sci === yy.sci + 1);
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

api.newGame(1);
const obAtt = api.spawn("warrior", 0, 5, 5);
const obDef = api.spawn("settler", 1, 6, 5);
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

const dAtt = api.spawn("warrior", 0, 5, 5);
const dDef = api.spawn("settler", 1, 6, 5);
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

if (!mutation) {
  const expectFail = { a: "FAIL granary +2 food", b: "FAIL processEconomy updates borders after growth" };
  for (const m of ["a", "b"]) {
    const r = spawnSync("node", ["test/run.mjs"], { encoding: "utf8", env: { ...process.env, CIV_MUTATION: m } });
    check(`mutation ${m} caught by tests`, r.status !== 0 && r.status !== null && (r.stdout || "").includes(expectFail[m]));
  }
}

check("suite within time budget", Date.now() - t0 < 20000);

console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
