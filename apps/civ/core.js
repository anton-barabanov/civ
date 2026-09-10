const TILE = { OCEAN: 0, GRASS: 1, PLAINS: 2, FOREST: 3, HILLS: 4, MOUNTAIN: 5 };

const TERRAIN = {
  0: { name: "Океан", color: "#1b3a5c", food: 1, prod: 0, passable: false, def: 0 },
  1: { name: "Луга", color: "#3e7a3a", food: 2, prod: 0, passable: true, def: 0 },
  2: { name: "Равнина", color: "#8a7f47", food: 1, prod: 1, passable: true, def: 0 },
  3: { name: "Лес", color: "#24522a", food: 1, prod: 2, passable: true, def: 25 },
  4: { name: "Холмы", color: "#6e5a35", food: 1, prod: 2, passable: true, def: 25 },
  5: { name: "Горы", color: "#5a5a5f", food: 0, prod: 1, passable: false, def: 0 },
};

const UNITS = {
  settler: { name: "Поселенец", letter: "П", icon: "🛖", atk: 0, def: 1, moves: 1, cost: 30, tech: null, upgrade: null },
  scout: { name: "Разведчик", letter: "Р", icon: "🧭", atk: 1, def: 1, moves: 2, cost: 15, tech: null, upgrade: null },
  warrior: { name: "Воин", letter: "В", icon: "⚔️", atk: 2, def: 2, moves: 1, cost: 20, tech: null, upgrade: "swordsman" },
  archer: { name: "Лучник", letter: "Л", icon: "🏹", atk: 3, def: 4, moves: 1, cost: 35, tech: "archery", upgrade: "crossbowman" },
  swordsman: { name: "Мечник", letter: "М", icon: "🗡️", atk: 5, def: 4, moves: 1, cost: 45, tech: "iron", res: ["iron"], upgrade: "musketman" },
  galley: { name: "Галера", letter: "Г", icon: "⛵", atk: 3, def: 2, moves: 3, cost: 35, tech: "sailing", naval: true, capacity: 2, upgrade: "caravel" },
  caravel: { name: "Каравелла", letter: "К", icon: "🚢", atk: 5, def: 3, moves: 4, cost: 55, tech: "astronomy", naval: true, capacity: 3, upgrade: null },
  spearman: { name: "Копейщик", letter: "Ц", icon: "🔱", atk: 3, def: 5, moves: 1, cost: 40, tech: "bronze", upgrade: "musketman" },
  horseman: { name: "Всадник", letter: "Вс", icon: "🐎", atk: 5, def: 3, moves: 2, cost: 55, tech: "horsebackriding", res: ["horses"], upgrade: "knight" },
  catapult: { name: "Катапульта", letter: "Т", icon: "💥", atk: 10, def: 2, moves: 1, cost: 70, tech: "machinery", upgrade: null },
  crossbowman: { name: "Арбалетчик", letter: "Ар", icon: "🎯", atk: 6, def: 5, moves: 1, cost: 55, tech: "machinery", upgrade: null },
  knight: { name: "Рыцарь", letter: "Р", icon: "🏇", atk: 8, def: 6, moves: 2, cost: 85, tech: "feudalism", res: ["iron", "horses"], upgrade: null },
  musketman: { name: "Мушкетёр", letter: "Му", icon: "🔫", atk: 10, def: 8, moves: 1, cost: 100, tech: "gunpowder", upgrade: null },
  gp_scientist: { name: "Учёный", letter: "У", icon: "🔬", atk: 0, def: 1, moves: 2, cost: 0, tech: null, upgrade: null, gp: "scientist" },
  gp_engineer: { name: "Инженер", letter: "И", icon: "🔧", atk: 0, def: 1, moves: 2, cost: 0, tech: null, upgrade: null, gp: "engineer" },
  gp_artist: { name: "Художник", letter: "Х", icon: "🎨", atk: 0, def: 1, moves: 2, cost: 0, tech: null, upgrade: null, gp: "artist" },
  gp_prophet: { name: "Пророк", letter: "П", icon: "🙏", atk: 0, def: 1, moves: 2, cost: 0, tech: null, upgrade: null, gp: "prophet" },
};

const DIFFICULTIES = [
  { key: "easy", title: "Легко", prodMult: 0.75, sciMult: 0.75, aggroTurn: 30, aggroRange: 4, maxCities: 3, settlerChance: 0.6, wonderChance: 0.08 },
  { key: "normal", title: "Норма", prodMult: 1.0, sciMult: 1.0, aggroTurn: 15, aggroRange: 6, maxCities: 5, settlerChance: 0.7, wonderChance: 0.15 },
  { key: "hard", title: "Сложно", prodMult: 1.4, sciMult: 1.4, aggroTurn: 8, aggroRange: 8, maxCities: 7, settlerChance: 0.8, wonderChance: 0.25 },
];

const PEACE_WAR_LEN = 10;
const PEACE_STRENGTH = 0.6;

const BUILDINGS = {
  granary: { name: "Амбар", cost: 40, tech: "pottery", desc: "+2 еды", effects: { foodFlat: 2 } },
  library: { name: "Библиотека", cost: 50, tech: "writing", desc: "+50% науки", effects: { sciMult: 1.5 } },
  walls: { name: "Стены", cost: 40, tech: "masonry", desc: "+50% защиты города", effects: { defMult: 1.5 } },
  forge: { name: "Кузница", cost: 55, tech: "bronze", desc: "+2 производства", effects: { prodFlat: 2 } },
  temple: { name: "Храм", cost: 50, tech: "mysticism", desc: "+2 культуры", effects: { culture: 2 } },
  market: { name: "Рынок", cost: 55, tech: "currency", desc: "Удваивает золотой доход от морской торговли", effects: { tradeMult: 2 } },
  university: { name: "Университет", cost: 80, tech: "education", desc: "+3 науки, +1 культуры", effects: { sciFlat: 3, culture: 1 } },
  barracks: { name: "Казармы", cost: 45, tech: "iron", desc: "+1 атаки юнитам, созданным в городе", effects: { unitAtk: 1 } },
  aqueduct: { name: "Акведук", cost: 60, tech: "engineering", desc: "+3 к пределу населения", effects: { maxPop: 3 } },
};

const WONDERS = {
  pyramids: { name: "Пирамиды", icon: "🔺", cost: 160, tech: "masonry", desc: "+2 производства во всех городах", effects: { prodFlat: 2 } },
  greatlibrary: { name: "Великая библиотека", icon: "📚", cost: 180, tech: "literature", desc: "+50% науки во всех городах", effects: { sciMult: 1.5 } },
  colossus: { name: "Колосс", icon: "🗿", cost: 160, tech: "currency", desc: "Удваивает золотой доход от морской торговли во всех городах", effects: { tradeMult: 2 } },
  greatwall: { name: "Великая стена", icon: "🧱", cost: 150, tech: "construction", desc: "+50% защиты всех городов", effects: { defMult: 1.5 } },
  oraclew: { name: "Оракул", icon: "✨", cost: 130, tech: "mysticism", desc: "Бесплатная технология при завершении", effects: { freeTech: 1 } },
};

const TECHS = {
  agriculture: { name: "Земледелие", cost: 18, req: [] },
  archery: { name: "Стрельба из лука", cost: 22, req: [] },
  pottery: { name: "Гончарное дело", cost: 26, req: ["agriculture"] },
  writing: { name: "Письменность", cost: 30, req: ["agriculture"] },
  masonry: { name: "Каменная кладка", cost: 34, req: ["archery"] },
  bronze: { name: "Обработка бронзы", cost: 44, req: ["pottery"] },
  wheel: { name: "Колесо", cost: 44, req: ["pottery"] },
  iron: { name: "Обработка железа", cost: 60, req: ["bronze"] },
  sailing: { name: "Парусное дело", cost: 32, req: ["pottery"] },
  mathematics: { name: "Математика", cost: 60, req: ["writing"] },
  astronomy: { name: "Астрономия", cost: 80, req: ["mathematics"] },
  construction: { name: "Строительство", cost: 70, req: ["masonry", "wheel"] },
  currency: { name: "Деньги", cost: 70, req: ["mathematics"] },
  literature: { name: "Литература", cost: 80, req: ["writing", "currency"] },
  mysticism: { name: "Мистицизм", cost: 26, req: ["agriculture"] },
  horsebackriding: { name: "Коневодство", cost: 55, req: ["wheel"] },
  monarchy: { name: "Монархия", cost: 80, req: ["mysticism", "bronze"] },
  feudalism: { name: "Кодекс рыцаря", cost: 110, req: ["monarchy", "iron"] },
  engineering: { name: "Инженерия", cost: 90, req: ["construction", "mathematics"] },
  machinery: { name: "Машиностроение", cost: 120, req: ["engineering"] },
  banking: { name: "Банковское дело", cost: 105, req: ["currency", "monarchy"] },
  education: { name: "Образование", cost: 115, req: ["literature", "mathematics"] },
  gunpowder: { name: "Порох", cost: 140, req: ["machinery", "education"] },
};

