import * as THREE from "./vendor/three.module.js";

const geoCache = new Map();
const matCache = new Map();

const C = {
  ocean: "#1b3a5c",
  oceanTop: "#2a5078",
  grass: "#3e7a3a",
  plains: "#8a7f47",
  forest: "#24522a",
  hills: "#6e5a35",
  mountain: "#5a5a5f",
  foliage: "#2f6b33",
  foliageDark: "#265728",
  trunk: "#6b4a2c",
  dome: "#7d6840",
  rock: "#6d6d73",
  snow: "#f4f6f8",
  wood: "#8a7f47",
  woodDark: "#7a5c3a",
  metal: "#9aa0a6",
  skin: "#e6c1a0",
  sail: "#e8e4d8",
  stone: "#8f8a80",
  stoneDark: "#7c776d",
  wallLight: "#d8cbb0",
  roof: "#95502e",
  fish: "#7fa8c9",
  whale: "#33566e",
};

function geo(key, make) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

function mat(color, side) {
  const key = color + ":" + (side || 0);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    if (side) m.side = side;
    matCache.set(key, m);
  }
  return m;
}

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function add(parent, geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function addFigure(group, ownerMat, bodyR, bodyH, x, z) {
  const bodyGeo = geo(`fig:${bodyR}:${bodyH}`, () => new THREE.CylinderGeometry(bodyR * 0.72, bodyR, bodyH, 7));
  add(group, bodyGeo, ownerMat, x, bodyH / 2, z);
  const headGeo = geo("fig:head", () => new THREE.SphereGeometry(0.085, 8, 6));
  add(group, headGeo, mat(C.skin), x, bodyH + 0.06, z);
}

function makeWaveGeometry() {
  const p = new THREE.PlaneGeometry(1, 1, 4, 4);
  const pos = p.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setZ(i, 0.02 * Math.sin(x * 9.4 + 1.3) * Math.cos(y * 8.6 + 0.6));
  }
  p.rotateX(-Math.PI / 2);
  return p;
}

export function createTerrainMesh(tileType, seed = 42) {
  const group = new THREE.Group();
  const r = rng((seed >>> 0) * 2654435761 + 11);
  if (tileType === 0) {
    const body = geo("t:water", () => new THREE.BoxGeometry(1, 0.1, 1));
    add(group, body, mat(C.ocean), 0, -0.09, 0);
    const wave = geo("t:wave", makeWaveGeometry);
    add(group, wave, mat(C.oceanTop), 0, -0.035, 0);
    return group;
  }
  const slabColor = tileType === 1 ? C.grass : tileType === 2 ? C.plains : tileType === 3 ? C.forest : tileType === 4 ? C.hills : C.mountain;
  add(group, geo("t:slab", () => new THREE.BoxGeometry(1, 0.12, 1)), mat(slabColor), 0, -0.06, 0);
  if (tileType === 3) {
    const n = 4 + (r() < 0.5 ? 1 : 0);
    const foliageGeo = geo("t:tree", () => new THREE.ConeGeometry(0.14, 0.36, 5));
    const trunkGeo = geo("t:trunk", () => new THREE.CylinderGeometry(0.022, 0.032, 0.12, 5));
    const foliageMat = mat(C.foliage);
    const darkMat = mat(C.foliageDark);
    const trunkMat = mat(C.trunk);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.7;
      const d = 0.13 + r() * 0.24;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      add(group, trunkGeo, trunkMat, x, 0.06, z);
      const crown = add(group, foliageGeo, r() < 0.5 ? foliageMat : darkMat, x, 0.27, z);
      crown.scale.setScalar(0.8 + r() * 0.4);
      crown.rotation.y = r() * Math.PI;
    }
  } else if (tileType === 4) {
    const domeGeo = geo("t:dome", () => new THREE.SphereGeometry(0.3, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2));
    const domeMat = mat(C.dome);
    const d1 = add(group, domeGeo, domeMat, 0.1 + (r() - 0.5) * 0.08, 0, -0.07 + (r() - 0.5) * 0.08);
    d1.scale.set(1, 0.45, 1);
    const d2 = add(group, domeGeo, domeMat, -0.17 + (r() - 0.5) * 0.08, 0, 0.13 + (r() - 0.5) * 0.08);
    d2.scale.set(0.75, 0.34, 0.75);
    const d3 = add(group, domeGeo, domeMat, 0.2, 0, 0.19);
    d3.scale.set(0.45, 0.22, 0.45);
  } else if (tileType === 5) {
    const peaks = new THREE.Group();
    const rockMat = mat(C.rock);
    const main = add(peaks, geo("t:peak", () => new THREE.ConeGeometry(0.42, 0.75, 5)), rockMat, 0.04, 0.375, -0.02);
    main.rotation.y = r() * Math.PI;
    add(peaks, geo("t:snow", () => new THREE.ConeGeometry(0.17, 0.26, 5)), mat(C.snow), 0.04, 0.62, -0.02).rotation.y = main.rotation.y;
    add(peaks, geo("t:peak2", () => new THREE.ConeGeometry(0.22, 0.4, 5)), rockMat, -0.22, 0.2, 0.16).rotation.y = r() * Math.PI;
    peaks.rotation.z = (r() - 0.5) * 0.12;
    peaks.rotation.y = r() * Math.PI;
    group.add(peaks);
  }
  return group;
}

