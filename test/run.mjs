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

const { execSync } = await import("node:child_process");
const { writeFileSync } = await import("node:fs");
execSync("rm -rf /tmp/civmod && mkdir -p /tmp/civmod");
execSync("cp apps/civ/*.js /tmp/civmod/");
writeFileSync("/tmp/civmod/package.json", '{"type":"module"}');
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

console.log(failures === 0 ? "ALL PASSED" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