const RELIGIONS = {
  oracle: { name: "Учение Оракула", tech: "mysticism", icon: "🔮", color: "#b06bd9" },
  muses: { name: "Культ Муз", tech: "literature", icon: "📜", color: "#3aa88a" },
  sungod: { name: "Вера Ра", tech: "monarchy", icon: "☀", color: "#e8c34a" },
};

const RESOURCES = {
  fish: { name: "Рыба", icon: "🐟" },
  whale: { name: "Кит", icon: "🐋" },
  iron: { name: "Железо", icon: "⛏", terrains: [TILE.FOREST, TILE.HILLS] },
  horses: { name: "Лошади", icon: "🐎", terrains: [TILE.GRASS, TILE.PLAINS] },
  marble: { name: "Мрамор", icon: "🏛", terrains: [TILE.HILLS] },
};

const GREAT_PEOPLE = {
  scientist: { name: "Учёный", icon: "🔬", desc: "Бесплатная технология" },
  engineer: { name: "Инженер", icon: "🔧", desc: "+300 производства в город" },
  artist: { name: "Художник", icon: "🎨", desc: "+100 культуры в город" },
  prophet: { name: "Пророк", icon: "🙏", desc: "Основать религию или +50 золота" },
};

const GP_ORDER = ["scientist", "engineer", "artist", "prophet"];
const GP_BASE_THRESHOLD = 30;

const REL_SPREAD_RADIUS = 3;
const REL_SPREAD_THRESHOLD = 5;

const CULTURE_WIN_CITIES = 3;
const CULTURE_WIN_THRESHOLD = 200;

const NATIONS = [
  { name: "Рим", color: "#4a90d9", cityNames: ["Рим", "Антиум", "Кумы", "Неаполь", "Равенна", "Арримин", "Арретий", "Медиолан"] },
  { name: "Галлы", color: "#d9534f", cityNames: ["Герговия", "Аварик", "Бибракте", "Аlesia", "Нуманция", "Оппид", "Лутеция", "Викс"] },
  { name: "Египет", color: "#e8c34a", cityNames: ["Мемфис", "Фивы", "Гелиополь", "Элефантина", "Гиза", "Абидос", "Саис", "Танис"] },
  { name: "Греция", color: "#3aa88a", cityNames: ["Афины", "Спарта", "Коринф", "Аргос", "Дельфы", "Милет", "Олинф", "Родос"] },
  { name: "Карфаген", color: "#9a6bd9", cityNames: ["Карфаген", "Утика", "Гадрумет", "Гиппон", "Лептис", "Тапс", "Керкуан", "Мотия"] },
  { name: "Персия", color: "#e07b39", cityNames: ["Персеполь", "Сузы", "Экбатана", "Вавилон", "Пасаргады", "Тиспа", "Дербент", "Артакса"] },
];

const W = 26, H = 18, TS = 34;
const SAVE_KEY = "civ1_save";

let S = null;
let visible = null;

const key = (x, y) => y * W + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const dist = (a, b, c, d) => Math.max(Math.abs(a - c), Math.abs(b - d));

function neighbors(x, y) {
  const r = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (inMap(x + dx, y + dy)) r.push([x + dx, y + dy]);
    }
  return r;
}

function unitsAt(x, y) { return S.units.filter((u) => u.x === x && u.y === y); }
function cityAt(x, y) { return S.cities.find((c) => c.x === x && c.y === y) || null; }
function cityById(id) { return S.cities.find((c) => c.id === id) || null; }
function unitById(id) { return S.units.find((u) => u.id === id) || null; }

function isNaval(u) { return !!UNITS[u.type].naval; }

function shipAt(x, y, owner) {
  return unitsAt(x, y).find((o) => isNaval(o) && o.owner === owner) || null;
}

function cargoCount(x, y) {
  return unitsAt(x, y).filter((o) => !isNaval(o)).length;
}

function canEnter(u, x, y) {
  const t = S.map[key(x, y)];
  if (isNaval(u)) return t === TILE.OCEAN;
  if (t === TILE.OCEAN) {
    const ship = shipAt(x, y, u.owner);
    if (!ship) return false;
    return cargoCount(x, y) < (UNITS[ship.type].capacity || 0);
  }
  return t !== TILE.MOUNTAIN;
}

function nextInStack(units, currentId) {
  if (!units || !units.length) return null;
  const i = units.findIndex((u) => u.id === currentId);
  if (i === -1) return units[0];
  return units[(i + 1) % units.length];
}

function adjWater(x, y) {
  return neighbors(x, y).find(([nx, ny]) => S.map[key(nx, ny)] === TILE.OCEAN) || null;
}

function isCoastal(x, y) { return adjWater(x, y) !== null; }

function makeNoise(gw, gh) {
  const g = new Float32Array((gw + 1) * (gh + 1));
  for (let i = 0; i < g.length; i++) g[i] = Math.random();
  return (u, v) => {
    const x = Math.min(gw - 0.001, Math.max(0, u));
    const y = Math.min(gh - 0.001, Math.max(0, v));
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g[yi * (gw + 1) + xi], b = g[yi * (gw + 1) + xi + 1];
    const c = g[(yi + 1) * (gw + 1) + xi], d = g[(yi + 1) * (gw + 1) + xi + 1];
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

const isWaterTile = (t) => t === TILE.OCEAN;
const isLandTile = (t) => t !== TILE.OCEAN;

function floodComponents(map, isClass) {
  const seen = new Array(W * H).fill(false);
  const comps = [];
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || !isClass(map[i])) continue;
    const cells = [];
    const stack = [i];
    seen[i] = true;
    let edge = false;
    while (stack.length) {
      const j = stack.pop();
      cells.push(j);
      const x = j % W, y = (j / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!inMap(nx, ny)) continue;
        const k = key(nx, ny);
        if (!seen[k] && isClass(map[k])) { seen[k] = true; stack.push(k); }
      }
    }
    comps.push({ cells, edge });
  }
  return comps;
}

function cleanupBodies(map) {
  for (const c of floodComponents(map, isWaterTile))
    if (!c.edge && c.cells.length < 6)
      c.cells.forEach((j) => { map[j] = TILE.GRASS; });
  for (const c of floodComponents(map, isLandTile))
    if (c.cells.length < 3)
      c.cells.forEach((j) => { map[j] = TILE.OCEAN; });
}

function largestLandComponent(map) {
  let best = [];
  for (const c of floodComponents(map, isLandTile))
    if (c.cells.length > best.length) best = c.cells;
  return new Set(best);
}

function scatterResources(map) {
  const res = new Array(W * H).fill(null);
  for (let i = 0; i < W * H; i++) {
    if (map[i] !== TILE.OCEAN) continue;
    const x = i % W, y = (i / W) | 0;
    const nearLand = neighbors(x, y).some(([nx, ny]) => map[key(nx, ny)] !== TILE.OCEAN);
    if (!nearLand) continue;
    const r = Math.random();
    if (r < 0.10) res[i] = "fish";
    else if (r < 0.13) res[i] = "whale";
  }
  scatterLandResources(map, res);
  return res;
}

function scatterLandResources(map, res) {
  const targets = { iron: 6, horses: 5, marble: 4 };
  for (const id in targets) {
    const cand = [];
    for (let i = 0; i < W * H; i++)
      if (!res[i] && RESOURCES[id].terrains.includes(map[i])) cand.push(i);
    for (let j = 0; j < targets[id] && cand.length; j++)
      res[cand.splice((Math.random() * cand.length) | 0, 1)[0]] = id;
  }
  guaranteeLandResources(map, res);
}

function guaranteeLandResources(map, res) {
  const cityOn = (i) => S && S.cities && S.cities.some((c) => key(c.x, c.y) === i);
  const comps = floodComponents(map, isLandTile).filter((c) => c.cells.length >= 25);
  for (const comp of comps) {
    for (const id of ["iron", "horses", "marble"]) {
      if (comp.cells.some((i) => res[i] === id)) continue;
      let pool = comp.cells.filter((i) => !res[i] && !cityOn(i) && RESOURCES[id].terrains.includes(map[i]));
      if (!pool.length)
        pool = comp.cells.filter((i) => !res[i] && !cityOn(i) && map[i] !== TILE.OCEAN && map[i] !== TILE.MOUNTAIN);
      if (pool.length) res[pool[(Math.random() * pool.length) | 0]] = id;
    }
  }
}

