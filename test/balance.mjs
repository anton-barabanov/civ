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
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 36 * 34, height: 24 * 34 }),
    width: 36 * 34,
    height: 24 * 34,
  };
};

globalThis.document = {
  getElementById: () => fakeEl(),
  createElement: () => fakeEl(),
  appendChild: () => {},
};
globalThis.window = {};
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const arg = (n, d) => {
  const a = process.argv.find((s) => s.startsWith(`--${n}=`));
  return a ? a.split("=").slice(1).join("=") : d;
};
const games = Number(arg("games", 30));
const diffs = arg("diffs", "0,1,2").split(",").map(Number);
const seed = Number(arg("seed", 20260914));
const label = arg("label", "run");
const maxTurns = Number(arg("maxturns", 250));
const outDir = arg("outdir", "/tmp/civ-balance");

let rndState = seed >>> 0;
Math.random = () => {
  rndState = (Math.imul(rndState, 1664525) + 1013904223) >>> 0;
  return rndState / 4294967296;
};

const { mkdirSync, writeFileSync } = await import("node:fs");
mkdirSync(outDir, { recursive: true });

const { execSync } = await import("node:child_process");
const modDir = `/tmp/civbal-${label}`;
execSync(`rm -rf ${modDir} && mkdir -p ${modDir} && cp ${new URL("../apps/civ/*.js", import.meta.url).pathname} ${modDir}/`);
writeFileSync(`${modDir}/package.json`, '{"type":"module"}');

const { debugApi } = await import(`${modDir}/app.js`);
const api = debugApi();

const sumPop = (i) => api.S.cities.filter((c) => c.owner === i).reduce((a, c) => a + c.pop, 0);
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

function playGame(diff, gi) {
  rndState = (seed + gi * 7919 + diff * 104729) >>> 0;
  api.newGame(diff, 5, 1);
  api.S.players.forEach((p) => { p.isHuman = false; });
  const m = {
    diff, game: gi, turns: null, over: null, winner: null,
    pop0t50: null, pop0t100: null, pop0t150: null,
    fairness50: null, relCities100: null,
    wars: 0, peaces: 0, captures: 0, flips: 0, riots: 0, bankrupts: 0,
  };
  const warMap = () => {
    const w = new Map();
    for (const k of Object.keys(api.S.relations)) w.set(k, api.S.relations[k].war);
    return w;
  };
  let prevWar = warMap();
  let prevOwner = new Map(api.S.cities.map((c) => [c.id, c.owner]));
  let prevRiot = new Map(api.S.cities.map((c) => [c.id, c.riot || 0]));
  const zeroStreak = new Array(api.S.players.length).fill(0);
  const bankrupted = new Set();
  while (!api.S.over && api.S.turn <= maxTurns) {
    api.endTurn();
    const curWar = warMap();
    for (const [k, w] of curWar) {
      if (w && !prevWar.get(k)) m.wars++;
      if (!w && prevWar.get(k)) m.peaces++;
    }
    prevWar = curWar;
    const curOwner = new Map(api.S.cities.map((c) => [c.id, c.owner]));
    for (const [id, o] of curOwner) {
      const prev = prevOwner.get(id);
      if (prev === undefined || prev === o) continue;
      if (api.atWar(prev, o)) m.captures++;
      else m.flips++;
    }
    prevOwner = curOwner;
    for (const c of api.S.cities) {
      if (c.riot && !prevRiot.get(c.id)) m.riots++;
      prevRiot.set(c.id, c.riot || 0);
    }
    api.S.players.forEach((p, i) => {
      if (p.gold === 0) {
        zeroStreak[i]++;
        if (zeroStreak[i] >= 20) bankrupted.add(i);
      } else zeroStreak[i] = 0;
    });
    if (api.S.turn === 50 || api.S.turn === 100 || api.S.turn === 150) {
      const pops = api.S.players.map((_, i) => sumPop(i));
      const p0 = pops[0];
      const bestOther = Math.max(...pops.slice(1), 1);
      if (api.S.turn === 50) { m.pop0t50 = p0; m.fairness50 = Math.round((p0 / bestOther) * 100) / 100; }
      if (api.S.turn === 100) { m.pop0t100 = p0; m.relCities100 = api.S.cities.filter((c) => c.religion).length; }
      if (api.S.turn === 150) m.pop0t150 = p0;
    }
  }
  m.bankrupts = bankrupted.size;
  m.turns = api.S.turn;
  m.over = api.S.over ? api.S.over.type : "limit";
  m.winner = api.S.over ? api.S.over.winner : null;
  return m;
}

