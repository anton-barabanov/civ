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
  worker: { name: "Рабочий", letter: "Т", icon: "👷", atk: 0, def: 1, moves: 1, cost: 25, tech: "pottery", upgrade: null },
  missionary: { name: "Миссионер", letter: "Мс", icon: "🕯", atk: 0, def: 1, moves: 2, cost: 40, tech: "mysticism", upgrade: null },
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
const TRADE_COOLDOWN = 10;
const MIL_TECHS = ["iron", "horsebackriding", "machinery", "feudalism", "gunpowder"];

const BUILDINGS = {
  granary: { name: "Амбар", cost: 40, tech: "pottery", desc: "+2 еды", effects: { foodFlat: 2 } },
  library: { name: "Библиотека", cost: 50, tech: "writing", desc: "+50% науки", effects: { sciMult: 1.5 } },
  walls: { name: "Стены", cost: 40, tech: "masonry", desc: "+50% защиты города", effects: { defMult: 1.5 } },
  forge: { name: "Кузница", cost: 55, tech: "bronze", desc: "+2 производства", effects: { prodFlat: 2 } },
  temple: { name: "Храм", cost: 50, tech: "mysticism", desc: "+2 культуры, +1 счастья", effects: { culture: 2, happiness: 1 } },
  amphitheater: { name: "Амфитеатр", cost: 60, tech: "literature", desc: "+2 счастья", effects: { happiness: 2 } },
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

const SS_PARTS = {
  hull: { name: "Корпус корабля", cost: 150 },
  engine: { name: "Двигатель", cost: 180 },
  crew: { name: "Модуль экипажа", cost: 200 },
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
  chemistry: { name: "Химия", cost: 180, req: ["education", "gunpowder"] },
  electricity: { name: "Электричество", cost: 230, req: ["chemistry"] },
  rocketry: { name: "Ракетостроение", cost: 300, req: ["electricity"] },
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
    impr: new Array(W * H).fill(null),
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
      stateReligion: null,
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
    space: {},
    resDeals: [],
    tributes: {},
    pendingTribute: null,
  };
  for (let i = 0; i < S.players.length; i++)
    for (let j = i + 1; j < S.players.length; j++)
      S.relations[relKey(i, j)] = { war: false, since: -1, lastTradeTurn: -99 };
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

function roadDoneAt(k) {
  const im = S.impr && S.impr[k];
  return !!(im && im.kind === "road" && !im.left);
}

function reachable(u) {
  const budget = u.moves * 2;
  const res = new Map();
  const buckets = [];
  for (let i = 0; i <= budget; i++) buckets.push([]);
  buckets[budget].push([u.x, u.y]);
  const seen = new Set([key(u.x, u.y)]);
  for (let m = budget; m > 0; m--) {
    const bq = buckets[m];
    while (bq.length) {
      const [x, y] = bq.shift();
      const fromRoad = roadDoneAt(key(x, y));
      for (const [nx, ny] of neighbors(x, y)) {
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        if (!canEnter(u, nx, ny)) continue;
        const cost = fromRoad && roadDoneAt(k) ? 1 : 2;
        const other = unitsAt(nx, ny).find((o) => o.owner !== u.owner) || null;
        const city = cityAt(nx, ny);
        const foe = other ? other.owner : (city && city.owner !== u.owner ? city.owner : null);
        if (foe !== null) {
          if (atWar(u.owner, foe)) res.set(k, 0);
          else if (u.type === "missionary" && !other && city && m >= cost) res.set(k, m - cost);
          continue;
        }
        if (m < cost) continue;
        seen.add(k);
        res.set(k, m - cost);
        buckets[m - cost].push([nx, ny]);
      }
    }
  }
  res.delete(key(u.x, u.y));
  return res;
}

function moveUnit(u, x, y) {
  if (u.work) { addLog("Рабочий занят"); return; }
  const oc = cityAt(x, y);
  if (oc && oc.owner !== u.owner && !atWar(u.owner, oc.owner) && u.type !== "missionary") return;
  const cargo = isNaval(u) ? unitsAt(u.x, u.y).filter((o) => !isNaval(o)) : [];
  u.x = x;
  u.y = y;
  u.moves = 0;
  for (const p of cargo) { p.x = x; p.y = y; }
  computeVision();
  const c = cityAt(x, y);
  if (c && c.owner !== u.owner && atWar(u.owner, c.owner) && !unitsAt(x, y).some((o) => o.owner === c.owner)) {
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
    unhappy: 0,
    happy: 1,
    riot: 0,
    revoltPressure: 0,
    flipCooldown: 0,
    revoltBy: null,
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

function startImprovement(unitId, kind) {
  const u = unitById(unitId);
  if (!u) return { ok: false, reason: "юнит не найден" };
  if (u.type !== "worker") return { ok: false, reason: "это не рабочий" };
  if (u.work) return { ok: false, reason: "рабочий уже занят" };
  if (kind !== "farm" && kind !== "mine" && kind !== "road") return { ok: false, reason: "неизвестное улучшение" };
  if (u.moves <= 0) return { ok: false, reason: "нет ходов" };
  const k = key(u.x, u.y);
  if (cityAt(u.x, u.y)) return { ok: false, reason: "под городом улучшений нет" };
  if (!S.tileOwner || S.tileOwner[k] !== u.owner) return { ok: false, reason: "улучшения строятся только на своей территории" };
  const t = S.map[k];
  if (kind === "farm" && t !== TILE.GRASS && t !== TILE.PLAINS)
    return { ok: false, reason: "ферма строится на лугах или равнине" };
  if (kind === "mine" && t !== TILE.HILLS)
    return { ok: false, reason: "шахта строится на холмах" };
  if (kind === "road" && (t === TILE.OCEAN || !TERRAIN[t].passable))
    return { ok: false, reason: "дорога строится на проходимой суше" };
  if (S.impr[k]) return { ok: false, reason: "улучшение уже есть" };
  const left = kind === "road" ? 2 : 3;
  u.work = { kind, left };
  S.impr[k] = { kind, left };
  u.moves = 0;
  return { ok: true };
}

function cancelWork(unitId) {
  const u = unitById(unitId);
  if (!u) return { ok: false, reason: "юнит не найден" };
  if (!u.work) return { ok: false, reason: "рабочий не занят работой" };
  S.impr[key(u.x, u.y)] = null;
  u.work = null;
  return { ok: true };
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

function landTradeActive(c) {
  if (!S.tileOwner) return false;
  if (!S.cities.some((o) => o.owner === c.owner && o.id !== c.id)) return false;
  const seen = new Set();
  const q = [];
  for (const [nx, ny] of neighbors(c.x, c.y)) {
    const k = key(nx, ny);
    if (S.tileOwner[k] !== c.owner || !TERRAIN[S.map[k]].passable || !roadDoneAt(k)) continue;
    seen.add(k);
    q.push([nx, ny]);
  }
  while (q.length) {
    const [x, y] = q.shift();
    for (const [nx, ny] of neighbors(x, y)) {
      const oc = cityAt(nx, ny);
      if (oc && oc.owner === c.owner && oc.id !== c.id) return true;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      if (S.tileOwner[k] !== c.owner || !TERRAIN[S.map[k]].passable || !roadDoneAt(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}

function buildingEffects(c) {
  const e = { foodFlat: 0, prodFlat: 0, sciFlat: 0, sciMult: 1, defMult: 1, tradeMult: 1, culture: 0, unitAtk: 0, maxPop: 0, happiness: 0 };
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
    e.happiness += f.happiness || 0;
  }
  return e;
}

function stateReligionBonus(c) {
  const p = S.players[c.owner];
  return p.stateReligion && c.religion === p.stateReligion ? 1 : 0;
}

function cityHappiness(c) {
  const unhappy = Math.max(0, c.pop - 4) + Object.entries(S.relations).reduce((a, [k, r]) => a + (r.war && k.split(":").map(Number).includes(c.owner) ? Math.floor((S.turn - r.since) / 10) : 0), 0);
  const happy = 1 + buildingEffects(c).happiness + stateReligionBonus(c);
  return { unhappy, happy, riot: unhappy > happy + 2 };
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

function spreadFaith(unitId) {
  const u = unitById(unitId);
  if (!u) return { ok: false, reason: "юнит не найден" };
  if (u.type !== "missionary") return { ok: false, reason: "это не миссионер" };
  const c = cityAt(u.x, u.y);
  if (!c) return { ok: false, reason: "миссионер должен быть в городе" };
  if (atWar(u.owner, c.owner)) return { ok: false, reason: "в военное время вера не распространяется" };
  const p = S.players[u.owner];
  const rel = u.relOf || p.stateReligion || (S.religions.find((r) => r.owner === u.owner) || {}).id || null;
  if (!rel || !RELIGIONS[rel]) return { ok: false, reason: "у миссионера нет религии" };
  c.religion = rel;
  c.relPressure = 0;
  S.units = S.units.filter((x) => x !== u);
  if (S.sel === u.id) S.sel = null;
  addLog(`${p.name}: миссионеры распространили ${RELIGIONS[rel].name} в городе ${c.name}`);
  return { ok: true };
}

function declareStateReligion(pIdx, relId) {
  const p = S.players[pIdx];
  if (!p) return { ok: false, reason: "игрок не найден" };
  if (!S.religions.some((r) => r.id === relId)) return { ok: false, reason: "религия не основана" };
  if (p.stateReligion === relId) return { ok: false, reason: "это уже государственная религия" };
  if (!S.cities.some((c) => c.owner === pIdx && c.religion === relId))
    return { ok: false, reason: "религии нет в городах игрока" };
  p.stateReligion = relId;
  addLog(`${p.name}: государственная религия — ${RELIGIONS[relId].name}`);
  return { ok: true };
}

function relWarFactor(i, j) {
  const a = S.players[i] && S.players[i].stateReligion;
  const b = S.players[j] && S.players[j].stateReligion;
  if (a && b) return a === b ? 0.5 : 1.3;
  return 1;
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
      const im = S.impr ? S.impr[key(nx, ny)] : null;
      if (im && !im.left && im.kind === "farm") f += 1;
      if (im && !im.left && im.kind === "mine") p += 1;
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
  const land = !trade && landTradeActive(c);
  const tradeGold = trade ? 2 * e.tradeMult * pe.tradeMult : land ? 1 : 0;
  const holyGold = (S.players[c.owner].stateReligion === c.religion && isHolyCity(c)) ? 2 : 0;
  const gold = 3 + Math.floor(c.pop / 2) + tradeGold + holyGold;
  return { food, prod, sci, gold, trade: trade || land, tradeGold };
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

function grantTech(p, id) {
  if (!TECHS[id] || p.techs.includes(id)) return false;
  p.techs.push(id);
  if (p.researching === id) { p.researching = null; p.progress = 0; }
  addLog(`Получена технология: ${TECHS[id].name}`);
  return true;
}

function grantFreeTech(p) {
  const avail = Object.keys(TECHS).filter((t) => techAvailable(p, t))
    .sort((a, b) => TECHS[a].cost - TECHS[b].cost);
  if (!avail.length) return null;
  grantTech(p, avail[0]);
  return avail[0];
}

function resourceOwned(pIdx, r) {
  if (!S.res || !S.tileOwner) return false;
  for (let i = 0; i < W * H; i++)
    if (S.res[i] === r && S.tileOwner[i] === pIdx) return true;
  return false;
}

function resourceConnected(pIdx, r) {
  if (resourceOwned(pIdx, r)) return true;
  return (S.resDeals || []).some((d) => d.to === pIdx && d.res === r && d.left > 0 && !atWar(pIdx, d.from));
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
  return (S.resDeals || []).some((d) => d.res === "marble" && d.to === c.owner && d.left > 0 && !atWar(d.from, d.to));
}

function wonderCost(c, id) {
  const d = WONDERS[id];
  if (!d) return 0;
  return hasMarble(c) ? Math.floor(d.cost * 0.75) : d.cost;
}

function processWork() {
  for (let i = 0; i < W * H; i++) {
    const im = S.impr[i];
    if (!im || !im.left) continue;
    if (!S.units.some((u) => u.work && key(u.x, u.y) === i)) S.impr[i] = null;
  }
  for (const u of S.units) {
    if (!u.work) continue;
    const k = key(u.x, u.y);
    if (S.tileOwner && S.tileOwner[k] !== u.owner) continue;
    u.work.left--;
    if (u.work.left <= 0) {
      S.impr[k] = { kind: u.work.kind };
      const nm = u.work.kind === "farm" ? "ферма" : u.work.kind === "mine" ? "шахта" : "дорога";
      u.work = null;
      addLog(u.owner === 0 ? `Построено улучшение: ${nm}` : `${S.players[u.owner].name}: построено улучшение — ${nm}`);
    } else {
      S.impr[k] = { kind: u.work.kind, left: u.work.left };
    }
  }
  for (const u of S.units) if (u.work) u.moves = 0;
}

function flipCity(c, j) {
  const old = c.owner;
  c.owner = j;
  c.culture = Math.floor((c.culture || 0) / 2);
  c.prodStored = 0;
  c.producing = null;
  c.revoltPressure = 0;
  c.flipCooldown = 10;
  c.riot = 0;
  c.revoltBy = null;
  S.units = S.units.filter((u) => !(u.x === c.x && u.y === c.y && u.owner === old));
  if (S.sel && !unitById(S.sel)) S.sel = null;
  addLog(`Город ${c.name} восстал и присоединился к ${S.players[j].name}!`);
  recomputeBorders();
  checkVictory();
}

function processRevolts() {
  for (const c of S.cities) {
    if (c.flipCooldown > 0) { c.flipCooldown--; continue; }
    const cap = S.cities.filter((o) => o.owner === c.owner)
      .sort((a, b) => (b.culture || 0) - (a.culture || 0) || a.id - b.id)[0];
    if (c === cap) {
      c.revoltPressure = Math.max(0, (c.revoltPressure || 0) - 1);
      c.revoltBy = null;
      continue;
    }
    const R = cityRadius(c);
    let total = 0;
    const foreign = {};
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        const nx = c.x + dx, ny = c.y + dy;
        if (!inMap(nx, ny)) continue;
        total++;
        const o = S.tileOwner[key(nx, ny)];
        if (o !== -1 && o !== c.owner) foreign[o] = (foreign[o] || 0) + 1;
      }
    const best = S.cities
      .filter((o) => o.owner !== c.owner && !atWar(c.owner, o.owner) &&
        dist(c.x, c.y, o.x, o.y) <= R + 2 && (o.culture || 0) >= 1.5 * (c.culture || 0))
      .sort((a, b) => (b.culture || 0) - (a.culture || 0) ||
        dist(c.x, c.y, a.x, a.y) - dist(c.x, c.y, b.x, b.y) || a.id - b.id)[0] || null;
    let delta = -1;
    if (best && (foreign[best.owner] || 0) / total >= 0.5) {
      delta = 1 + (c.riot ? 1 : 0);
      c.revoltBy = best.owner;
    } else {
      c.revoltBy = null;
    }
    if (S.units.some((u) => u.x === c.x && u.y === c.y && u.owner === c.owner &&
        UNITS[u.type].atk > 0 && !UNITS[u.type].gp)) delta -= 1;
    c.revoltPressure = Math.max(0, (c.revoltPressure || 0) + delta);
    if (best && c.revoltPressure >= 5) flipCity(c, best.owner);
  }
}

function processDeals() {
  if (S.tributes) {
    for (const tk of Object.keys(S.tributes)) {
      const [i, j] = tk.split(":").map(Number);
      if (!S.players[i] || !S.players[j] || atWar(i, j) || !playerAlive(i) || !playerAlive(j)) {
        delete S.tributes[tk];
        continue;
      }
      const t = S.tributes[tk];
      const pay = Math.min(S.players[i].gold, t.amount);
      S.players[i].gold -= pay;
      S.players[j].gold += pay;
      t.turnsLeft--;
      if (t.turnsLeft <= 0) {
        delete S.tributes[tk];
        addLog(`Дань завершена: ${S.players[i].name} → ${S.players[j].name}`);
      }
    }
  }
  if (S.resDeals && S.resDeals.length) {
    for (const d of [...S.resDeals]) {
      if (!S.players[d.from] || !S.players[d.to] || atWar(d.from, d.to) ||
        !playerAlive(d.from) || !playerAlive(d.to)) {
        S.resDeals = S.resDeals.filter((x) => x !== d);
        continue;
      }
      d.left--;
      if (d.left <= 0) {
        S.resDeals = S.resDeals.filter((x) => x !== d);
        addLog(`Срок сделки о ресурсе истёк: ${RESOURCES[d.res].name} (${S.players[d.from].name} → ${S.players[d.to].name})`);
      }
    }
  }
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
    const cultGrowth = 1 + e.culture + (c.religion ? 1 : 0) +
      (p.stateReligion && c.religion === p.stateReligion ? 1 : 0);
    c.culture = (c.culture || 0) + cultGrowth;
    p.gpPoints = (p.gpPoints || 0) + Math.floor(cultGrowth / 2);
    const hap = cityHappiness(c);
    const wasBad = (c.unhappy || 0) > (c.happy ?? 1);
    c.unhappy = hap.unhappy;
    c.happy = hap.happy;
    const riotNow = hap.riot && !c.riot;
    c.riot = riotNow ? 1 : 0;
    if (riotNow) addLog(`Город ${c.name} охвачен бунтом`);
    else if (c.owner === 0 && hap.unhappy > hap.happy && !wasBad) addLog(`В ${c.name} недовольство: рост остановлен`);
    const surplus = y.food - c.pop * 2;
    c.foodStored = Math.max(0, c.foodStored + (hap.unhappy > hap.happy ? Math.min(0, surplus) : surplus));
    const need = 10 + c.pop * 5;
    if (c.foodStored >= need && c.pop < 10 + e.maxPop) {
      c.pop++;
      c.foodStored -= need;
      if (c.owner === 0) addLog(`${c.name} вырос до ${c.pop} населения`);
    }
    if (!riotNow) c.prodStored += hap.unhappy > hap.happy
      ? Math.floor(y.prod * 0.5 * (p.isHuman ? 1 : diff.prodMult))
      : y.prod * (p.isHuman ? 1 : diff.prodMult);
    if (c.producing) {
      const def = c.producing.k === "unit" ? UNITS[c.producing.id] : c.producing.k === "building" ? BUILDINGS[c.producing.id] : c.producing.k === "project" ? SS_PARTS[c.producing.id] : WONDERS[c.producing.id];
      const cost = c.producing.k === "wonder" ? wonderCost(c, c.producing.id) : def.cost;
      if (c.prodStored >= cost) {
        if (c.producing.k === "project") {
          if ((S.space[c.owner] || []).includes(c.producing.id)) {
            c.prodStored += Math.floor(def.cost / 2);
            addLog(`${def.name} уже построена — 50% вложений возвращено производству`);
          } else {
            c.prodStored -= def.cost;
            S.space[c.owner] = [...(S.space[c.owner] || []), c.producing.id];
            addLog(`Построена часть корабля: ${def.name} — ${S.players[c.owner].name}`);
          }
          c.producing = null;
        } else if (c.producing.k === "wonder") {
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
            if (born && born.type === "missionary" && c.religion) born.relOf = c.religion;
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
  processWork();
  processRevolts();
  processDeals();
}

function buyForGold(cityId, k, id) {
  const c = cityById(cityId);
  if (!c) return { ok: false, reason: "город не найден" };
  if (k === "wonder") return { ok: false, reason: "чудеса нельзя купить за золото" };
  if (k === "project") return { ok: false, reason: "части корабля нельзя купить за золото" };
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
  if (k === "unit" && id === "missionary" && !c.religion) return { ok: false, reason: "в городе нужна религия" };
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
    if (id === "missionary" && c.religion) born.relOf = c.religion;
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
  if (!p.stateReligion) {
    const mine = S.cities.filter((c) => c.owner === owner);
    let bestRel = null, bestN = 0;
    for (const id of Object.keys(RELIGIONS)) {
      const n = mine.filter((c) => c.religion === id).length;
      if (n > bestN) { bestN = n; bestRel = id; }
    }
    if (bestRel && bestN > mine.length / 2) declareStateReligion(owner, bestRel);
  }
  const aiRel = p.stateReligion || (S.religions.find((r) => r.owner === owner) || {}).id || null;
  const myUnits = S.units.filter((u) => u.owner === owner);
  const myCities = S.cities.filter((c) => c.owner === owner);
  const flagship = p.techs.includes("rocketry") && myCities.length >= 3
    ? myCities.slice().sort((a, b) => cityYields(b).prod - cityYields(a).prod || a.id - b.id)[0]
    : null;
  const military = () => myUnits.filter((u) => !UNITS[u.type].gp && UNITS[u.type].atk > 0)
    .sort((a, b) => UNITS[a.type].atk - UNITS[b.type].atk);
  if (myCities.length) {
    const cap = myCities.length * 3 + 2;
    if (myUnits.length > cap) {
      const weakest = military()[0];
      if (weakest) S.units = S.units.filter((u) => u !== weakest);
    }
    const gp = playerGoldPerTurn(owner);
    if (gp.net < 0 && p.gold < 20) {
      const weakest = military()[0];
      if (weakest) {
        S.units = S.units.filter((u) => u !== weakest);
        addLog(`${p.name} распускают часть войск — казна пуста`);
      }
    }
  }
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
      const hap = cityHappiness(c);
      const happyBld = hap.unhappy > hap.happy
        ? ["amphitheater", "temple"].find((b) =>
            !c.buildings.includes(b) && (!BUILDINGS[b].tech || p.techs.includes(BUILDINGS[b].tech)))
        : null;
      if (happyBld) {
        c.producing = { k: "building", id: happyBld };
      } else if (c.pop >= 4 && availWonders.length && Math.random() < diff.wonderChance) {
        c.producing = { k: "wonder", id: availWonders[(Math.random() * availWonders.length) | 0] };
      } else if (settlers === 0 && myCities < diff.maxCities && Math.random() < diff.settlerChance) {
        c.producing = { k: "unit", id: "settler" };
      } else if (myCities >= 2 && myUnits.filter((u) => u.type === "worker").length < myCities && unitAvailable(owner, "worker")) {
        c.producing = { k: "unit", id: "worker" };
      } else if (aiRel && unitAvailable(owner, "missionary") && c.religion &&
        !myUnits.some((u) => u.type === "missionary") &&
        S.cities.some((o) => o.owner !== owner && !atWar(owner, o.owner) && o.religion !== aiRel && dist(c.x, c.y, o.x, o.y) <= 6)) {
        c.producing = { k: "unit", id: "missionary" };
      } else if (flagship && c === flagship && Object.keys(SS_PARTS).some((id) => !(S.space[owner] || []).includes(id))) {
        c.producing = { k: "project", id: Object.keys(SS_PARTS).find((id) => !(S.space[owner] || []).includes(id)) };
      } else if (c.pop >= 3 && !c.buildings.includes("library") && Math.random() < 0.35) {
        const avail = ["granary", "library", "temple", "amphitheater", "forge", "market"].filter(
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
    if (u.type === "worker") {
      if (u.work) { u.moves = 0; continue; }
      const roadCells = !fighting && myCities.length >= 2 ? aiRoadCells(owner) : null;
      const comp = landCompOf(u.x, u.y);
      let best = null, bestPrio = 0, bestD = 0, bestK = -1;
      for (let i = 0; i < W * H; i++) {
        if (S.tileOwner[i] !== owner || S.impr[i] || !comp.has(i)) continue;
        const x = i % W, y = (i / W) | 0;
        if (cityAt(x, y)) continue;
        const t = S.map[i];
        const kind = roadCells && roadCells.has(i) ? "road"
          : t === TILE.HILLS ? "mine"
          : (t === TILE.GRASS || t === TILE.PLAINS) ? "farm" : null;
        if (!kind) continue;
        const prio = kind === "road" ? 3 : kind === "mine" ? 2 : 1;
        const d = dist(u.x, u.y, x, y);
        if (!best || prio > bestPrio || (prio === bestPrio && (d < bestD || (d === bestD && i < bestK)))) {
          best = { x, y, kind };
          bestPrio = prio;
          bestD = d;
          bestK = i;
        }
      }
      if (!best) { u.moves = 0; continue; }
      if (u.x === best.x && u.y === best.y) { startImprovement(u.id, best.kind); continue; }
      while (u.moves > 0 && (u.x !== best.x || u.y !== best.y)) {
        const before = u.x + "," + u.y;
        stepToward(u, best.x, best.y);
        if (u.x + "," + u.y === before) break;
      }
      if (u.x === best.x && u.y === best.y) startImprovement(u.id, best.kind);
      continue;
    }
    if (u.type === "missionary") {
      const war = S.players.some((_, i) => i !== owner && atWar(owner, i));
      if (war || !aiRel) {
        const home = S.cities.filter((c) => c.owner === owner)
          .sort((a, b) => dist(u.x, u.y, a.x, a.y) - dist(u.x, u.y, b.x, b.y) || a.id - b.id)[0];
        if (home) {
          while (u.moves > 0 && (u.x !== home.x || u.y !== home.y)) {
            const before = u.x + "," + u.y;
            stepToward(u, home.x, home.y);
            if (u.x + "," + u.y === before) break;
          }
        } else {
          u.moves = 0;
        }
        continue;
      }
      let tgt = null, tdist = Infinity;
      for (const c of S.cities) {
        if (c.religion === aiRel) continue;
        if (c.owner !== owner && atWar(owner, c.owner)) continue;
        const d = dist(u.x, u.y, c.x, c.y);
        if (d < tdist || (d === tdist && tgt && c.id < tgt.id)) { tdist = d; tgt = c; }
      }
      if (tgt) {
        while (u.moves > 0 && (u.x !== tgt.x || u.y !== tgt.y)) {
          const before = u.x + "," + u.y;
          stepToward(u, tgt.x, tgt.y);
          if (u.x + "," + u.y === before) break;
        }
        if (u.x === tgt.x && u.y === tgt.y) spreadFaith(u.id);
      } else {
        u.moves = 0;
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

function aiRoadCells(owner) {
  const cities = S.cities.filter((c) => c.owner === owner).sort((a, b) => a.id - b.id);
  let a = null, b = null, pd = Infinity;
  for (let i = 0; i < cities.length; i++)
    for (let j = i + 1; j < cities.length; j++) {
      const d = dist(cities[i].x, cities[i].y, cities[j].x, cities[j].y);
      if (d < pd || (d === pd && a && (cities[i].id < a.id || (cities[i].id === a.id && cities[j].id < b.id)))) {
        pd = d;
        a = cities[i];
        b = cities[j];
      }
    }
  const cells = new Set();
  if (!a) return cells;
  const ok = (x, y) => {
    if (!inMap(x, y)) return false;
    const k = key(x, y);
    return S.tileOwner[k] === owner && TERRAIN[S.map[k]].passable && !cityAt(x, y) &&
      (!S.impr[k] || roadDoneAt(k));
  };
  const goal = new Set();
  for (const [nx, ny] of neighbors(b.x, b.y)) if (ok(nx, ny)) goal.add(key(nx, ny));
  const par = new Map();
  const q = [];
  let meet = -1;
  for (const [nx, ny] of neighbors(a.x, a.y)) {
    if (!ok(nx, ny)) continue;
    const k = key(nx, ny);
    if (par.has(k)) continue;
    par.set(k, -1);
    q.push(k);
    if (goal.has(k) && meet === -1) meet = k;
  }
  for (let qi = 0; qi < q.length && meet === -1; qi++) {
    const k = q[qi];
    const x = k % W, y = (k / W) | 0;
    for (const [nx, ny] of neighbors(x, y)) {
      if (!ok(nx, ny)) continue;
      const nk = key(nx, ny);
      if (par.has(nk)) continue;
      par.set(nk, k);
      q.push(nk);
      if (goal.has(nk)) { meet = nk; break; }
    }
  }
  if (meet === -1) return cells;
  for (let k = meet; k !== -1; k = par.get(k)) if (!S.impr[k]) cells.add(k);
  return cells;
}

function stepToward(u, tx, ty) {
  const opts = neighbors(u.x, u.y).filter(([nx, ny]) => {
    if (!canEnter(u, nx, ny)) return false;
    if (unitsAt(nx, ny).some((o) => o.owner !== u.owner)) return false;
    const c = cityAt(nx, ny);
    if (c && c.owner !== u.owner && !(u.type === "missionary" && !atWar(u.owner, c.owner))) return false;
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
  let purged = false;
  if (S.tributes) {
    for (const tk of [`${i}:${j}`, `${j}:${i}`])
      if (S.tributes[tk]) { delete S.tributes[tk]; purged = true; }
  }
  if (S.resDeals && S.resDeals.some((d) => (d.from === i && d.to === j) || (d.from === j && d.to === i))) {
    S.resDeals = S.resDeals.filter((d) => !((d.from === i && d.to === j) || (d.from === j && d.to === i)));
    purged = true;
  }
  if (S.pendingTribute && (S.pendingTribute.ai === i || S.pendingTribute.ai === j)) {
    S.pendingTribute = null;
    purged = true;
  }
  if (purged) addLog(`Сделки и дань аннулированы: война (${S.players[i].name} ↔ ${S.players[j].name})`);
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
    strengthOf(weak) < PEACE_STRENGTH * strengthOf(strong) * relWarFactor(weak, strong);
}

function offerPeace(humanIdx, aiIdx) {
  if (readyForPeace(aiIdx, humanIdx)) {
    makePeace(humanIdx, aiIdx);
    return true;
  }
  addLog(`${S.players[aiIdx].name} отвергают предложение мира`);
  return false;
}

function dealValue(bag) {
  if (!bag) return 0;
  let v = 0;
  for (const t of bag.techs || []) if (TECHS[t]) v += TECHS[t].cost;
  v += Math.max(0, bag.gold || 0);
  v += 40 * (bag.res || []).length;
  return v;
}

function aiAcceptsDeal(ai, other, aiGives, aiGets) {
  const gives = typeof aiGives === "string" ? { techs: [aiGives] } : (aiGives || {});
  const gets = typeof aiGets === "string" ? { techs: [aiGets] } : (aiGets || {});
  const mil = (gives.techs || []).some((t) => MIL_TECHS.includes(t));
  const ratio = mil && strengthOf(other) > strengthOf(ai) ? 1 : 0.8;
  return dealValue(gets) >= dealValue(gives) * ratio * relWarFactor(ai, other);
}

function valueOfDeal(aiIdx, aiGivesId, aiGetsId) {
  return aiAcceptsDeal(aiIdx, 0, aiGivesId, aiGetsId);
}

function offerTechTrade(fromIdx, toIdx, giveTechId, wantTechId) {
  const from = S.players[fromIdx], to = S.players[toIdx];
  const r = S.relations[relKey(fromIdx, toIdx)];
  const no = (reason) => {
    addLog(`Обмен технологиями отклонён: ${reason}`);
    return { ok: false, reason };
  };
  if (!r || r.war) return no("торговля возможна только в мирное время");
  if (!TECHS[giveTechId] || !TECHS[wantTechId]) return no("неизвестная технология");
  if (!from.techs.includes(giveTechId)) return no("отдаваемая технология не изучена");
  if (to.techs.includes(giveTechId)) return no("технология уже известна партнёру");
  if (!to.techs.includes(wantTechId)) return no("у партнёра нет запрашиваемой технологии");
  if (from.techs.includes(wantTechId)) return no("технология уже изучена вами");
  if (S.turn - (r.lastTradeTurn ?? -99) < TRADE_COOLDOWN) return no("обмен был недавно");
  if (!to.isHuman && !aiAcceptsDeal(toIdx, fromIdx, wantTechId, giveTechId))
    return no("сделка невыгодна для партнёра");
  grantTech(from, wantTechId);
  grantTech(to, giveTechId);
  r.lastTradeTurn = S.turn;
  addLog(`Обмен технологиями: ${from.name} ↔ ${to.name}`);
  return { ok: true };
}

function activeResDeal(i, j, res) {
  return (S.resDeals || []).some((d) => d.res === res && d.left > 0 &&
    ((d.from === i && d.to === j) || (d.from === j && d.to === i)));
}

function bagText(bag) {
  const parts = [];
  if ((bag.techs || []).length) parts.push(bag.techs.map((t) => TECHS[t].name).join(", "));
  if (bag.gold) parts.push(`${bag.gold}🪙`);
  if ((bag.res || []).length) parts.push(bag.res.map((r) => RESOURCES[r].name).join(", "));
  return parts.length ? parts.join(" + ") : "ничего";
}

function offerDeal(fromIdx, toIdx, deal) {
  const from = S.players[fromIdx], to = S.players[toIdx];
  const give = (deal && deal.give) || {};
  const get = (deal && deal.get) || {};
  const no = (reason) => {
    addLog(`Сделка отклонена: ${reason}`);
    return { ok: false, reason };
  };
  if (!from || !to || fromIdx === toIdx) return no("неизвестный партнёр");
  const r = S.relations[relKey(fromIdx, toIdx)];
  if (!r || r.war) return no("торговля возможна только в мирное время");
  const giveTechs = give.techs || [], getTechs = get.techs || [];
  const giveGold = give.gold || 0, getGold = get.gold || 0;
  const giveRes = give.res || [], getRes = get.res || [];
  if (giveTechs.length === 1 && getTechs.length === 1 && !giveGold && !getGold && !giveRes.length && !getRes.length)
    return offerTechTrade(fromIdx, toIdx, giveTechs[0], getTechs[0]);
  if (dealValue(give) === 0 && dealValue(get) === 0) return no("пустая сделка");
  if (giveGold < 0 || getGold < 0) return no("некорректная сумма золота");
  if (S.turn - (r.lastTradeTurn ?? -99) < TRADE_COOLDOWN) return no("сделка была недавно");
  for (const t of giveTechs) {
    if (!TECHS[t]) return no("неизвестная технология");
    if (!from.techs.includes(t)) return no("отдаваемая технология не изучена");
    if (to.techs.includes(t)) return no("технология уже известна партнёру");
  }
  for (const t of getTechs) {
    if (!TECHS[t]) return no("неизвестная технология");
    if (!to.techs.includes(t)) return no("у партнёра нет запрашиваемой технологии");
    if (from.techs.includes(t)) return no("технология уже изучена вами");
  }
  if (giveGold > from.gold) return no("недостаточно золота");
  if (getGold > to.gold) return no("у партнёра недостаточно золота");
  for (const res of giveRes) {
    if (!RESOURCES[res]) return no("неизвестный ресурс");
    if (!resourceOwned(fromIdx, res)) return no(`ресурс не подключён: ${RESOURCES[res].name}`);
    if (activeResDeal(fromIdx, toIdx, res)) return no("сделка по этому ресурсу уже действует");
  }
  for (const res of getRes) {
    if (!RESOURCES[res]) return no("неизвестный ресурс");
    if (!resourceOwned(toIdx, res)) return no(`у партнёра нет ресурса: ${RESOURCES[res].name}`);
    if (activeResDeal(fromIdx, toIdx, res)) return no("сделка по этому ресурсу уже действует");
  }
  if (!to.isHuman && !aiAcceptsDeal(toIdx, fromIdx, get, give))
    return no("сделка невыгодна для партнёра");
  if (!S.resDeals) S.resDeals = [];
  if (giveGold) { from.gold -= giveGold; to.gold += giveGold; }
  if (getGold) { to.gold -= getGold; from.gold += getGold; }
  for (const t of giveTechs) grantTech(to, t);
  for (const t of getTechs) grantTech(from, t);
  for (const res of giveRes) S.resDeals.push({ from: fromIdx, to: toIdx, res, left: 20 });
  for (const res of getRes) S.resDeals.push({ from: toIdx, to: fromIdx, res, left: 20 });
  r.lastTradeTurn = S.turn;
  addLog(`Сделка: ${from.name} ↔ ${to.name} — ${bagText(give)} за ${bagText(get)}`);
  return { ok: true };
}

function demandTribute(fromIdx, toIdx) {
  const from = S.players[fromIdx], to = S.players[toIdx];
  const no = (reason) => {
    addLog(`Требование дани отклонено: ${reason}`);
    return { ok: false, reason };
  };
  if (!from || !to || fromIdx === toIdx) return no("неизвестный партнёр");
  const r = S.relations[relKey(fromIdx, toIdx)];
  if (!r || r.war) return no("дань возможна только в мирное время");
  if (S.turn - (r.lastTradeTurn ?? -99) < TRADE_COOLDOWN) return no("дань была недавно");
  const amount = Math.min(30, Math.max(5, Math.round(strengthOf(toIdx) / 3)));
  if (!to.isHuman && strengthOf(toIdx) >= PEACE_STRENGTH * strengthOf(fromIdx))
    return no(`${to.name} отказываются платить дань`);
  if (!S.tributes) S.tributes = {};
  S.tributes[`${toIdx}:${fromIdx}`] = { amount, turnsLeft: 10 };
  r.lastTradeTurn = S.turn;
  addLog(`Дань: ${from.name} требует ${amount}🪙 в ход с ${to.name} (10 ходов)`);
  return { ok: true, amount };
}

function aiDiplomacy() {
  const diff = DIFFICULTIES[S.difficulty] || DIFFICULTIES[1];
  if (S.pendingTribute && S.turn > S.pendingTribute.turn) S.pendingTribute = null;
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
    if (sj > 0 && si > sj && Math.random() < Math.min(0.5, 0.05 + 0.25 * (si / sj - 1)) * relWarFactor(i, target))
      declareWar(i, target);
  }
  for (let a = 1; a < S.players.length; a++)
    for (let b = a + 1; b < S.players.length; b++)
      if (atWar(a, b) && (readyForPeace(a, b) || readyForPeace(b, a))) makePeace(a, b);
  for (let j = 1; j < S.players.length; j++)
    if (atWar(0, j) && readyForPeace(j, 0)) addLog(`${S.players[j].name} готовы к миру`);
  for (let a = 1; a < S.players.length; a++)
    for (let b = a + 1; b < S.players.length; b++) {
      if (atWar(a, b) || !playerAlive(a) || !playerAlive(b)) continue;
      const rel = S.relations[relKey(a, b)];
      if (S.turn - (rel.lastTradeTurn ?? -99) < TRADE_COOLDOWN || Math.random() >= 0.2) continue;
      const pa = S.players[a], pb = S.players[b];
      let traded = false;
      for (const x of pa.techs) {
        if (traded) break;
        if (pb.techs.includes(x)) continue;
        for (const y of pb.techs) {
          if (pa.techs.includes(y)) continue;
          if (!aiAcceptsDeal(a, b, x, y) || !aiAcceptsDeal(b, a, y, x)) continue;
          offerTechTrade(a, b, x, y);
          traded = true;
          break;
        }
      }
    }
  if (!S.pendingTribute && playerAlive(0) && Math.random() < 0.3) {
    for (let i = 1; i < S.players.length; i++) {
      if (!playerAlive(i) || atWar(0, i)) continue;
      const rel = S.relations[relKey(0, i)];
      if (!rel || S.turn - (rel.lastTradeTurn ?? -99) < TRADE_COOLDOWN) continue;
      if (strengthOf(0) >= PEACE_STRENGTH * strengthOf(i)) continue;
      const amount = Math.min(30, Math.max(5, Math.round(strengthOf(0) / 3)));
      S.pendingTribute = { ai: i, amount, turn: S.turn };
      rel.lastTradeTurn = S.turn;
      addLog(`${S.players[i].name} требуют дань ${amount}🪙 в ход (10 ходов)`);
      break;
    }
  }
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
  for (let i = 0; i < S.players.length; i++) {
    if (!playerAlive(i)) continue;
    if (Object.keys(SS_PARTS).every((id) => (S.space[i] || []).includes(id))) {
      S.over = { winner: i, type: "space" };
      addLog(`${S.players[i].name} строят космический корабль и одерживают научную победу`);
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
    if (!Array.isArray(S.impr)) S.impr = new Array(W * H).fill(null);
    if (!Array.isArray(S.tileOwner)) S.tileOwner = new Array(W * H).fill(-1);
    if (!Array.isArray(S.players) || S.players.length === 0) return false;
    if (!S.relations || typeof S.relations !== "object") {
      S.relations = {};
      for (let i = 0; i < S.players.length; i++)
        for (let j = i + 1; j < S.players.length; j++)
          S.relations[relKey(i, j)] = { war: false, since: -1, lastTradeTurn: -99 };
    }
    for (const k of Object.keys(S.relations))
      if (typeof S.relations[k].lastTradeTurn !== "number") S.relations[k].lastTradeTurn = -99;
    for (const c of S.cities) if (typeof c.culture !== "number") c.culture = 0;
    if (!Array.isArray(S.religions)) S.religions = [];
    if (!Array.isArray(S.wonders)) S.wonders = [];
    if (!S.space) S.space = {};
    if (!Array.isArray(S.resDeals)) S.resDeals = [];
    if (!S.tributes || typeof S.tributes !== "object") S.tributes = {};
    if (!S.pendingTribute) S.pendingTribute = null;
    for (const tk of Object.keys(S.tributes)) {
      const [a, b] = tk.split(":").map(Number);
      if (Number.isInteger(a) && Number.isInteger(b) && !atWar(a, b) && playerAlive(a) && playerAlive(b)) continue;
      delete S.tributes[tk];
    }
    S.resDeals = S.resDeals.filter((d) => d && Number.isInteger(d.from) && Number.isInteger(d.to) &&
      !atWar(d.from, d.to) && playerAlive(d.from) && playerAlive(d.to) && d.left > 0 && !!RESOURCES[d.res]);
    if (S.pendingTribute && (!S.players[S.pendingTribute.ai] ||
      atWar(0, S.pendingTribute.ai) || !playerAlive(S.pendingTribute.ai))) S.pendingTribute = null;
    if (S.over && !S.over.type) S.over.type = "conquest";
    for (const c of S.cities) {
      if (!c.religion) c.religion = null;
      if (typeof c.relPressure !== "number") c.relPressure = 0;
      if (typeof c.unhappy !== "number") c.unhappy = 0;
      if (typeof c.happy !== "number") c.happy = 1;
      if (!c.riot) c.riot = 0;
      if (typeof c.revoltPressure !== "number") c.revoltPressure = 0;
      if (typeof c.flipCooldown !== "number") c.flipCooldown = 0;
      if (typeof c.revoltBy !== "number") c.revoltBy = null;
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
      if (!("stateReligion" in p)) p.stateReligion = null;
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
  TILE, TERRAIN, UNITS, BUILDINGS, WONDERS, SS_PARTS, TECHS, DIFFICULTIES, NATIONS, RELIGIONS, RESOURCES, W, H, TS, SAVE_KEY,
  CULTURE_WIN_CITIES, CULTURE_WIN_THRESHOLD, GREAT_PEOPLE, GP_ORDER,
  key, inMap, unitsAt, cityAt, cityById, unitById, isCoastal,
  newGame, spawn, upgradeCost, upgradeUnit, computeVision, reachable, moveUnit, attack, foundCity, drownCheck, nextInStack,
  cityYields, cityHappiness, techAvailable, processEconomy, playerGoldPerTurn, buyForGold, endTurn, save, load, legendaryCities,
  foundReligion, checkFoundReligions, spreadReligions, isHolyCity, playerEffects, grantFreeTech, useGreatPerson,
  spreadFaith, declareStateReligion, relWarFactor,
  relKey, atWar, declareWar, makePeace, offerPeace, strengthOf, aiDiplomacy, offerTechTrade, valueOfDeal, grantTech,
  offerDeal, dealValue, demandTribute, processDeals,
  unitAvailable, resourceConnected, resourceOwned, hasMarble, wonderCost, startImprovement, cancelWork,
};

export function debugApi() {
  return {
    get S() { return S; },
    get TECHS() { return TECHS; },
    get UNITS() { return UNITS; },
    get BUILDINGS() { return BUILDINGS; },
    get WONDERS() { return WONDERS; },
    get SS_PARTS() { return SS_PARTS; },
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
    offerTechTrade,
    valueOfDeal,
    offerDeal,
    dealValue,
    demandTribute,
    processDeals,
    grantTech,
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
    processRevolts,
    flipCity,
    playerGoldPerTurn,
    buyForGold,
    foundReligion,
    checkFoundReligions,
    spreadReligions,
    isHolyCity,
    techAvailable,
    grantFreeTech,
    useGreatPerson,
    spreadFaith,
    declareStateReligion,
    relWarFactor,
    cityYields,
    cityHappiness,
    buildingEffects,
    playerEffects,
    reachable,
    canEnter,
    isNaval,
    tradeActive,
    landTradeActive,
    roadDoneAt,
    recomputeBorders,
    cityRadius,
    unitAvailable,
    resourceConnected,
    resourceOwned,
    hasMarble,
    wonderCost,
    startImprovement,
    cancelWork,
    getTileOwner: () => Array.from(S.tileOwner),
  };
}