function carveChannel(map) {
  const comp = largestLandComponent(map);
  if (comp.size < 90) return false;
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (const i of comp) {
    const x = i % W, y = (i / W) | 0;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const cx = Math.floor((minX + maxX) / 2);
  let offset = 0;
  for (let y = minY; y <= maxY; y++) {
    offset = Math.max(-2, Math.min(2, offset + (Math.random() < 0.5 ? 1 : -1)));
    for (let w = 0; w < 2; w++) {
      const x = cx + offset + w;
      if (inMap(x, y)) map[key(x, y)] = TILE.OCEAN;
    }
  }
  return true;
}

function generateMap() {
  let lastMap = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const coarse = makeNoise(7, 5);
    const fine = makeNoise(13, 9);
    const elev = new Float32Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        let e = coarse((x / W) * 6, (y / H) * 4) + 0.45 * fine((x / W) * 12, (y / H) * 8);
        const d = Math.min(x, y, W - 1 - x, H - 1 - y);
        if (d < 2) e -= (2 - d) * 0.25;
        elev[key(x, y)] = e;
      }
    const sorted = Float32Array.from(elev).sort();
    const thr = sorted[Math.floor(W * H * 0.47)];
    const map = new Array(W * H);
    for (let i = 0; i < W * H; i++) map[i] = elev[i] > thr ? TILE.GRASS : TILE.OCEAN;
    cleanupBodies(map);
    lastMap = map;
    const comps = floodComponents(map, isLandTile)
      .filter((c) => c.cells.length >= 25)
      .sort((a, b) => b.cells.length - a.cells.length);
    if (comps.length < 2 || comps[0].cells.length < 45 || comps[1].cells.length < 25) continue;
    const keep = new Set();
    comps.forEach((c) => c.cells.forEach((i) => keep.add(i)));
    for (let i = 0; i < W * H; i++)
      if (map[i] !== TILE.OCEAN && !keep.has(i)) map[i] = TILE.OCEAN;
    sprinkleTerrain(map);
    return { map, res: scatterResources(map) };
  }
  const map = lastMap || new Array(W * H).fill(TILE.GRASS);
  carveChannel(map);
  cleanupBodies(map);
  const comps = floodComponents(map, isLandTile)
    .filter((c) => c.cells.length >= 25)
    .sort((a, b) => b.cells.length - a.cells.length);
  if (comps.length >= 2) {
    const keep = new Set();
    comps.slice(0, 2).forEach((c) => c.cells.forEach((i) => keep.add(i)));
    for (let i = 0; i < W * H; i++)
      if (map[i] !== TILE.OCEAN && !keep.has(i)) map[i] = TILE.OCEAN;
  } else {
    const comp = largestLandComponent(map);
    for (let i = 0; i < W * H; i++)
      if (map[i] !== TILE.OCEAN && !comp.has(i)) map[i] = TILE.OCEAN;
  }
  sprinkleTerrain(map);
  return { map, res: scatterResources(map) };
}

function sprinkleTerrain(map) {
  for (let i = 0; i < W * H; i++) {
    if (map[i] !== TILE.GRASS) continue;
    if (Math.random() < 0.2) map[i] = TILE.PLAINS;
  }
  for (let i = 0; i < W * H; i++) {
    if (map[i] !== TILE.GRASS && map[i] !== TILE.PLAINS) continue;
    const r = Math.random();
    if (r < 0.20) map[i] = TILE.FOREST;
    else if (r < 0.33) map[i] = TILE.HILLS;
    else if (r < 0.37) map[i] = TILE.MOUNTAIN;
  }
}

function landScore(x, y) {
  let sc = 0;
  for (const [nx, ny] of neighbors(x, y)) {
    const t = S.map[key(nx, ny)];
    if (TERRAIN[t].passable) sc += t === TILE.GRASS ? 2 : 1;
  }
  return sc;
}

function computeWaterComps(map) {
  const ids = new Array(W * H).fill(-1);
  let id = 0;
  for (const c of floodComponents(map, isWaterTile)) {
    c.cells.forEach((i) => { ids[i] = id; });
    id++;
  }
  return ids;
}

function findStarts(k) {
  const comps = floodComponents(S.map, isLandTile)
    .map((c) => ({ size: c.cells.length, cells: c.cells.filter((i) => TERRAIN[S.map[i]].passable) }))
    .filter((c) => c.cells.length > 0)
    .sort((a, b) => b.size - a.size);
  if (!comps.length) {
    const fb = [[3, 3], [W - 4, H - 4], [3, H - 4], [W - 4, 3], [(W / 2) | 0, (H / 2) | 0]];
    return Array.from({ length: k }, (_, i) => fb[i % fb.length].slice());
  }
  const xy = (i) => [i % W, (i / W) | 0];
  const cdist = (i, j) => { const [a, b] = xy(i), [c, d] = xy(j); return dist(a, b, c, d); };
  let result = null;
  for (const minD of [6, 4, 2]) {
    const sel = [];
    for (const comp of comps) {
      if (sel.length >= k) break;
      let best = null, bs = -1, bestOk = null, bsOk = -1;
      for (const i of comp.cells) {
        const s = landScore(i % W, (i / W) | 0);
        if (s > bs) { bs = s; best = i; }
        if (sel.every((j) => cdist(i, j) >= minD) && s > bsOk) { bsOk = s; bestOk = i; }
      }
      sel.push(bestOk !== null ? bestOk : best);
    }
    if (sel.length < k) {
      const pool = comps[0].cells;
      while (sel.length < k) {
        let cand = -1, cd = -1;
        for (const i of pool) {
          if (sel.includes(i)) continue;
          let dmin = Infinity;
          for (const j of sel) dmin = Math.min(dmin, cdist(i, j));
          if (dmin > cd) { cd = dmin; cand = i; }
        }
        if (cand === -1 || cd < minD) break;
        sel.push(cand);
      }
      for (const i of pool) {
        if (sel.length >= k) break;
        if (!sel.includes(i)) sel.push(i);
      }
    }
    result = sel;
    let ok = sel.length === k;
    for (let a = 0; ok && a < sel.length; a++)
      for (let b = a + 1; ok && b < sel.length; b++)
        if (cdist(sel[a], sel[b]) < minD) ok = false;
    if (ok) break;
  }
  return result.map(xy);
}

function newGame(diff = 1, opponents = 1) {
  const n = Math.max(1, Math.min(opponents, NATIONS.length - 1));
  S = {
    turn: 1,
    nextId: 1,
    difficulty: diff,
    map: null,
    res: null,
    waterComp: null,
    players: NATIONS.slice(0, n + 1).map((nat, i) => ({
      name: nat.name,
      color: nat.color,
      cityNames: [...nat.cityNames],
      techs: [],
      researching: null,
      progress: 0,
      gold: 50,
      gpPoints: 0,
      gpNext: GP_BASE_THRESHOLD,
      gpRotate: 0,
      isHuman: i === 0,
    })),
    units: [],
    cities: [],
    explored: new Array(W * H).fill(0),
    tileOwner: new Array(W * H).fill(-1),
    log: ["Игра началась. Основайте город поселенцем."],
    over: null,
    sel: null,
    relations: {},
    religions: [],
    wonders: [],
  };
  for (let i = 0; i < S.players.length; i++)
    for (let j = i + 1; j < S.players.length; j++)
      S.relations[relKey(i, j)] = { war: false, since: -1 };
  const g = generateMap();
  S.map = g.map;
  S.res = g.res;
  S.waterComp = computeWaterComps(S.map);
  const starts = findStarts(n + 1);
  for (let i = 0; i <= n; i++) {
    const st = starts[i % starts.length];
    spawn("settler", i, st[0], st[1]);
    spawn("warrior", i, st[0], st[1]);
  }
  computeVision();
  save();
}

function spawn(type, owner, x, y) {
  const u = { id: S.nextId++, type, owner, x, y, moves: UNITS[type].moves };
  S.units.push(u);
  return u;
}

function upgradeCost(u) {
  const to = UNITS[u.type] ? UNITS[u.type].upgrade : null;
  if (!to) return 0;
  return Math.max(10, 2 * (UNITS[to].cost - UNITS[u.type].cost));
}