const t0 = Date.now();
const report = { label, seed, games, maxTurns, diffs: {} };
for (const d of diffs) {
  const rows = [];
  for (let g = 0; g < games; g++) rows.push(playGame(d, g));
  writeFileSync(`${outDir}/${label}-diff${d}.json`, JSON.stringify(rows, null, 1));
  const finished = rows.filter((r) => r.over !== "limit");
  const types = { conquest: 0, culture: 0, space: 0, diplomacy: 0, limit: 0 };
  for (const r of rows) types[r.over]++;
  report.diffs[d] = {
    games, finished: finished.length, limit: types.limit,
    medianTurnsWin: median(finished.map((r) => r.turns)),
    meanTurnsAll: mean(rows.map((r) => r.turns)),
    types,
    pop0t50: mean(rows.map((r) => r.pop0t50).filter((x) => x !== null)),
    pop0t100: mean(rows.map((r) => r.pop0t100).filter((x) => x !== null)),
    pop0t150: mean(rows.map((r) => r.pop0t150).filter((x) => x !== null)),
    fairness50: mean(rows.map((r) => r.fairness50).filter((x) => x !== null)),
    relCities100: mean(rows.map((r) => r.relCities100).filter((x) => x !== null)),
    bankruptShare: rows.reduce((a, r) => a + r.bankrupts, 0) / (games * api.S.players.length),
    warsPerGame: mean(rows.map((r) => r.wars)),
    peacesPerGame: mean(rows.map((r) => r.peaces)),
    capturesPerGame: mean(rows.map((r) => r.captures)),
    flipsPerGame: mean(rows.map((r) => r.flips)),
    riotsPerGame: mean(rows.map((r) => r.riots)),
  };
}
report.seconds = Math.round((Date.now() - t0) / 100) / 10;
writeFileSync("/tmp/balance_report.json", JSON.stringify(report, null, 1));

const pct = (n) => Math.round((n / games) * 100);
for (const d of diffs) {
  const r = report.diffs[d];
  console.log(`diff ${d}: финишей ${r.finished}/${games}, медиана победы ход ${r.medianTurnsWin}, лимит ${pct(r.types.limit)}%`);
  console.log(`  победы: conquest ${pct(r.types.conquest)}% culture ${pct(r.types.culture)}% space ${pct(r.types.space)}% diplomacy ${pct(r.types.diplomacy)}%`);
  console.log(`  Σpop0: t50 ${r.pop0t50?.toFixed(1)} t100 ${r.pop0t100?.toFixed(1)} t150 ${r.pop0t150?.toFixed(1)} | fairness50 ${r.fairness50?.toFixed(2)} | религ. городов@100 ${r.relCities100?.toFixed(1)}`);
  console.log(`  банкроты ${Math.round(r.bankruptShare * 100)}% | войны ${r.warsPerGame?.toFixed(1)} миры ${r.peacesPerGame?.toFixed(1)} | захваты ${r.capturesPerGame?.toFixed(2)} перевороты ${r.flipsPerGame?.toFixed(2)} бунты ${r.riotsPerGame?.toFixed(2)}`);
}
console.log(`label=${label} seed=${seed} games=${games}×diffs=[${diffs}] ${report.seconds}s → ${outDir}/${label}-diff*.json, /tmp/balance_report.json`);