export function createUnitMesh(unitType, ownerColor = "#b8b8b8") {
  const group = new THREE.Group();
  const om = mat(ownerColor);
  const wood = mat(C.wood);
  const woodDark = mat(C.woodDark);
  const metal = mat(C.metal);
  const naval = unitType === "galley" || unitType === "caravel";
  const baseGeo = naval ? geo("u:baseShip", () => new THREE.CylinderGeometry(0.25, 0.27, 0.02, 14)) : geo("u:base", () => new THREE.CylinderGeometry(0.16, 0.18, 0.025, 14));
  add(group, baseGeo, om, 0, naval ? 0.01 : 0.0125, 0);
  if (unitType === "settler") {
    addFigure(group, om, 0.085, 0.32, 0.14, 0.12);
    add(group, geo("u:staff", () => new THREE.CylinderGeometry(0.012, 0.012, 0.52, 5)), woodDark, 0.26, 0.26, 0.12).rotation.z = -0.1;
    add(group, geo("u:bundle", () => new THREE.SphereGeometry(0.05, 6, 5)), mat(C.sail), 0.235, 0.5, 0.12);
    add(group, geo("u:cart", () => new THREE.BoxGeometry(0.34, 0.13, 0.22)), wood, -0.13, 0.145, -0.05);
    const wheelGeo = geo("u:wheel", () => new THREE.CylinderGeometry(0.08, 0.08, 0.024, 9));
    add(group, wheelGeo, woodDark, -0.13, 0.08, 0.065).rotation.x = Math.PI / 2;
    add(group, wheelGeo, woodDark, -0.13, 0.08, -0.165).rotation.x = Math.PI / 2;
    add(group, geo("u:shaft", () => new THREE.BoxGeometry(0.2, 0.028, 0.028)), woodDark, 0.08, 0.1, -0.05);
  } else if (unitType === "scout") {
    addFigure(group, om, 0.075, 0.34, 0, 0);
    add(group, geo("u:hat", () => new THREE.ConeGeometry(0.15, 0.09, 9)), mat(C.wood), 0, 0.51, 0);
  } else if (unitType === "warrior") {
    addFigure(group, om, 0.1, 0.38, 0, 0);
    add(group, geo("u:blade", () => new THREE.BoxGeometry(0.04, 0.32, 0.02)), metal, 0.16, 0.5, 0.05).rotation.z = 0.22;
    add(group, geo("u:guard", () => new THREE.BoxGeometry(0.1, 0.025, 0.035)), woodDark, 0.105, 0.35, 0.05).rotation.z = 0.22;
    add(group, geo("u:shield", () => new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10)), wood, -0.15, 0.26, 0.04).rotation.z = Math.PI / 2;
    add(group, geo("u:boss", () => new THREE.SphereGeometry(0.03, 6, 5)), metal, -0.175, 0.26, 0.04);
  } else if (unitType === "archer") {
    addFigure(group, om, 0.085, 0.36, 0, 0);
    add(group, geo("u:bow", () => new THREE.TorusGeometry(0.16, 0.016, 6, 12, Math.PI)), woodDark, 0.12, 0.36, 0).rotation.y = Math.PI / 2;
    add(group, geo("u:quiver", () => new THREE.BoxGeometry(0.05, 0.17, 0.05)), wood, -0.1, 0.3, -0.07).rotation.z = 0.35;
  } else if (unitType === "swordsman") {
    addFigure(group, om, 0.13, 0.4, 0, 0);
    add(group, geo("u:helm", () => new THREE.SphereGeometry(0.105, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2)), metal, 0, 0.46, 0);
    add(group, geo("u:blade2", () => new THREE.BoxGeometry(0.05, 0.44, 0.024)), metal, 0.2, 0.52, 0.05).rotation.z = 0.18;
    add(group, geo("u:guard2", () => new THREE.BoxGeometry(0.13, 0.03, 0.04)), woodDark, 0.135, 0.34, 0.05).rotation.z = 0.18;
  } else if (unitType === "galley") {
    add(group, geo("u:hullG", () => new THREE.BoxGeometry(0.56, 0.1, 0.2)), wood, 0, 0.08, 0);
    add(group, geo("u:bowG", () => new THREE.ConeGeometry(0.09, 0.16, 4)), wood, 0.35, 0.08, 0).rotation.z = -Math.PI / 2;
    add(group, geo("u:sternG", () => new THREE.BoxGeometry(0.1, 0.07, 0.18)), woodDark, -0.29, 0.15, 0);
    add(group, geo("u:mast", () => new THREE.CylinderGeometry(0.014, 0.014, 0.5, 5)), woodDark, -0.02, 0.33, 0);
    add(group, geo("u:sailG", () => new THREE.PlaneGeometry(0.3, 0.27)), mat(C.sail, THREE.DoubleSide), -0.02, 0.36, 0).rotation.y = Math.PI / 2;
    add(group, geo("u:flagG", () => new THREE.BoxGeometry(0.08, 0.05, 0.012)), om, 0.03, 0.56, 0);
  } else if (unitType === "caravel") {
    add(group, geo("u:hullC", () => new THREE.BoxGeometry(0.68, 0.12, 0.22)), wood, 0, 0.09, 0);
    add(group, geo("u:bowC", () => new THREE.ConeGeometry(0.1, 0.2, 4)), wood, 0.42, 0.09, 0).rotation.z = -Math.PI / 2;
    add(group, geo("u:cabinC", () => new THREE.BoxGeometry(0.16, 0.12, 0.19)), woodDark, -0.25, 0.21, 0);
    add(group, geo("u:mastC1", () => new THREE.CylinderGeometry(0.015, 0.015, 0.56, 5)), woodDark, 0.08, 0.42, 0);
    add(group, geo("u:mastC2", () => new THREE.CylinderGeometry(0.013, 0.013, 0.42, 5)), woodDark, -0.07, 0.36, 0);
    add(group, geo("u:sailC1", () => new THREE.PlaneGeometry(0.32, 0.3)), mat(C.sail, THREE.DoubleSide), 0.08, 0.42, 0).rotation.y = Math.PI / 2;
    add(group, geo("u:sailC2", () => new THREE.PlaneGeometry(0.24, 0.26)), mat(C.sail, THREE.DoubleSide), -0.07, 0.35, 0).rotation.y = Math.PI / 2;
    add(group, geo("u:flagC", () => new THREE.BoxGeometry(0.09, 0.055, 0.012)), om, 0.125, 0.66, 0);
  } else {
    addFigure(group, om, 0.09, 0.35, 0, 0);
  }
  return group;
}