function upgradeUnit(u) {
  const from = u && UNITS[u.type];
  if (!from) return { ok: false, reason: "юнит не найден" };
  const to = from.upgrade;
  if (!to) return { ok: false, reason: "улучшение недоступно" };
  const c = cityAt(u.x, u.y);
  const ownTerritory = (c && c.owner === u.owner) || (S.tileOwner && S.tileOwner[key(u.x, u.y)] === u.owner);
  if (!ownTerritory) return { ok: false, reason: "апгрейд доступен только на своей территории" };
  const def = UNITS[to];
  const p = S.players[u.owner];
  if (!unitAvailable(u.owner, to)) {
    if (def.tech && !p.techs.includes(def.tech))
      return { ok: false, reason: `нужна технология: ${TECHS[def.tech].name}` };
    const miss = (def.res || []).filter((r) => !resourceConnected(u.owner, r));
    return { ok: false, reason: `нужен ресурс в границах: ${miss.map((r) => RESOURCES[r].name).join(", ")}` };
  }
  const price = upgradeCost(u);
  if (p.gold < price) return { ok: false, reason: "недостаточно золота" };
  p.gold -= price;
  u.type = to;
  u.moves = 0;
  addLog(`${from.name} повышен до ${def.name} (−${price}🪙)`);
  return { ok: true };
}

function computeVision() {
  visible = new Array(W * H).fill(0);
  for (const u of S.units) {
    if (u.owner !== 0) continue;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (inMap(u.x + dx, u.y + dy)) {
          visible[key(u.x + dx, u.y + dy)] = 1;
          S.explored[key(u.x + dx, u.y + dy)] = 1;
        }
  }
  for (const c of S.cities) {
    if (c.owner !== 0) continue;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (inMap(c.x + dx, c.y + dy)) {
          visible[key(c.x + dx, c.y + dy)] = 1;
          S.explored[key(c.x + dx, c.y + dy)] = 1;
        }
  }
  if (S.tileOwner) {
    for (let i = 0; i < W * H; i++) {
      if (S.tileOwner[i] !== 0) continue;
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (inMap(x + dx, y + dy)) {
            visible[key(x + dx, y + dy)] = 1;
            S.explored[key(x + dx, y + dy)] = 1;
          }
    }
  }
}

function reachable(u) {
  const budget = u.moves;
  const res = new Map();
  const q = [[u.x, u.y, budget]];
  const seen = new Set([key(u.x, u.y)]);
  while (q.length) {
    const [x, y, m] = q.shift();
    if (m <= 0) continue;
    for (const [nx, ny] of neighbors(x, y)) {
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      if (!canEnter(u, nx, ny)) continue;
      const other = unitsAt(nx, ny).find((o) => o.owner !== u.owner) || null;
      const city = cityAt(nx, ny);
      const foe = other ? other.owner : (city && city.owner !== u.owner ? city.owner : null);
      if (foe !== null) {
        if (atWar(u.owner, foe)) res.set(k, 0);
        continue;
      }
      seen.add(k);
      res.set(k, m - 1);
      q.push([nx, ny, m - 1]);
    }
  }
  res.delete(key(u.x, u.y));
  return res;
}

function moveUnit(u, x, y) {
  const oc = cityAt(x, y);
  if (oc && oc.owner !== u.owner && !atWar(u.owner, oc.owner)) return;
  const cargo = isNaval(u) ? unitsAt(u.x, u.y).filter((o) => !isNaval(o)) : [];
  u.x = x;
  u.y = y;
  u.moves = 0;
  for (const p of cargo) { p.x = x; p.y = y; }
  computeVision();
  const c = cityAt(x, y);
  if (c && c.owner !== u.owner && !unitsAt(x, y).some((o) => o.owner === c.owner)) {
    captureCity(c, u.owner);
  }
}

function captureCity(c, owner) {
  c.owner = owner;
  c.pop = Math.max(1, c.pop - 1);
  c.culture = Math.floor((c.culture || 0) / 2);
  c.producing = null;
  c.prodStored = 0;
  if (owner === 0) addLog(`Вы захватили город ${c.name}!`);
  else addLog(`${S.players[owner].name} захватили город ${c.name}!`);
  recomputeBorders();
  checkVictory();
}

function attack(att, x, y) {
  if (UNITS[att.type].gp) return;
  const defs = unitsAt(x, y).filter((u) => u.owner !== att.owner);
  const city = cityAt(x, y);
  const def = defs[0];
  const foe = def ? def.owner : (city && city.owner !== att.owner ? city.owner : null);
  if (foe !== null && !atWar(att.owner, foe)) {
    if (att.owner === 0) addLog(`Мы не воюем с ${S.players[foe].name}`);
    return;
  }
  if (!def) return;
  if (isNaval(att) && S.map[key(x, y)] !== TILE.OCEAN) return;
  if (!isNaval(att) && S.map[key(att.x, att.y)] === TILE.OCEAN) return;
  const A = UNITS[att.type].atk + (att.atkBonus || 0);
  let D = UNITS[def.type].def;
  const t = S.map[key(x, y)];
  D *= 1 + TERRAIN[t].def / 100;
  if (!isNaval(def) && t === TILE.OCEAN) D *= 0.5;
  if (city) {
    D *= 1.25;
    D *= buildingEffects(city).defMult * playerEffects(city.owner).defMult;
  }
  const r = A / D;
  const p = Math.min(0.95, Math.max(0.05, r / (r + 1)));
  att.moves = 0;
  if (Math.random() < p) {
    S.units = S.units.filter((u) => u !== def);
    addLog(`${UNITS[att.type].name} уничтожил ${UNITS[def.type].name} (${Math.round(p * 100)}% шанс)`);
    if (!unitsAt(x, y).some((u) => u.owner === def.owner)) {
      if (city && city.owner !== att.owner) {
        moveUnit(att, x, y);
      } else if (!city && canEnter(att, x, y)) {
        moveUnit(att, x, y);
      }
    }
  } else {
    S.units = S.units.filter((u) => u !== att);
    if (S.sel === att.id) S.sel = null;
    addLog(`${UNITS[att.type].name} погиб при атаке на ${UNITS[def.type].name} (${Math.round((1 - p) * 100)}% шанс)`);
  }
  drownCheck();
  checkVictory();
}

function drownCheck() {
  let dead = 0;
  for (const u of [...S.units]) {
    if (isNaval(u)) continue;
    if (S.map[key(u.x, u.y)] !== TILE.OCEAN) continue;
    if (shipAt(u.x, u.y, u.owner)) continue;
    S.units = S.units.filter((x) => x !== u);
    dead++;
  }
  if (dead) {
    if (S.sel && !unitById(S.sel)) S.sel = null;
    addLog(`${dead} юнитов утонули`);
  }
}

function addLog(msg) {
  S.log.unshift(msg);
  if (S.log.length > 30) S.log.length = 30;
}

function foundCity(u) {
  const k = key(u.x, u.y);
  if (S.tileOwner && S.tileOwner[k] !== -1 && S.tileOwner[k] !== u.owner) {
    addLog("Нельзя основать город на чужой территории");
    return false;
  }
  const name = (S.players[u.owner] && S.players[u.owner].cityNames.pop()) || `Город ${S.nextId}`;
  const c = {
    id: S.nextId++,
    owner: u.owner,
    x: u.x,
    y: u.y,
    name,
    pop: 1,
    foodStored: 0,
    prodStored: 0,
    producing: null,
    buildings: [],
    culture: 0,
    religion: null,
    relPressure: 0,
  };
  S.cities.push(c);
  S.units = S.units.filter((x) => x !== u);
  if (S.sel === u.id) S.sel = null;
  addLog(`${S.players[u.owner].name}: основан город ${name}`);
  recomputeBorders();
  computeVision();
  return true;
}

function cityRadius(c) {
  return Math.min(4, 1 + Math.floor((c.pop - 1) / 3) + Math.floor((c.culture || 0) / 40));
}

function recomputeBorders() {
  const owner = new Array(W * H).fill(-1);
  const holder = new Array(W * H).fill(null);
  for (const c of S.cities) {
    const R = cityRadius(c);
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!inMap(nx, ny)) continue;
        const k = key(nx, ny);
        const cur = holder[k];
        if (cur) {
          const d = dist(c.x, c.y, nx, ny);
          const cd = dist(cur.x, cur.y, nx, ny);
          if (d > cd) continue;
          if (d === cd) {
            const cc = c.culture || 0, kc = cur.culture || 0;
            if (kc > cc || (kc === cc && cur.id < c.id)) continue;
          }
        }
        owner[k] = c.owner;
        holder[k] = c;
      }
  }
  S.tileOwner = owner;
}

function waterAdjKeys(x, y) {
  return neighbors(x, y)
    .filter(([nx, ny]) => S.map[key(nx, ny)] === TILE.OCEAN)
    .map(([nx, ny]) => key(nx, ny));
}

