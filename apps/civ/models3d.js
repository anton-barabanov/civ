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
  gold: "#d4af37",
  sand: "#c9b283",
  bronze: "#5d8a6e",
  coal: "#2b2b31",
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

function tmat(color) {
  const key = "t:" + color;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true, transparent: true, opacity: 0.55 });
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

function addSage(group, ownerMat) {
  addFigure(group, ownerMat, 0.08, 0.34, 0, 0);
  add(group, geo("u:gpRobe", () => new THREE.ConeGeometry(0.115, 0.32, 7)), ownerMat, 0, 0.16, 0);
  add(group, geo("u:gpHalo", () => new THREE.TorusGeometry(0.075, 0.012, 6, 12)), mat(C.gold), 0, 0.5, 0).rotation.x = Math.PI / 2;
}

function addHorse(group) {
  const coat = mat(C.wood);
  add(group, geo("u:horseBody", () => new THREE.BoxGeometry(0.34, 0.13, 0.14)), coat, 0, 0.27, 0);
  add(group, geo("u:horseNeck", () => new THREE.BoxGeometry(0.08, 0.22, 0.09)), coat, 0.14, 0.4, 0).rotation.z = -0.55;
  add(group, geo("u:horseHead", () => new THREE.BoxGeometry(0.13, 0.07, 0.08)), mat(C.woodDark), 0.22, 0.5, 0);
  add(group, geo("u:horseTail", () => new THREE.BoxGeometry(0.05, 0.12, 0.03)), mat(C.woodDark), -0.19, 0.32, 0).rotation.z = 0.5;
  const legGeo = geo("u:horseLeg", () => new THREE.CylinderGeometry(0.018, 0.018, 0.21, 5));
  add(group, legGeo, coat, 0.12, 0.105, 0.05);
  add(group, legGeo, coat, 0.12, 0.105, -0.05);
  add(group, legGeo, coat, -0.12, 0.105, 0.05);
  add(group, legGeo, coat, -0.12, 0.105, -0.05);
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
  } else if (unitType === "crossbowman") {
    addFigure(group, om, 0.09, 0.37, 0, 0);
    add(group, geo("u:xbowStock", () => new THREE.BoxGeometry(0.48, 0.032, 0.036)), wood, 0.04, 0.42, 0.05).rotation.z = 0.28;
    add(group, geo("u:xbowArc", () => new THREE.TorusGeometry(0.13, 0.015, 6, 12, Math.PI)), woodDark, -0.14, 0.42, 0.05);
    add(group, geo("u:xbowTrigger", () => new THREE.BoxGeometry(0.028, 0.055, 0.02)), metal, 0.1, 0.36, 0.05);
  } else if (unitType === "swordsman") {
    addFigure(group, om, 0.13, 0.4, 0, 0);
    add(group, geo("u:helm", () => new THREE.SphereGeometry(0.105, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2)), metal, 0, 0.46, 0);
    add(group, geo("u:blade2", () => new THREE.BoxGeometry(0.05, 0.44, 0.024)), metal, 0.2, 0.52, 0.05).rotation.z = 0.18;
    add(group, geo("u:guard2", () => new THREE.BoxGeometry(0.13, 0.03, 0.04)), woodDark, 0.135, 0.34, 0.05).rotation.z = 0.18;
  } else if (unitType === "spearman") {
    addFigure(group, om, 0.1, 0.36, 0, 0);
    add(group, geo("u:spear", () => new THREE.CylinderGeometry(0.011, 0.011, 0.78, 5)), woodDark, 0.17, 0.38, 0.06).rotation.z = -0.1;
    add(group, geo("u:spearTip", () => new THREE.ConeGeometry(0.028, 0.13, 5)), metal, 0.21, 0.77, 0.06).rotation.z = -0.1;
    add(group, geo("u:shield", () => new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10)), wood, -0.15, 0.26, 0.04).rotation.z = Math.PI / 2;
    add(group, geo("u:boss", () => new THREE.SphereGeometry(0.03, 6, 5)), metal, -0.175, 0.26, 0.04);
  } else if (unitType === "horseman") {
    addHorse(group);
    const rider = new THREE.Group();
    rider.position.set(-0.02, 0.28, 0);
    group.add(rider);
    addFigure(rider, om, 0.07, 0.24, 0, 0);
  } else if (unitType === "knight") {
    addHorse(group);
    const rider = new THREE.Group();
    rider.position.set(-0.02, 0.28, 0);
    group.add(rider);
    addFigure(rider, om, 0.08, 0.26, 0, 0);
    add(rider, geo("u:helmK", () => new THREE.SphereGeometry(0.085, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2)), metal, 0, 0.32, 0);
    add(rider, geo("u:lance", () => new THREE.CylinderGeometry(0.011, 0.011, 0.62, 5)), woodDark, 0.22, 0.22, 0.04).rotation.z = -1.2;
    add(rider, geo("u:lanceTip", () => new THREE.ConeGeometry(0.024, 0.1, 5)), metal, 0.51, 0.34, 0.04).rotation.z = -1.2;
    add(rider, geo("u:shieldK", () => new THREE.CylinderGeometry(0.085, 0.085, 0.025, 10)), om, -0.09, 0.14, 0.08).rotation.z = Math.PI / 2;
  } else if (unitType === "catapult") {
    add(group, geo("u:catBase", () => new THREE.BoxGeometry(0.42, 0.06, 0.26)), wood, 0, 0.11, 0);
    const wheelGeo = geo("u:wheel", () => new THREE.CylinderGeometry(0.08, 0.08, 0.024, 9));
    add(group, wheelGeo, woodDark, 0.15, 0.08, 0.09).rotation.x = Math.PI / 2;
    add(group, wheelGeo, woodDark, 0.15, 0.08, -0.135).rotation.x = Math.PI / 2;
    add(group, wheelGeo, woodDark, -0.15, 0.08, 0.09).rotation.x = Math.PI / 2;
    add(group, wheelGeo, woodDark, -0.15, 0.08, -0.135).rotation.x = Math.PI / 2;
    const postGeo = geo("u:catPost", () => new THREE.BoxGeometry(0.05, 0.18, 0.04));
    add(group, postGeo, woodDark, -0.06, 0.21, 0.06);
    add(group, postGeo, woodDark, -0.06, 0.21, -0.06);
    const pivot = new THREE.Group();
    pivot.position.set(-0.06, 0.28, 0);
    pivot.rotation.z = Math.PI / 4;
    group.add(pivot);
    add(pivot, geo("u:catArm", () => new THREE.BoxGeometry(0.55, 0.04, 0.05)), woodDark, 0.12, 0, 0);
    add(pivot, geo("u:catWeight", () => new THREE.BoxGeometry(0.14, 0.14, 0.14)), mat(C.stoneDark), -0.22, 0, 0);
    add(pivot, geo("u:catCup", () => new THREE.CylinderGeometry(0.055, 0.035, 0.06, 6)), wood, 0.37, 0.03, 0);
  } else if (unitType === "musketman") {
    addFigure(group, om, 0.1, 0.38, 0, 0);
    add(group, geo("u:hatM", () => new THREE.CylinderGeometry(0.095, 0.115, 0.045, 8)), mat(C.stoneDark), 0, 0.44, 0);
    const gun = add(group, geo("u:musket", () => new THREE.BoxGeometry(0.52, 0.028, 0.028)), woodDark, 0, 0.42, 0.06);
    gun.rotation.z = 0.5;
    add(gun, geo("u:musketTip", () => new THREE.BoxGeometry(0.15, 0.022, 0.022)), metal, 0.3, 0, 0);
  } else if (unitType === "worker") {
    addFigure(group, om, 0.09, 0.33, 0, 0);
    add(group, geo("u:hatW", () => new THREE.CylinderGeometry(0.1, 0.12, 0.05, 8)), mat(C.sail), 0, 0.42, 0);
    add(group, geo("u:shovel", () => new THREE.CylinderGeometry(0.012, 0.012, 0.48, 5)), woodDark, 0.17, 0.24, 0.05).rotation.z = -0.25;
    add(group, geo("u:shovelBlade", () => new THREE.BoxGeometry(0.075, 0.05, 0.022)), metal, 0.225, 0.045, 0.05).rotation.z = -0.25;
    add(group, geo("u:sack", () => new THREE.SphereGeometry(0.07, 7, 6)), mat(C.sand), -0.15, 0.055, 0.09).scale.set(1, 0.85, 1);
  } else if (unitType === "missionary") {
    addFigure(group, om, 0.09, 0.35, 0, 0);
    add(group, geo("u:misRobe", () => new THREE.ConeGeometry(0.115, 0.3, 7)), om, 0, 0.15, 0);
    add(group, geo("u:misStaff", () => new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5)), woodDark, 0.16, 0.25, 0.05).rotation.z = -0.12;
    add(group, geo("u:misFlame", () => new THREE.SphereGeometry(0.028, 6, 5)), mat(C.gold), 0.16, 0.52, 0.05);
    add(group, geo("u:misBook", () => new THREE.BoxGeometry(0.12, 0.03, 0.15)), mat(C.sail), 0.145, 0.3, -0.03).rotation.z = 0.4;
    add(group, geo("u:misBookTrim", () => new THREE.BoxGeometry(0.125, 0.012, 0.03)), mat(C.gold), 0.145, 0.3, -0.1).rotation.z = 0.4;
  } else if (unitType === "gp_scientist") {
    addSage(group, om);
    add(group, geo("u:gpScroll", () => new THREE.CylinderGeometry(0.035, 0.035, 0.18, 8)), mat(C.sail), 0, 0.3, 0.13).rotation.x = Math.PI / 2;
    add(group, geo("u:gpScrollEnd", () => new THREE.CylinderGeometry(0.05, 0.05, 0.024, 8)), mat(C.snow), 0, 0.3, 0.22).rotation.x = Math.PI / 2;
    add(group, geo("u:gpScrollEnd", () => new THREE.CylinderGeometry(0.05, 0.05, 0.024, 8)), mat(C.snow), 0, 0.3, 0.04).rotation.x = Math.PI / 2;
  } else if (unitType === "gp_engineer") {
    addSage(group, om);
    add(group, geo("u:gpGear", () => new THREE.TorusGeometry(0.07, 0.02, 6, 10)), metal, 0.16, 0.33, 0.05);
    const toothGeo = geo("u:gpGearTooth", () => new THREE.BoxGeometry(0.03, 0.03, 0.022));
    add(group, toothGeo, metal, 0.16, 0.42, 0.05);
    add(group, toothGeo, metal, 0.16, 0.24, 0.05);
    add(group, toothGeo, metal, 0.07, 0.33, 0.05);
    add(group, toothGeo, metal, 0.25, 0.33, 0.05);
    add(group, geo("u:gpWrench", () => new THREE.BoxGeometry(0.2, 0.024, 0.024)), mat(C.woodDark), 0.05, 0.44, -0.05).rotation.z = 0.35;
  } else if (unitType === "gp_artist") {
    addSage(group, om);
    add(group, geo("u:gpLyre", () => new THREE.TorusGeometry(0.09, 0.014, 6, 12, Math.PI)), woodDark, 0.16, 0.28, 0.05);
    const stringGeo = geo("u:gpLyreString", () => new THREE.BoxGeometry(0.008, 0.16, 0.008));
    add(group, stringGeo, mat(C.gold), 0.11, 0.29, 0.05);
    add(group, stringGeo, mat(C.gold), 0.16, 0.29, 0.05);
    add(group, stringGeo, mat(C.gold), 0.21, 0.29, 0.05);
  } else if (unitType === "gp_prophet") {
    addSage(group, om);
    add(group, geo("u:gpTablet", () => new THREE.BoxGeometry(0.075, 0.11, 0.02)), mat(C.stone), 0.13, 0.29, 0.06).rotation.z = 0.12;
    add(group, geo("u:gpTabletCap", () => new THREE.CylinderGeometry(0.0375, 0.0375, 0.02, 8)), mat(C.stone), 0.136, 0.345, 0.06).rotation.x = Math.PI / 2;
    add(group, geo("u:gpTablet", () => new THREE.BoxGeometry(0.075, 0.11, 0.02)), mat(C.stone), 0.21, 0.28, 0.06).rotation.z = -0.08;
    add(group, geo("u:gpTabletCap", () => new THREE.CylinderGeometry(0.0375, 0.0375, 0.02, 8)), mat(C.stone), 0.206, 0.335, 0.06).rotation.x = Math.PI / 2;
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

export function createReligionMesh(religionId) {
  const group = new THREE.Group();
  const gold = mat("#d4af37");
  if (religionId === "oracle") {
    add(group, geo("r:obelisk", () => new THREE.CylinderGeometry(0.045, 0.085, 0.4, 4)), gold, 0, 0.2, 0).rotation.y = Math.PI / 4;
    add(group, geo("r:obeliskTip", () => new THREE.ConeGeometry(0.045, 0.14, 4)), gold, 0, 0.47, 0).rotation.y = Math.PI / 4;
  } else if (religionId === "muses") {
    add(group, geo("r:colBase", () => new THREE.CylinderGeometry(0.075, 0.085, 0.05, 8)), gold, 0, 0.025, 0);
    add(group, geo("r:column", () => new THREE.CylinderGeometry(0.05, 0.055, 0.38, 8)), gold, 0, 0.24, 0);
    add(group, geo("r:scroll", () => new THREE.BoxGeometry(0.2, 0.08, 0.08)), gold, 0, 0.47, 0).rotation.y = 0.5;
  } else {
    add(group, geo("r:stele", () => new THREE.BoxGeometry(0.1, 0.42, 0.14)), gold, 0, 0.21, 0);
    add(group, geo("r:disc", () => new THREE.CylinderGeometry(0.13, 0.13, 0.028, 12)), gold, 0, 0.48, 0).rotation.x = Math.PI / 2;
  }
  return group;
}

export function createWonderMesh(id) {
  const group = new THREE.Group();
  const stoneM = mat(C.stone);
  const stoneDarkM = mat(C.stoneDark);
  const limeM = mat(C.wallLight);
  const goldM = mat(C.gold);
  if (id === "pyramids") {
    const sandM = mat(C.sand);
    add(group, geo("w:pyr1", () => new THREE.BoxGeometry(0.38, 0.12, 0.38)), sandM, -0.04, 0.06, -0.04);
    add(group, geo("w:pyr2", () => new THREE.BoxGeometry(0.3, 0.11, 0.3)), sandM, -0.04, 0.175, -0.04);
    add(group, geo("w:pyr3", () => new THREE.BoxGeometry(0.22, 0.1, 0.22)), sandM, -0.04, 0.28, -0.04);
    add(group, geo("w:pyr4", () => new THREE.BoxGeometry(0.14, 0.09, 0.14)), sandM, -0.04, 0.375, -0.04);
    add(group, geo("w:pyrCap", () => new THREE.ConeGeometry(0.055, 0.1, 4)), goldM, -0.04, 0.47, -0.04).rotation.y = Math.PI / 4;
    add(group, geo("w:pyrSmall", () => new THREE.ConeGeometry(0.09, 0.17, 4)), sandM, 0.16, 0.085, 0.14).rotation.y = Math.PI / 4;
  } else if (id === "greatlibrary") {
    add(group, geo("w:libPodium", () => new THREE.BoxGeometry(0.4, 0.05, 0.28)), stoneM, 0, 0.025, 0);
    const colGeo = geo("w:libCol", () => new THREE.CylinderGeometry(0.018, 0.022, 0.3, 6));
    for (const x of [-0.13, 0, 0.13]) {
      add(group, colGeo, limeM, x, 0.2, -0.08);
      add(group, colGeo, limeM, x, 0.2, 0.08);
    }
    add(group, geo("w:libArch", () => new THREE.BoxGeometry(0.38, 0.05, 0.24)), stoneM, 0, 0.375, 0);
    const ped = add(group, geo("w:pediment", () => new THREE.CylinderGeometry(0.2, 0.2, 0.2, 3)), goldM, 0, 0.5, 0);
    ped.rotation.x = -Math.PI / 2;
    add(group, geo("w:libScroll", () => new THREE.CylinderGeometry(0.035, 0.035, 0.14, 6)), goldM, 0, 0.04, 0.19).rotation.x = Math.PI / 2;
    group.rotation.y = Math.PI / 4;
  } else if (id === "colossus") {
    const bronzeM = mat(C.bronze);
    add(group, geo("w:colPed1", () => new THREE.BoxGeometry(0.28, 0.04, 0.28)), stoneM, 0, 0.02, 0);
    add(group, geo("w:colPed2", () => new THREE.BoxGeometry(0.22, 0.1, 0.22)), stoneDarkM, 0, 0.09, 0);
    const fig = new THREE.Group();
    fig.position.set(0, 0.14, 0);
    group.add(fig);
    add(fig, geo("fig:0.075:0.34", () => new THREE.CylinderGeometry(0.054, 0.075, 0.34, 7)), bronzeM, 0, 0.17, 0);
    add(fig, geo("fig:head", () => new THREE.SphereGeometry(0.085, 8, 6)), bronzeM, 0, 0.4, 0);
    add(group, geo("w:colArm", () => new THREE.CylinderGeometry(0.018, 0.018, 0.22, 5)), bronzeM, 0.14, 0.47, 0).rotation.z = -0.7;
    add(group, geo("w:colFlame", () => new THREE.ConeGeometry(0.055, 0.13, 6)), goldM, 0.23, 0.62, 0);
  } else if (id === "greatwall") {
    add(group, geo("w:wallSeg", () => new THREE.BoxGeometry(0.42, 0.14, 0.05)), stoneDarkM, 0, 0.09, 0);
    const crenGeo = geo("w:wallCren", () => new THREE.BoxGeometry(0.05, 0.05, 0.05));
    for (const x of [-0.15, -0.05, 0.05, 0.15]) add(group, crenGeo, stoneM, x, 0.185, 0);
    const towerGeo = geo("w:wallTower", () => new THREE.BoxGeometry(0.11, 0.26, 0.11));
    add(group, towerGeo, stoneM, -0.2, 0.13, 0);
    add(group, towerGeo, stoneM, 0.2, 0.13, 0);
    const capGeo = geo("w:wallCap", () => new THREE.ConeGeometry(0.085, 0.08, 4));
    add(group, capGeo, stoneDarkM, -0.2, 0.3, 0).rotation.y = Math.PI / 4;
    add(group, capGeo, stoneDarkM, 0.2, 0.3, 0).rotation.y = Math.PI / 4;
    group.rotation.y = Math.PI / 4;
  } else if (id === "oraclew") {
    add(group, geo("w:orcStep1", () => new THREE.BoxGeometry(0.36, 0.05, 0.26)), stoneM, 0, 0.025, 0);
    add(group, geo("w:orcStep2", () => new THREE.BoxGeometry(0.3, 0.05, 0.22)), stoneDarkM, 0, 0.075, 0);
    const colGeo = geo("w:orcCol", () => new THREE.CylinderGeometry(0.02, 0.024, 0.26, 6));
    for (const x of [-0.1, 0.1]) {
      add(group, colGeo, limeM, x, 0.23, -0.06);
      add(group, colGeo, limeM, x, 0.23, 0.06);
    }
    add(group, geo("w:orcArch", () => new THREE.BoxGeometry(0.34, 0.045, 0.24)), stoneM, 0, 0.383, 0);
    const ped = add(group, geo("w:pediment", () => new THREE.CylinderGeometry(0.2, 0.2, 0.2, 3)), goldM, 0, 0.51, 0);
    ped.rotation.x = -Math.PI / 2;
    add(group, geo("w:orcOrb", () => new THREE.SphereGeometry(0.028, 6, 5)), goldM, 0, 0.72, 0);
    group.rotation.y = Math.PI / 4;
  }
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

export function createLandResourceMesh(kind) {
  const group = new THREE.Group();
  if (kind === "iron") {
    const rockM = mat(C.rock);
    add(group, geo("l:iron1", () => new THREE.BoxGeometry(0.17, 0.13, 0.15)), rockM, -0.07, 0.065, 0.03);
    add(group, geo("l:iron2", () => new THREE.BoxGeometry(0.11, 0.09, 0.11)), rockM, 0.09, 0.045, -0.06);
    add(group, geo("l:iron3", () => new THREE.BoxGeometry(0.08, 0.06, 0.07)), rockM, 0.02, 0.03, 0.12);
    add(group, geo("l:ironV1", () => new THREE.BoxGeometry(0.055, 0.05, 0.045)), mat(C.metal), -0.05, 0.14, 0.03);
    add(group, geo("l:ironV2", () => new THREE.BoxGeometry(0.04, 0.04, 0.04)), mat(C.metal), 0.09, 0.1, -0.04);
  } else if (kind === "horses") {
    const horse = new THREE.Group();
    addHorse(horse);
    horse.scale.setScalar(0.6);
    horse.rotation.y = 0.6;
    group.add(horse);
  } else {
    add(group, geo("l:marBase", () => new THREE.CylinderGeometry(0.08, 0.095, 0.04, 8)), mat(C.stone), 0, 0.02, 0);
    add(group, geo("l:marCol", () => new THREE.CylinderGeometry(0.045, 0.052, 0.27, 8)), mat(C.snow), 0, 0.175, 0);
    add(group, geo("l:marCap", () => new THREE.CylinderGeometry(0.068, 0.068, 0.035, 8)), mat(C.stone), 0, 0.325, 0);
  }
  return group;
}

export function createImprovementMesh(kind, done = true) {
  const group = new THREE.Group();
  if (kind === "farm") {
    const furrowGeo = geo("i:furrow", () => new THREE.BoxGeometry(0.66, 0.035, 0.085));
    const a = done ? mat(C.woodDark) : tmat(C.woodDark);
    const b = done ? mat(C.trunk) : tmat(C.trunk);
    const n = done ? 4 : 2;
    for (let i = 0; i < n; i++) add(group, furrowGeo, i % 2 ? a : b, 0, 0.02, -0.22 + i * 0.145);
    if (done) add(group, geo("i:haystack", () => new THREE.ConeGeometry(0.075, 0.11, 6)), mat(C.sand), 0.25, 0.055, 0.25);
  } else if (kind === "road") {
    add(group, geo("i:road", () => new THREE.BoxGeometry(0.7, 0.02, 0.16)), done ? mat(C.coal) : tmat(C.coal), 0, 0.01, 0);
    const tieGeo = geo("i:roadTie", () => new THREE.BoxGeometry(0.06, 0.022, 0.2));
    const tieMat = done ? mat(C.woodDark) : tmat(C.woodDark);
    add(group, tieGeo, tieMat, -0.18, 0.011, 0);
    add(group, tieGeo, tieMat, 0.18, 0.011, 0);
  } else {
    add(group, geo("i:mound", () => new THREE.BoxGeometry(0.34, 0.13, 0.3)), done ? mat(C.stoneDark) : tmat(C.stoneDark), 0, 0.065, 0);
    if (done) {
      add(group, geo("i:entry", () => new THREE.BoxGeometry(0.13, 0.11, 0.05)), mat(C.coal), 0, 0.07, 0.15);
      const postGeo = geo("i:post", () => new THREE.BoxGeometry(0.03, 0.16, 0.03));
      add(group, postGeo, mat(C.woodDark), -0.09, 0.08, 0.16);
      add(group, postGeo, mat(C.woodDark), 0.09, 0.08, 0.16);
      add(group, geo("i:lintel", () => new THREE.BoxGeometry(0.23, 0.035, 0.04)), mat(C.woodDark), 0, 0.17, 0.16);
    }
  }
  return group;
}

export function disposeModels3D() {
  for (const g of geoCache.values()) g.dispose();
  for (const m of matCache.values()) m.dispose();
  geoCache.clear();
  matCache.clear();
}