export function createCityMesh(pop, ownerColor, hasWalls = false, seed = 42) {
  const group = new THREE.Group();
  const r = rng((seed >>> 0) * 40503 + 17);
  const p = Math.max(1, Math.min(10, Math.floor(pop) || 1));
  add(group, geo("c:base", () => new THREE.CylinderGeometry(0.42, 0.46, 0.06, 12)), mat(C.stone), 0, 0.03, 0);
  const n = 3 + Math.floor((p - 1) / 3);
  const wallsMat = mat(C.wallLight);
  const roofMat = mat(C.roof);
  for (let i = 0; i < n; i++) {
    const main = i === 0;
    const a = (i / n) * Math.PI * 2 + 0.7 + r() * 0.5;
    const rad = main ? 0 : 0.14 + r() * 0.15;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad;
    const bw = main ? 0.16 : 0.11 + r() * 0.05;
    const bh = (main ? 0.2 : 0.13) + p * 0.012 + r() * 0.05;
    const body = add(group, geo(`c:b:${bw.toFixed(2)}:${bh.toFixed(2)}`, () => new THREE.BoxGeometry(bw, bh, bw)), wallsMat, bx, 0.06 + bh / 2, bz);
    body.rotation.y = r() * Math.PI;
    add(group, geo(`c:r:${bw.toFixed(2)}`, () => new THREE.ConeGeometry(bw * 0.78, 0.07, 4)), roofMat, bx, 0.06 + bh + 0.035, bz).rotation.y = body.rotation.y + Math.PI / 4;
  }
  add(group, geo("c:pole", () => new THREE.CylinderGeometry(0.012, 0.012, 0.52, 5)), mat(C.woodDark), 0.03, 0.32, -0.03);
  add(group, geo("c:flag", () => new THREE.BoxGeometry(0.13, 0.085, 0.012)), mat(ownerColor), 0.1, 0.53, -0.03);
  if (hasWalls) {
    const wr = 0.33;
    const wallGeo = geo("c:wall", () => new THREE.BoxGeometry(0.245, 0.09, 0.045));
    const towerGeo = geo("c:tower", () => new THREE.CylinderGeometry(0.045, 0.052, 0.16, 6));
    const stoneDark = mat(C.stoneDark);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      add(group, wallGeo, stoneDark, Math.cos(a) * wr, 0.105, Math.sin(a) * wr).rotation.y = Math.PI / 2 - a;
    }
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      add(group, towerGeo, stoneDark, Math.cos(a) * wr, 0.14, Math.sin(a) * wr);
    }
  }
  group.scale.setScalar(1 + (p - 1) * 0.02);
  return group;
}