function tradeActive(c) {
  const p = S.players[c.owner];
  if (!p.techs.includes("sailing")) return false;
  const a = waterAdjKeys(c.x, c.y);
  if (!a.length) return false;
  const ids = new Set(a.map((k) => S.waterComp[k]));
  return S.cities.some((o) =>
    o.owner === c.owner && o.id !== c.id &&
    waterAdjKeys(o.x, o.y).some((k) => ids.has(S.waterComp[k]))
  );
}

function buildingEffects(c) {
  const e = { foodFlat: 0, prodFlat: 0, sciFlat: 0, sciMult: 1, defMult: 1, tradeMult: 1, culture: 0, unitAtk: 0, maxPop: 0 };
  for (const b of c.buildings) {
    const f = BUILDINGS[b] ? BUILDINGS[b].effects : null;
    if (!f) continue;
    e.foodFlat += f.foodFlat || 0;
    e.prodFlat += f.prodFlat || 0;
    e.sciFlat += f.sciFlat || 0;
    e.sciMult *= f.sciMult || 1;
    e.defMult *= f.defMult || 1;
    e.tradeMult *= f.tradeMult || 1;
    e.culture += f.culture || 0;
    e.unitAtk += f.unitAtk || 0;
    e.maxPop += f.maxPop || 0;
  }
  return e;
}

function playerEffects(pIdx) {
  const e = { prodFlat: 0, sciMult: 1, tradeMult: 1, defMult: 1, freeTech: 0 };
  for (const w of S.wonders) {
    const c = cityById(w.cityId);
    if (!c || c.owner !== pIdx) continue;
    const f = WONDERS[w.id] ? WONDERS[w.id].effects : null;
    if (!f) continue;
    e.prodFlat += f.prodFlat || 0;
    e.sciMult *= f.sciMult || 1;
    e.tradeMult *= f.tradeMult || 1;
    e.defMult *= f.defMult || 1;
    e.freeTech += f.freeTech || 0;
  }
  return e;
}

function isHolyCity(c) {
  return S.religions.some((r) => r.holyCityId === c.id);
}

function foundReligion(owner, id, holyCityId) {
  const def = RELIGIONS[id];
  if (!def || S.religions.some((r) => r.id === id)) return false;
  const holy = (holyCityId != null ? cityById(holyCityId) : null) ||
    S.cities.filter((c) => c.owner === owner).sort((a, b) => a.id - b.id)[0];
  if (!holy) return false;
  S.religions.push({ id, tech: def.tech, owner, holyCityId: holy.id, turn: S.turn });
  holy.religion = id;
  holy.relPressure = 0;
  addLog(owner === 0
    ? `В ${holy.name} основана религия ${def.name}`
    : `${S.players[owner].name}: в городе ${holy.name} основана религия ${def.name}`);
  return true;
}

function checkFoundReligions() {
  for (let i = 0; i < S.players.length; i++)
    for (const id in RELIGIONS)
      if (S.players[i].techs.includes(RELIGIONS[id].tech)) foundReligion(i, id);
}

function spreadReligions() {
  for (const c of S.cities) {
    if (c.religion || isHolyCity(c)) continue;
    const near = S.cities.filter((o) => o.religion && o.id !== c.id && dist(c.x, c.y, o.x, o.y) <= REL_SPREAD_RADIUS);
    let pressure = near.length;
    const sea = [];
    if (isCoastal(c.x, c.y) && S.players[c.owner].techs.includes("sailing")) {
      const comps = new Set(waterAdjKeys(c.x, c.y).map((k) => S.waterComp[k]));
      for (const o of S.cities) {
        if (!o.religion || o.id === c.id || near.includes(o) || !isCoastal(o.x, o.y)) continue;
        if (waterAdjKeys(o.x, o.y).some((k) => comps.has(S.waterComp[k]))) sea.push(o);
      }
      if (sea.length) pressure += 1;
    }
    if (!pressure) continue;
    c.relPressure = (c.relPressure || 0) + pressure;
    if (c.relPressure >= REL_SPREAD_THRESHOLD) {
      const src = [...near, ...sea].sort((a, b) =>
        dist(c.x, c.y, a.x, a.y) - dist(c.x, c.y, b.x, b.y) || a.id - b.id)[0];
      c.religion = src.religion;
      c.relPressure = 0;
    }
  }
}

function cityYields(c) {
  let food = 2, prod = 1;
  const cand = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = c.x + dx, ny = c.y + dy;
      if (!inMap(nx, ny)) continue;
      if (cityAt(nx, ny)) continue;
      if (S.tileOwner && S.tileOwner[key(nx, ny)] !== c.owner) continue;
      const t = TERRAIN[S.map[key(nx, ny)]];
      let f = t.food, p = t.prod;
      const r = S.res ? S.res[key(nx, ny)] : null;
      if (r === "fish") f += 2;
      if (r === "whale") { f += 1; p += 1; }
      cand.push([f, p, f * 1.2 + p]);
    }
  cand.sort((a, b) => b[2] - a[2]);
  for (let i = 0; i < Math.min(c.pop, cand.length); i++) {
    food += cand[i][0];
    prod += cand[i][1];
  }
  const e = buildingEffects(c);
  const pe = playerEffects(c.owner);
  food += e.foodFlat;
  prod += e.prodFlat + pe.prodFlat;
  let sci = 2 + Math.floor(c.pop / 2) + e.sciFlat + (isHolyCity(c) ? 2 : 0);
  sci = Math.round(sci * e.sciMult * pe.sciMult);
  const trade = tradeActive(c);
  const tradeGold = trade ? 2 * e.tradeMult * pe.tradeMult : 0;
  const gold = 3 + Math.floor(c.pop / 2) + tradeGold;
  return { food, prod, sci, gold, trade, tradeGold };
}

function playerGoldPerTurn(i) {
  const cities = S.cities.filter((c) => c.owner === i);
  let income = 0;
  for (const c of cities) income += cityYields(c).gold;
  const upkeep = cities.length * 2 + S.units.filter((u) => u.owner === i).length;
  return { income, upkeep, net: income - upkeep };
}

function techAvailable(p, id) {
  const t = TECHS[id];
  return !p.techs.includes(id) && t.req.every((r) => p.techs.includes(r));
}

function grantFreeTech(p) {
  const avail = Object.keys(TECHS).filter((t) => techAvailable(p, t))
    .sort((a, b) => TECHS[a].cost - TECHS[b].cost);
  if (!avail.length) return null;
  p.techs.push(avail[0]);
  if (p.researching === avail[0]) { p.researching = null; p.progress = 0; }
  return avail[0];
}

function resourceConnected(pIdx, r) {
  if (!S.res || !S.tileOwner) return false;
  for (let i = 0; i < W * H; i++)
    if (S.res[i] === r && S.tileOwner[i] === pIdx) return true;
  return false;
}

function unitAvailable(pIdx, unitId) {
  const d = UNITS[unitId];
  if (!d || !S.players[pIdx]) return false;
  if (d.tech && !S.players[pIdx].techs.includes(d.tech)) return false;
  if (d.res)
    for (const r of d.res)
      if (!resourceConnected(pIdx, r)) return false;
  return true;
}

function hasMarble(c) {
  if (!S.res || !S.tileOwner) return false;
  const R = cityRadius(c);
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const nx = c.x + dx, ny = c.y + dy;
      if (!inMap(nx, ny)) continue;
      const k = key(nx, ny);
      if (S.res[k] === "marble" && S.tileOwner[k] === c.owner) return true;
    }
  return false;
}

function wonderCost(c, id) {
  const d = WONDERS[id];
  if (!d) return 0;
  return hasMarble(c) ? Math.floor(d.cost * 0.75) : d.cost;
}

function processEconomy() {
  const diff = DIFFICULTIES[S.difficulty] || DIFFICULTIES[1];
  const strike = new Set();
  for (let i = 0; i < S.players.length; i++) {
    const p = S.players[i];
    const g = playerGoldPerTurn(i);
    p.gold = Math.max(0, p.gold + g.net);
    if (p.gold === 0 && g.net < 0) {
      strike.add(i);
      if (i === 0) addLog(`Казна пуста: наука остановлена (дефицит −${-g.net}🪙)`);
    }
  }
  for (const c of S.cities) {
    const p = S.players[c.owner];
    const y = cityYields(c);
    const e = buildingEffects(c);
    const cultGrowth = 1 + e.culture + (c.religion ? 1 : 0);
    c.culture = (c.culture || 0) + cultGrowth;
    p.gpPoints = (p.gpPoints || 0) + Math.floor(cultGrowth / 2);
    const surplus = y.food - c.pop * 2;
    c.foodStored = Math.max(0, c.foodStored + surplus);
    const need = 10 + c.pop * 5;
    if (c.foodStored >= need && c.pop < 10 + e.maxPop) {
      c.pop++;
      c.foodStored -= need;
      if (c.owner === 0) addLog(`${c.name} вырос до ${c.pop} населения`);
    }
    c.prodStored += y.prod * (p.isHuman ? 1 : diff.prodMult);
    if (c.producing) {
      const def = c.producing.k === "unit" ? UNITS[c.producing.id] : c.producing.k === "building" ? BUILDINGS[c.producing.id] : WONDERS[c.producing.id];
      const cost = c.producing.k === "wonder" ? wonderCost(c, c.producing.id) : def.cost;
      if (c.prodStored >= cost) {
        if (c.producing.k === "wonder") {
          const won = S.wonders.find((w) => w.id === c.producing.id);
          if (won) {
            c.prodStored += Math.floor(def.cost / 2);
            addLog(`${def.name} уже построено ${S.players[won.owner].name} — 50% вложений возвращено производству`);
          } else {
            c.prodStored -= cost;
            S.wonders.push({ id: c.producing.id, owner: c.owner, cityId: c.id, turn: S.turn });
            addLog(`${S.players[c.owner].name}: в городе ${c.name} построено чудо ${def.name}`);
            if (def.effects.freeTech) {
              const free = grantFreeTech(p);
              if (free) addLog(`Оракул дарует знание: ${TECHS[free].name}`);
            }
          }
          c.producing = null;
        } else {
          c.prodStored -= def.cost;
          if (c.producing.k === "unit") {
            const spec = UNITS[c.producing.id];
            let born = null;
            if (spec.naval) {
              const w = adjWater(c.x, c.y);
              if (w) {
                born = spawn(c.producing.id, c.owner, w[0], w[1]);
                if (c.owner === 0) addLog(`${c.name}: построена ${spec.name}`);
              } else {
                c.prodStored = 0;
              }
            } else {
              born = spawn(c.producing.id, c.owner, c.x, c.y);
              if (c.owner === 0) addLog(`${c.name}: построен ${spec.name}`);
            }
            if (born) born.atkBonus = e.unitAtk;
          } else {
            c.buildings.push(c.producing.id);
            if (c.owner === 0) addLog(`${c.name}: построена ${def.name}`);
          }
          c.producing = null;
        }
      }
    }
    if (!p.researching && !p.isHuman) {
      const avail = Object.keys(TECHS).filter((t) => techAvailable(p, t));
      if (avail.length) {
        avail.sort((a, b) => TECHS[a].cost - TECHS[b].cost);
        p.researching = avail[0];
        p.progress = 0;
      }
    }
    if (p.researching && !strike.has(c.owner)) {
      p.progress += y.sci * (p.isHuman ? 1 : diff.sciMult);
      if (p.progress >= TECHS[p.researching].cost) {
        const done = p.researching;
        p.techs.push(done);
        p.researching = null;
        p.progress = 0;
        if (c.owner === 0) addLog(`Изучена технология: ${TECHS[done].name}`);
        const relId = Object.keys(RELIGIONS).find((id) => RELIGIONS[id].tech === done);
        if (relId) foundReligion(c.owner, relId);
      }
    }
  }
  for (let i = 0; i < S.players.length; i++) {
    const p = S.players[i];
    if ((p.gpPoints || 0) < (p.gpNext ?? GP_BASE_THRESHOLD)) continue;
    const cities = S.cities.filter((c) => c.owner === i);
    if (!cities.length) continue;
    const home = cities.sort((a, b) => b.pop - a.pop || a.id - b.id)[0];
    const kind = GP_ORDER[(p.gpRotate || 0) % GP_ORDER.length];
    p.gpPoints -= p.gpNext ?? GP_BASE_THRESHOLD;
    p.gpNext = Math.ceil((p.gpNext ?? GP_BASE_THRESHOLD) * 1.5);
    p.gpRotate = ((p.gpRotate || 0) + 1) % GP_ORDER.length;
    spawn("gp_" + kind, i, home.x, home.y);
    addLog(`Великий ${GREAT_PEOPLE[kind].name} родился в ${home.name}`);
  }
  recomputeBorders();
  for (const u of S.units) u.moves = UNITS[u.type].moves;
  checkFoundReligions();
  spreadReligions();
}

function buyForGold(cityId, k, id) {
  const c = cityById(cityId);
  if (!c) return { ok: false, reason: "город не найден" };
  if (k === "wonder") return { ok: false, reason: "чудеса нельзя купить за золото" };
  const def = k === "unit" ? UNITS[id] : k === "building" ? BUILDINGS[id] : null;
  if (!def) return { ok: false, reason: "неизвестный элемент" };
  if (k === "unit" && def.gp) return { ok: false, reason: "великих людей нельзя купить" };
  const p = S.players[c.owner];
  if (def.tech && !p.techs.includes(def.tech)) return { ok: false, reason: `нужна технология: ${TECHS[def.tech].name}` };
  if (k === "unit" && !unitAvailable(c.owner, id)) {
    const miss = (def.res || []).filter((r) => !resourceConnected(c.owner, r)).map((r) => RESOURCES[r].name).join(", ");
    return { ok: false, reason: `нужен ресурс в границах: ${miss}` };
  }
  if (k === "building" && c.buildings.includes(id)) return { ok: false, reason: "здание уже построено" };
  if (c.producing && c.producing.k === k && c.producing.id === id) c.producing = null;
  if (k === "unit" && def.naval && !adjWater(c.x, c.y)) return { ok: false, reason: "нет доступа к воде" };
  const price = Math.ceil(def.cost * 3);
  if (p.gold < price) return { ok: false, reason: "недостаточно золота" };
  p.gold -= price;
  if (k === "unit") {
    let born;
    if (def.naval) {
      const w = adjWater(c.x, c.y);
      born = spawn(id, c.owner, w[0], w[1]);
    } else {
      born = spawn(id, c.owner, c.x, c.y);
    }
    born.atkBonus = buildingEffects(c).unitAtk;
    if (c.owner === 0) addLog(`${c.name}: за ${price}🪙 нанят ${def.name}`);
  } else {
    c.buildings.push(id);
    if (c.owner === 0) addLog(`${c.name}: за ${price}🪙 построена ${def.name}`);
  }
  return { ok: true };
}

function useGreatPerson(unitId) {
  const u = unitById(unitId);
  if (!u) return { ok: false, reason: "юнит не найден" };
  const def = UNITS[u.type];
  if (!def.gp) return { ok: false, reason: "не великий человек" };
  const p = S.players[u.owner];
  const c = cityAt(u.x, u.y);
  if (def.gp !== "scientist" && (!c || c.owner !== u.owner))
    return { ok: false, reason: "должен быть в своём городе" };
  if (def.gp === "scientist") {
    const t = grantFreeTech(p);
    if (!t) return { ok: false, reason: "нет доступных технологий" };
    addLog(`${GREAT_PEOPLE.scientist.name} дарует знание: ${TECHS[t].name}`);
  } else if (def.gp === "engineer") {
    c.prodStored += 300;
    addLog(`${GREAT_PEOPLE.engineer.name} ускоряет ${c.name} (+300🔨)`);
  } else if (def.gp === "artist") {
    c.culture = (c.culture || 0) + 100;
    recomputeBorders();
    addLog(`${GREAT_PEOPLE.artist.name} прославляет ${c.name} (+100 культуры)`);
  } else if (def.gp === "prophet") {
    const relId = Object.keys(RELIGIONS).find((id) => !S.religions.some((r) => r.id === id));
    if (relId) {
      foundReligion(u.owner, relId, c.id);
    } else {
      p.gold += 50;
      addLog(`${GREAT_PEOPLE.prophet.name} приносит 50🪙`);
    }
  }
  S.units = S.units.filter((x) => x !== u);
  if (S.sel === u.id) S.sel = null;
  return { ok: true };
}

function aiTurn() {
  for (let i = 1; i < S.players.length; i++) aiTurnOne(i);
}