export function createWaterResourceMesh(kind) {
  const group = new THREE.Group();
  if (kind === "whale") {
    add(group, geo("w:whale", () => new THREE.SphereGeometry(0.14, 9, 7)), mat(C.whale), 0, -0.045, 0).scale.set(1.7, 0.8, 0.85);
    add(group, geo("w:fin", () => new THREE.ConeGeometry(0.05, 0.13, 4)), mat(C.whale), 0.02, 0.06, 0).rotation.z = -0.25;
    const tail = add(group, geo("w:tail", () => new THREE.ConeGeometry(0.08, 0.12, 4)), mat(C.whale), -0.26, -0.04, 0);
    tail.rotation.z = Math.PI / 2;
    tail.scale.set(0.45, 1, 1);
  } else {
    const body = add(group, geo("w:fish", () => new THREE.ConeGeometry(0.085, 0.2, 5)), mat(C.fish), 0.01, -0.005, 0);
    body.rotation.z = -Math.PI / 2;
    body.scale.set(1, 0.8, 0.5);
    const tail = add(group, geo("w:tailF", () => new THREE.ConeGeometry(0.06, 0.1, 4)), mat(C.fish), -0.11, -0.005, 0);
    tail.rotation.z = Math.PI / 2;
    tail.scale.set(1, 0.9, 0.45);
  }
  return group;
}

export function disposeModels3D() {
  for (const g of geoCache.values()) g.dispose();
  for (const m of matCache.values()) m.dispose();
  geoCache.clear();
  matCache.clear();
}