function aiTurnOne(owner) {
  const p = S.players[owner];
  const diff = DIFFICULTIES[S.difficulty] || DIFFICULTIES[1];
  if (!S.players.some((_, i) => i !== owner && atWar(owner, i))) {
    const upCand = S.units
      .filter((u) => u.owner === owner && UNITS[u.type].upgrade)
      .sort((a, b) => UNITS[UNITS[b.type].upgrade].atk - UNITS[UNITS[a.type].upgrade].atk);
    for (const u of upCand) {
      const price = upgradeCost(u);
      if (p.gold <= price + 50) continue;
      if (upgradeUnit(u).ok) break;
    }
  }
  for (const c of S.cities.filter((x) => x.owner === owner)) {
    if (!c.producing) {
      const settlers = S.units.filter((u) => u.owner === owner && u.type === "settler").length;
      const myCities = S.cities.filter((x) => x.owner === owner).length;
      const bestUnit = () => ["musketman", "knight", "catapult", "swordsman", "horseman", "archer", "warrior"]
        .find((t) => unitAvailable(owner, t));
      const availWonders = Object.keys(WONDERS).filter((id) =>
        (!WONDERS[id].tech || p.techs.includes(WONDERS[id].tech)) &&
        !S.wonders.some((w) => w.id === id));
      if (c.pop >= 4 && availWonders.length && Math.random() < diff.wonderChance) {
        c.producing = { k: "wonder", id: availWonders[(Math.random() * availWonders.length) | 0] };
      } else if (settlers === 0 && myCities < diff.maxCities && Math.random() < diff.settlerChance) {
        c.producing = { k: "unit", id: "settler" };
      } else if (c.pop >= 3 && !c.buildings.includes("library") && Math.random() < 0.35) {
        const avail = ["granary", "library", "temple", "forge", "market"].filter(
          (b) => !c.buildings.includes(b) && (!BUILDINGS[b].tech || p.techs.includes(BUILDINGS[b].tech))
        );
        c.producing = avail.length
          ? { k: "building", id: avail[(Math.random() * avail.length) | 0] }
          : { k: "unit", id: bestUnit() };
      } else {
        c.producing = { k: "unit", id: bestUnit() };
      }
    }
  }
  const own = S.cities.filter((x) => x.owner === owner);
  const fighting = S.players.some((_, i) => i !== owner && atWar(owner, i));
  if (own.length) {
    if (fighting) {
      const combat = ["musketman", "knight", "catapult", "swordsman", "horseman", "archer", "warrior"]
        .find((t) => unitAvailable(owner, t));
      if (combat) {
        const price = Math.ceil(UNITS[combat].cost * 3);
        if (p.gold >= price + 20) {
          const foes = [];
          for (const u of S.units) if (atWar(owner, u.owner)) foes.push([u.x, u.y]);
          for (const ct of S.cities) if (atWar(owner, ct.owner)) foes.push([ct.x, ct.y]);
          let target = own[0], bd = Infinity;
          for (const ct of own)
            for (const [fx, fy] of foes) {
              const d = dist(ct.x, ct.y, fx, fy);
              if (d < bd) { bd = d; target = ct; }
            }
          buyForGold(target.id, "unit", combat);
        }
      }
    } else {
      for (const b of ["market", "library"]) {
        if (!p.techs.includes(BUILDINGS[b].tech)) continue;
        const price = Math.ceil(BUILDINGS[b].cost * 3);
        if (p.gold < price + 50) continue;
        const t = own.find((ct) => !ct.buildings.includes(b));
        if (t && buyForGold(t.id, "building", b).ok) break;
      }
    }
  }
  for (const u of [...S.units]) {
    if (u.owner !== owner || !S.units.includes(u)) continue;
    if (UNITS[u.type].gp) {
      const home = S.cities.filter((c) => c.owner === owner)
        .sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y) || a.id - b.id)[0];
      if (home) {
        while (u.moves > 0 && (u.x !== home.x || u.y !== home.y)) {
          const before = u.x + "," + u.y;
          stepToward(u, home.x, home.y);
          if (u.x + "," + u.y === before) break;
        }
        if (u.x === home.x && u.y === home.y) useGreatPerson(u.id);
      }
      continue;
    }
    if (u.type === "settler") {
      const home = landCompOf(u.x, u.y);
      let spot = null;
      let bestSc = -1;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          if (!TERRAIN[S.map[key(x, y)]].passable || cityAt(x, y)) continue;
          if (!home.has(key(x, y))) continue;
          const to = S.tileOwner[key(x, y)];
          if (to !== -1 && to !== u.owner) continue;
          if (dist(u.x, u.y, x, y) > 12) continue;
          const near = S.cities.some((c) => dist(c.x, c.y, x, y) < 3);
          if (near) continue;
          const sc = landScore(x, y) + landScore(x, y) - dist(u.x, u.y, x, y);
          if (sc > bestSc) { bestSc = sc; spot = [x, y]; }
        }
      if (!spot) { u.moves = 0; continue; }
      if (u.x === spot[0] && u.y === spot[1]) { foundCity(u); continue; }
      stepToward(u, spot[0], spot[1]);
      if (u.x === spot[0] && u.y === spot[1]) foundCity(u);
      continue;
    }
    let target = null;
    let bestD = 99;
    for (const e of S.units) {
      if (e.owner === owner || !atWar(owner, e.owner)) continue;
      const d = dist(u.x, u.y, e.x, e.y);
      if (d < bestD && d <= diff.aggroRange) { bestD = d; target = [e.x, e.y]; }
    }
    for (const c of S.cities) {
      if (c.owner === owner || !atWar(owner, c.owner)) continue;
      const d = dist(u.x, u.y, c.x, c.y);
      if (d < bestD && d <= diff.aggroRange) { bestD = d; target = [c.x, c.y]; }
    }
    if (!target) {
      let bd = Infinity;
      for (const c of S.cities) {
        if (c.owner !== owner) continue;
        const d = dist(u.x, u.y, c.x, c.y);
        if (d < bd) { bd = d; target = [c.x, c.y]; }
      }
      if (target && bd <= 3) target = null;
    }
    if (!target && S.turn > diff.aggroTurn) {
      let bd = Infinity;
      for (const c of S.cities) {
        if (c.owner === owner || !atWar(owner, c.owner)) continue;
        const d = dist(u.x, u.y, c.x, c.y);
        if (d < bd) { bd = d; target = [c.x, c.y]; }
      }
    }
    if (target) {
      while (u.moves > 0) {
        const adj = dist(u.x, u.y, target[0], target[1]) === 1;
        if (adj) {
          const enemies = unitsAt(target[0], target[1]).filter((x) => x.owner !== owner);
          if (enemies.length) { attack(u, target[0], target[1]); break; }
          const t = S.map[key(target[0], target[1])];
          if (TERRAIN[t].passable) { moveUnit(u, target[0], target[1]); break; }
          break;
        }
        const before = u.x + "," + u.y;
        stepToward(u, target[0], target[1]);
        if (u.x + "," + u.y === before) break;
      }
    } else {
      u.moves = 0;
    }
  }
}

function landCompOf(x, y) {
  const seen = new Set([key(x, y)]);
  const q = [[x, y]];
  while (q.length) {
    const [cx, cy] = q.pop();
    for (const [nx, ny] of neighbors(cx, cy)) {
      const k = key(nx, ny);
      if (seen.has(k) || !TERRAIN[S.map[k]].passable) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

function stepToward(u, tx, ty) {
  const opts = neighbors(u.x, u.y).filter(([nx, ny]) => {
    if (!canEnter(u, nx, ny)) return false;
    if (unitsAt(nx, ny).some((o) => o.owner !== u.owner)) return false;
    const c = cityAt(nx, ny);
    if (c && c.owner !== u.owner) return false;
    return true;
  });
  if (!opts.length) { u.moves = 0; return; }
  opts.sort((a, b) => dist(a[0], a[1], tx, ty) - dist(b[0], b[1], tx, ty));
  const [nx, ny] = opts[0];
  u.moves = Math.max(0, u.moves - 1);
  u.x = nx;
  u.y = ny;
}

function relKey(i, j) { return i < j ? `${i}:${j}` : `${j}:${i}`; }

function atWar(i, j) {
  const r = S.relations && S.relations[relKey(i, j)];
  return !!(r && r.war);
}

function declareWar(i, j) {
  const r = S.relations[relKey(i, j)];
  if (!r || r.war) return;
  r.war = true;
  r.since = S.turn;
  addLog(`${S.players[i].name} объявляет войну ${S.players[j].name}`);
}

function makePeace(i, j) {
  const r = S.relations[relKey(i, j)];
  if (!r || !r.war) return;
  r.war = false;
  r.since = -1;
  addLog(`${S.players[i].name} и ${S.players[j].name} заключают мир`);
}

function strengthOf(i) {
  let s = 0;
  for (const u of S.units) if (u.owner === i) s += UNITS[u.type].atk;
  for (const c of S.cities) if (c.owner === i) s += c.pop;
  return s;
}

function readyForPeace(weak, strong) {
  const r = S.relations[relKey(weak, strong)];
  return !!r && r.war && S.turn - r.since > PEACE_WAR_LEN &&
    strengthOf(weak) < PEACE_STRENGTH * strengthOf(strong);
}

function offerPeace(humanIdx, aiIdx) {
  if (readyForPeace(aiIdx, humanIdx)) {
    makePeace(humanIdx, aiIdx);
    return true;
  }
  addLog(`${S.players[aiIdx].name} отвергают предложение мира`);
  return false;
}

function aiDiplomacy() {
  const diff = DIFFICULTIES[S.difficulty] || DIFFICULTIES[1];
  for (const k of Object.keys(S.relations)) {
    const [a, b] = k.split(":").map(Number);
    if (S.relations[k].war && (!playerAlive(a) || !playerAlive(b))) {
      S.relations[k].war = false;
    }
  }
  const pts = (i) => [
    ...S.units.filter((u) => u.owner === i).map((u) => [u.x, u.y]),
    ...S.cities.filter((c) => c.owner === i).map((c) => [c.x, c.y]),
  ];
  for (let i = 1; i < S.players.length; i++) {
    let fighting = false;
    for (let j = 0; j < S.players.length; j++)
      if (j !== i && atWar(i, j)) fighting = true;
    if (fighting || S.turn < diff.aggroTurn) continue;
    const mine = pts(i);
    if (!mine.length) continue;
    let target = -1;
    let bd = Infinity;
    for (let j = 0; j < S.players.length; j++) {
      if (j === i) continue;
      const theirs = pts(j);
      let dmin = Infinity;
      for (const [ax, ay] of mine)
        for (const [bx, by] of theirs) {
          const d = dist(ax, ay, bx, by);
          if (d < dmin) dmin = d;
        }
      if (dmin < bd) { bd = dmin; target = j; }
    }
    if (target === -1) continue;
    const si = strengthOf(i);
    const sj = strengthOf(target);
    if (sj > 0 && si > sj && Math.random() < Math.min(0.5, 0.05 + 0.25 * (si / sj - 1)))
      declareWar(i, target);
  }
  for (let a = 1; a < S.players.length; a++)
    for (let b = a + 1; b < S.players.length; b++)
      if (atWar(a, b) && (readyForPeace(a, b) || readyForPeace(b, a))) makePeace(a, b);
  for (let j = 1; j < S.players.length; j++)
    if (atWar(0, j) && readyForPeace(j, 0)) addLog(`${S.players[j].name} готовы к миру`);
}

function playerAlive(idx) {
  return S.cities.some((c) => c.owner === idx) ||
    S.units.some((u) => u.owner === idx && u.type === "settler");
}

function legendaryCities(pIdx) {
  return S.cities.filter((c) => c.owner === pIdx && (c.culture || 0) >= CULTURE_WIN_THRESHOLD);
}

function checkVictory() {
  if (S.over) return;
  if (!playerAlive(0)) {
    let winner = -1;
    for (let i = 1; i < S.players.length; i++) {
      if (playerAlive(i)) { winner = i; break; }
    }
    S.over = { winner, type: "conquest" };
    return;
  }
  let aiAlive = false;
  for (let i = 1; i < S.players.length; i++) if (playerAlive(i)) { aiAlive = true; break; }
  if (!aiAlive) {
    S.over = { winner: 0, type: "conquest" };
    return;
  }
  for (let i = 0; i < S.players.length; i++) {
    if (!playerAlive(i)) continue;
    const legends = legendaryCities(i);
    if (legends.length >= CULTURE_WIN_CITIES) {
      S.over = { winner: i, type: "culture" };
      addLog(`Легендарные города ${legends.map((c) => c.name).join(", ")} приносят ${S.players[i].name} культурную победу`);
      return;
    }
  }
}

function endTurn() {
  if (S.over) return;
  aiDiplomacy();
  aiTurn();
  processEconomy();
  S.turn++;
  computeVision();
  checkVictory();
  save();
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    S = JSON.parse(raw);
    if (!S.res) S.res = new Array(W * H).fill(null);
    if (!S.res.some((r) => r === "iron" || r === "horses" || r === "marble")) scatterLandResources(S.map, S.res);
    if (!S.waterComp) S.waterComp = computeWaterComps(S.map);
    if (!Array.isArray(S.tileOwner)) S.tileOwner = new Array(W * H).fill(-1);
    if (!Array.isArray(S.players) || S.players.length === 0) return false;
    if (!S.relations || typeof S.relations !== "object") {
      S.relations = {};
      for (let i = 0; i < S.players.length; i++)
        for (let j = i + 1; j < S.players.length; j++)
          S.relations[relKey(i, j)] = { war: false, since: -1 };
    }
    for (const c of S.cities) if (typeof c.culture !== "number") c.culture = 0;
    if (!Array.isArray(S.religions)) S.religions = [];
    if (!Array.isArray(S.wonders)) S.wonders = [];
    if (S.over && !S.over.type) S.over.type = "conquest";
    for (const c of S.cities) {
      if (!c.religion) c.religion = null;
      if (typeof c.relPressure !== "number") c.relPressure = 0;
    }
    S.players.forEach((p, i) => {
      p.isHuman = i === 0;
      if (!Array.isArray(p.techs)) p.techs = [];
      if (!("researching" in p)) p.researching = null;
      if (typeof p.progress !== "number") p.progress = 0;
      if (typeof p.gold !== "number") p.gold = 50;
      if (typeof p.gpPoints !== "number") p.gpPoints = 0;
      if (typeof p.gpNext !== "number") p.gpNext = GP_BASE_THRESHOLD;
      if (typeof p.gpRotate !== "number") p.gpRotate = 0;
      if (!Array.isArray(p.cityNames)) {
        const nat = NATIONS.find((n) => n.name === p.name);
        const taken = new Set(S.cities.filter((c) => c.owner === i).map((c) => c.name));
        p.cityNames = nat ? nat.cityNames.filter((n) => !taken.has(n)) : [];
      }
    });
    recomputeBorders();
    return !!S && !!S.map;
  } catch { return false; }
}

export function getState() { return S; }
export function getVisible() { return visible; }

export {
  TILE, TERRAIN, UNITS, BUILDINGS, WONDERS, TECHS, DIFFICULTIES, NATIONS, RELIGIONS, RESOURCES, W, H, TS, SAVE_KEY,
  CULTURE_WIN_CITIES, CULTURE_WIN_THRESHOLD, GREAT_PEOPLE, GP_ORDER,
  key, inMap, unitsAt, cityAt, cityById, unitById, isCoastal,
  newGame, spawn, upgradeCost, upgradeUnit, computeVision, reachable, moveUnit, attack, foundCity, drownCheck, nextInStack,
  cityYields, techAvailable, processEconomy, playerGoldPerTurn, buyForGold, endTurn, save, load, legendaryCities,
  foundReligion, checkFoundReligions, spreadReligions, isHolyCity, playerEffects, grantFreeTech, useGreatPerson,
  relKey, atWar, declareWar, makePeace, offerPeace, strengthOf, aiDiplomacy,
  unitAvailable, resourceConnected, hasMarble, wonderCost,
};

export function debugApi() {
  return {
    get S() { return S; },
    get TECHS() { return TECHS; },
    get UNITS() { return UNITS; },
    get BUILDINGS() { return BUILDINGS; },
    get WONDERS() { return WONDERS; },
    get NATIONS() { return NATIONS; },
    get RELIGIONS() { return RELIGIONS; },
    get RESOURCES() { return RESOURCES; },
    get GREAT_PEOPLE() { return GREAT_PEOPLE; },
    get GP_ORDER() { return GP_ORDER; },
    get CULTURE_WIN_CITIES() { return CULTURE_WIN_CITIES; },
    get CULTURE_WIN_THRESHOLD() { return CULTURE_WIN_THRESHOLD; },
    getNations: () => NATIONS,
    legendaryCities,
    newGame,
    endTurn,
    aiTurn,
    aiTurnOne,
    aiDiplomacy,
    relKey,
    atWar,
    declareWar,
    makePeace,
    offerPeace,
    strengthOf,
    findStarts,
    playerAlive,
    foundCity,
    attack,
    moveUnit,
    spawn,
    upgradeCost,
    upgradeUnit,
    drownCheck,
    nextInStack,
    save,
    load,
    computeVision,
    processEconomy,
    playerGoldPerTurn,
    buyForGold,
    foundReligion,
    checkFoundReligions,
    spreadReligions,
    isHolyCity,
    techAvailable,
    grantFreeTech,
    useGreatPerson,
    cityYields,
    buildingEffects,
    playerEffects,
    reachable,
    canEnter,
    isNaval,
    tradeActive,
    recomputeBorders,
    cityRadius,
    unitAvailable,
    resourceConnected,
    hasMarble,
    wonderCost,
    getTileOwner: () => Array.from(S.tileOwner),
  };
}
