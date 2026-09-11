export async function createRenderer3D(container, handlers) {
  const THREE = await import("./vendor/three.module.js");
  const models = await import("./models3d.js");

  const FX_DYING = 0.4;
  const FX_RING = 0.45;
  const FX_CLASH = 0.3;
  const FX_KICK = 0.25;
  const FX_KICK_DIST = 0.06;
  const FX_MAX = 5;
  const effects = [];
  const dying = [];

  let destroyed = false;
  let rafId = 0;
  let mapW = 26;
  let mapH = 18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d12);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "70vh";
  canvas.style.touchAction = "none";
  container.appendChild(canvas);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 40;
  scene.add(sun);

  function fitSunShadow() {
    const c = sun.shadow.camera;
    c.left = -(mapW / 2 + 2);
    c.right = mapW / 2 + 2;
    c.top = mapH / 2 + 2;
    c.bottom = -(mapH / 2 + 2);
    c.updateProjectionMatrix();
  }

  const PHI_MIN = 0.15, PHI_MAX = 1.35, R_MIN = 4, R_MAX = 40;
  const orbit = { theta: 0, phi: 0.15, radius: 26, target: new THREE.Vector3(0, 0, 0) };

  function applyCamera() {
    const { theta, phi, radius, target } = orbit;
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.cos(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.sin(theta)
    );
    camera.lookAt(target);
  }

  function clampTarget() {
    orbit.target.x = Math.max(-mapW / 2 - 2, Math.min(mapW / 2 + 2, orbit.target.x));
    orbit.target.z = Math.max(-mapH / 2 - 2, Math.min(mapH / 2 + 2, orbit.target.z));
    orbit.target.y = 0;
  }

  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();

  function rotate(dx, dy) {
    orbit.theta -= dx * 0.005;
    orbit.phi = Math.max(PHI_MIN, Math.min(PHI_MAX, orbit.phi - dy * 0.005));
    applyCamera();
  }

  function pan(dx, dy) {
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();
    const s = orbit.radius * 0.0016;
    orbit.target.addScaledVector(right, -dx * s);
    orbit.target.addScaledVector(fwd, dy * s);
    clampTarget();
    applyCamera();
  }

  function zoom(deltaY) {
    orbit.radius = Math.max(R_MIN, Math.min(R_MAX, orbit.radius * (1 + deltaY * 0.001)));
    applyCamera();
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pickMeshes = [];

  function pick(e, cb) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickMeshes, false);
    const t = hits.length ? hits[0].object.userData.tile : null;
    if (t) cb(t.x, t.y);
  }

  const pointer = { down: false, id: -1, button: 0, shift: false, sx: 0, sy: 0, moved: 0 };

  const onPointerDown = (e) => {
    if (pointer.down) return;
    pointer.down = true;
    pointer.id = e.pointerId;
    pointer.button = e.button;
    pointer.shift = e.shiftKey;
    pointer.sx = e.clientX;
    pointer.sy = e.clientY;
    pointer.moved = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  };

  const onPointerMove = (e) => {
    if (!pointer.down || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.sx;
    const dy = e.clientY - pointer.sy;
    pointer.sx = e.clientX;
    pointer.sy = e.clientY;
    pointer.moved += Math.abs(dx) + Math.abs(dy);
    if (pointer.shift || pointer.button === 1 || pointer.button === 2) pan(dx, dy);
    else rotate(dx, dy);
  };

  const onPointerUp = (e) => {
    if (!pointer.down || e.pointerId !== pointer.id) return;
    pointer.down = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    if (pointer.moved < 5) {
      if (pointer.button === 0) pick(e, handlers.onTileClick);
      else if (pointer.button === 2) pick(e, handlers.onTileRightClick);
    }
  };

  const onPointerCancel = (e) => {
    if (e.pointerId !== pointer.id) return;
    pointer.down = false;
  };

  const onWheel = (e) => {
    e.preventDefault();
    zoom(e.deltaY);
  };

  const onContext = (e) => e.preventDefault();

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", onContext);

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    fitSunShadow();
  }

  let ro = null;
  const onWinResize = () => resize();
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(resize);
    ro.observe(container);
  } else if (typeof window !== "undefined") {
    window.addEventListener("resize", onWinResize);
  }

  const tileRoot = new THREE.Group();
  const overlayRoot = new THREE.Group();
  const borderRoot = new THREE.Group();
  scene.add(tileRoot);
  scene.add(overlayRoot);
  scene.add(borderRoot);

  const tilesMap = new Map();
  const oceanGroups = [];
  const dimCache = new Map();
  const LAND_RES = { iron: 1, horses: 1, marble: 1 };

  function dimOf(m) {
    let d = dimCache.get(m);
    if (!d) {
      d = m.clone();
      d.color.copy(m.color).multiplyScalar(0.45);
      dimCache.set(m, d);
    }
    return d;
  }

  function tileX(x, vm) { return x - vm.W / 2 + 0.5; }
  function tileZ(y, vm) { return y - vm.H / 2 + 0.5; }

  function syncTiles(vm) {
    const seen = new Set();
    for (const t of vm.tiles) {
      if (!t.explored) continue;
      const idx = t.y * vm.W + t.x;
      seen.add(idx);
      let entry = tilesMap.get(idx);
      if (!entry) {
        const g = models.createTerrainMesh(t.terrain, t.x * 31 + t.y * 17);
        g.position.set(tileX(t.x, vm), 0, tileZ(t.y, vm));
        const kids = [];
        const forest = t.terrain === 3;
        g.traverse((o) => {
          if (!o.isMesh) return;
          o.userData.tile = { x: t.x, y: t.y };
          o.userData.baseMat = o.material;
          o.receiveShadow = true;
          if (forest && o.position.y > 0) o.castShadow = true;
          kids.push(o);
        });
        tileRoot.add(g);
        entry = { group: g, kids, dimmed: null, resMesh: null, imprMesh: null, imprVal: null, ocean: t.terrain === 0, x: t.x, y: t.y };
        tilesMap.set(idx, entry);
        if (entry.ocean) oceanGroups.push(entry);
      }
      const dim = !t.visible;
      if (entry.dimmed !== dim) {
        entry.dimmed = dim;
        for (const k of entry.kids) k.material = dim ? dimOf(k.userData.baseMat) : k.userData.baseMat;
      }
      const wantRes = (entry.ocean && t.res && t.visible) ||
        (!entry.ocean && t.res && LAND_RES[t.res] && t.explored);
      if (wantRes && !entry.resMesh) {
        entry.resMesh = entry.ocean ? models.createWaterResourceMesh(t.res) : models.createLandResourceMesh(t.res);
        entry.resMesh.position.set(0.22, entry.ocean ? 0.02 : 0, -0.22);
        entry.group.add(entry.resMesh);
      } else if (!wantRes && entry.resMesh) {
        entry.group.remove(entry.resMesh);
        entry.resMesh = null;
      }
      const iv = t.impr ? (t.impr.left ? t.impr.kind + "!" : t.impr.kind) : null;
      if (entry.imprVal !== iv) {
        entry.imprVal = iv;
        if (entry.imprMesh) {
          entry.group.remove(entry.imprMesh);
          entry.imprMesh = null;
        }
        if (iv) {
          entry.imprMesh = models.createImprovementMesh(t.impr.kind, !t.impr.left);
          entry.group.add(entry.imprMesh);
        }
      }
    }
    for (const [idx, entry] of tilesMap) {
      if (seen.has(idx)) continue;
      tileRoot.remove(entry.group);
      tilesMap.delete(idx);
      const oi = oceanGroups.indexOf(entry);
      if (oi >= 0) oceanGroups.splice(oi, 1);
    }
    pickMeshes = [];
    for (const entry of tilesMap.values()) for (const k of entry.kids) pickMeshes.push(k);
  }

  const own = { geos: [], mats: [] };
  function ownGeo(g) { own.geos.push(g); return g; }
  function ownMat(m) { own.mats.push(m); return m; }

  const G = {
    selRing: ownGeo(new THREE.RingGeometry(0.36, 0.46, 24)),
    dot: ownGeo(new THREE.CircleGeometry(0.1, 10)),
    readyRing: ownGeo(new THREE.TorusGeometry(0.3, 0.012, 6, 24)),
  };
  const selMat = ownMat(new THREE.MeshBasicMaterial({ color: 0xffe14d, side: THREE.DoubleSide }));
  const dotMat = ownMat(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
  const readyMat = ownMat(new THREE.MeshBasicMaterial({ color: 0xffe14d }));

  const unitHolders = new Map();
  const cityHolders = new Map();
  const fxRoot = new THREE.Group();
  overlayRoot.add(fxRoot);

  const fxRingGeo = ownGeo(new THREE.RingGeometry(0.8, 1, 32));
  const fxMatBase = ownMat(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));

  function spawnRing(x, z, color, dur) {
    while (effects.length >= FX_MAX) {
      const old = effects.shift();
      overlayRoot.remove(old.mesh);
      old.mat.dispose();
    }
    const mat = fxMatBase.clone();
    mat.color.set(color);
    const mesh = new THREE.Mesh(fxRingGeo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    mesh.scale.setScalar(0.2);
    overlayRoot.add(mesh);
    effects.push({ mesh, mat, t: 0, dur });
  }

  function syncEntities(vm) {
    const prevUnits = new Map();
    for (const [id, e] of unitHolders) prevUnits.set(id, { x: e.tx, y: e.ty, owner: e.owner });
    const seenU = new Set();
    const per = new Map();
    for (const u of vm.units) {
      seenU.add(u.id);
      let e = unitHolders.get(u.id);
      if (!e) {
        const holder = new THREE.Group();
        const ring = new THREE.Mesh(G.readyRing, readyMat);
        ring.rotation.x = -Math.PI / 2;
        ring.visible = false;
        holder.add(ring);
        overlayRoot.add(holder);
        e = { holder, mesh: null, ring, type: null, owner: -1, lastX: NaN, lastZ: NaN, baseY: 0, animT: 1, spawnT: 0, tx: NaN, ty: NaN, kick: null };
        unitHolders.set(u.id, e);
      }
      if (e.type !== u.type || e.owner !== u.owner) {
        if (e.mesh) e.holder.remove(e.mesh);
        e.mesh = models.createUnitMesh(u.type, vm.players[u.owner].color);
        e.mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        e.holder.add(e.mesh);
        e.type = u.type;
        e.owner = u.owner;
      }
      const k = u.y * vm.W + u.x;
      const i = per.get(k) || 0;
      per.set(k, i + 1);
      const water = vm.tiles[k].terrain === 0;
      const px = tileX(u.x, vm) + i * 0.22;
      const pz = tileZ(u.y, vm) + i * 0.22;
      if (e.lastX !== px || e.lastZ !== pz) {
        e.lastX = px;
        e.lastZ = pz;
        e.animT = 0;
      }
      e.baseY = water ? -0.03 : 0;
      e.tx = u.x;
      e.ty = u.y;
      e.holder.position.set(px, e.baseY, pz);
      e.ring.position.y = water ? 0.06 : 0.012;
      e.ring.visible = u.owner === 0 && u.movesLeft > 0;
    }
    for (const [id, e] of unitHolders) {
      if (seenU.has(id)) continue;
      unitHolders.delete(id);
      const p = prevUnits.get(id);
      const tile = p ? vm.tiles[p.y * vm.W + p.x] : null;
      const pl = tile && tile.visible && vm.players[p.owner] ? vm.players[p.owner] : null;
      if (!pl) {
        overlayRoot.remove(e.holder);
        continue;
      }
      spawnRing(e.lastX, e.lastZ, pl.color, shadowsOn ? FX_RING : FX_CLASH);
      if (shadowsOn) dying.push({ entry: e, t: 0, s0: e.holder.scale.x });
      else overlayRoot.remove(e.holder);
    }
    for (const u of vm.units) {
      if (prevUnits.has(u.id)) continue;
      for (const v of vm.units) {
        if (v.owner === u.owner) continue;
        if (Math.max(Math.abs(v.x - u.x), Math.abs(v.y - u.y)) > 1) continue;
        const vt = vm.tiles[v.y * vm.W + v.x];
        if (!vt || !vt.visible) continue;
        spawnRing(tileX(u.x, vm), tileZ(u.y, vm), 0xffffff, FX_CLASH);
        if (shadowsOn) {
          const ev = unitHolders.get(v.id);
          const dx = v.x - u.x;
          const dz = v.y - u.y;
          const len = Math.hypot(dx, dz);
          if (ev && len > 1e-6) ev.kick = { dx: dx / len, dz: dz / len, t: 0 };
        }
        break;
      }
    }
    const seenC = new Set();
    for (const c of vm.cities) {
      seenC.add(c.id);
      let e = cityHolders.get(c.id);
      if (!e) {
        const holder = new THREE.Group();
        overlayRoot.add(holder);
        e = { holder, mesh: null, pop: -1, walls: null, owner: -1, religion: null, relMesh: null, wonder: null, wMesh: null, flag: null, flagPhase: c.id % 7, spawnT: 0 };
        cityHolders.set(c.id, e);
      }
      const walls = !!c.walls;
      const wonder = (c.wonders && c.wonders[0]) || null;
      if (e.pop !== c.pop || e.walls !== walls || e.owner !== c.owner || e.wonder !== wonder) {
        if (e.mesh) e.holder.remove(e.mesh);
        e.mesh = models.createCityMesh(c.pop, vm.players[c.owner].color, walls, c.id % 100000);
        e.mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        e.flag = e.mesh.getObjectByName("flag");
        e.holder.add(e.mesh);
        if (e.wMesh) e.holder.remove(e.wMesh);
        e.wMesh = wonder ? models.createWonderMesh(wonder) : null;
        if (e.wMesh) {
          e.wMesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
          e.wMesh.position.set(0.25, 0, -0.25);
          e.holder.add(e.wMesh);
        }
        e.pop = c.pop;
        e.walls = walls;
        e.owner = c.owner;
        e.wonder = wonder;
      }
      const rel = c.religion || null;
      if (e.religion !== rel) {
        if (e.relMesh) e.holder.remove(e.relMesh);
        e.relMesh = rel ? models.createReligionMesh(rel) : null;
        if (e.relMesh) {
          e.relMesh.position.set(-0.32, 0.45, 0.32);
          e.holder.add(e.relMesh);
        }
        e.religion = rel;
      }
      e.holder.position.set(tileX(c.x, vm), 0, tileZ(c.y, vm));
    }
    for (const [id, e] of cityHolders) {
      if (seenC.has(id)) continue;
      overlayRoot.remove(e.holder);
      cityHolders.delete(id);
    }
    while (fxRoot.children.length) fxRoot.remove(fxRoot.children[0]);
    for (const r of vm.reach) {
      const d = new THREE.Mesh(G.dot, dotMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(tileX(r.x, vm), 0.05, tileZ(r.y, vm));
      fxRoot.add(d);
    }
    if (vm.selected) {
      const s = new THREE.Mesh(G.selRing, selMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(tileX(vm.selected.x, vm), 0.055, tileZ(vm.selected.y, vm));
      fxRoot.add(s);
    }
  }

  const borderSegs = new Map();
  const borderMats = new Map();
  let borderKey = null;

  function borderMat(color) {
    let m = borderMats.get(color);
    if (!m) {
      m = new THREE.LineBasicMaterial({ color });
      own.mats.push(m);
      borderMats.set(color, m);
    }
    return m;
  }

  function syncBorders(vm) {
    let k = "";
    for (const t of vm.tiles) k += t.explored ? String(t.owner + 2) : "x";
    if (k === borderKey) return;
    borderKey = k;
    const edges = new Map();
    const topOf = (t) => (t.terrain === 0 ? -0.035 : 0);
    for (const t of vm.tiles) {
      if (!t.explored || t.owner < 0 || !vm.players[t.owner]) continue;
      const x0 = tileX(t.x, vm) - 0.5, x1 = x0 + 1;
      const z0 = tileZ(t.y, vm) - 0.5, z1 = z0 + 1;
      const top = topOf(t);
      let list = edges.get(t.owner);
      if (!list) { list = []; edges.set(t.owner, list); }
      const n = t.y > 0 ? vm.tiles[(t.y - 1) * vm.W + t.x] : null;
      const s = t.y < vm.H - 1 ? vm.tiles[(t.y + 1) * vm.W + t.x] : null;
      const w = t.x > 0 ? vm.tiles[t.y * vm.W + t.x - 1] : null;
      const e = t.x < vm.W - 1 ? vm.tiles[t.y * vm.W + t.x + 1] : null;
      if (!n || n.owner !== t.owner) { const y = Math.max(top, n ? topOf(n) : top) + 0.02; list.push(x0, y, z0, x1, y, z0); }
      if (!s || s.owner !== t.owner) { const y = Math.max(top, s ? topOf(s) : top) + 0.02; list.push(x0, y, z1, x1, y, z1); }
      if (!w || w.owner !== t.owner) { const y = Math.max(top, w ? topOf(w) : top) + 0.02; list.push(x0, y, z0, x0, y, z1); }
      if (!e || e.owner !== t.owner) { const y = Math.max(top, e ? topOf(e) : top) + 0.02; list.push(x1, y, z0, x1, y, z1); }
    }
    for (const [, line] of borderSegs) line.visible = edges.has(line.userData.owner);
    for (const [owner, list] of edges) {
      let line = borderSegs.get(owner);
      if (!line) {
        const g = ownGeo(new THREE.BufferGeometry());
        g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(vm.W * vm.H * 24), 3));
        line = new THREE.LineSegments(g, borderMat(vm.players[owner].color));
        line.userData.owner = owner;
        line.frustumCulled = false;
        borderRoot.add(line);
        borderSegs.set(owner, line);
      }
      line.visible = true;
      const attr = line.geometry.attributes.position;
      for (let i = 0; i < list.length; i++) attr.array[i] = list[i];
      attr.needsUpdate = true;
      line.geometry.setDrawRange(0, list.length / 3);
    }
  }

  function draw(vm) {
    if (destroyed) return;
    mapW = vm.W;
    mapH = vm.H;
    fitSunShadow();
    syncTiles(vm);
    syncEntities(vm);
    syncBorders(vm);
  }

  const clockStart = performance.now();
  let lastNow = clockStart;
  const dtBuf = new Float32Array(90);
  let dtIdx = 0;
  let dtCnt = 0;
  let fpsT = 0;
  let shadowsOn = true;
  function frame() {
    if (destroyed) return;
    rafId = requestAnimationFrame(frame);
    const now = performance.now();
    const dtMs = now - lastNow;
    lastNow = now;
    const dt = dtMs / 1000;
    const t = (now - clockStart) / 1000;
    for (const e of oceanGroups) {
      e.group.position.y = 0.03 * Math.sin(t * 2 + (e.x + e.y) * 0.8);
      if (e.resMesh) e.resMesh.rotation.y = 0.2 * Math.sin(t * 1.5 + (e.x + e.y));
    }
    for (const e of unitHolders.values()) {
      if (e.animT < 0.3) {
        e.animT += dt;
        e.holder.position.y = e.animT < 0.3 ? e.baseY + 0.09 * Math.sin(Math.PI * e.animT / 0.3) : e.baseY;
      }
      if (e.spawnT < 0.3) {
        e.spawnT += dt;
        e.holder.scale.setScalar(e.spawnT < 0.3 ? 0.05 + 0.95 * (e.spawnT / 0.3) : 1);
      }
    }
    for (const e of cityHolders.values()) {
      if (e.spawnT < 0.3) {
        e.spawnT += dt;
        e.holder.scale.setScalar(e.spawnT < 0.3 ? 0.05 + 0.95 * (e.spawnT / 0.3) : 1);
      }
      if (e.flag) e.flag.rotation.y = 0.15 * Math.sin(t * 2 + e.flagPhase);
    }
    for (const e of unitHolders.values()) {
      if (!e.kick) continue;
      e.kick.t += dt;
      if (e.kick.t >= FX_KICK) {
        e.kick = null;
        e.holder.position.x = e.lastX;
        e.holder.position.z = e.lastZ;
      } else {
        const a = FX_KICK_DIST * Math.sin(Math.PI * e.kick.t / FX_KICK);
        e.holder.position.x = e.lastX + e.kick.dx * a;
        e.holder.position.z = e.lastZ + e.kick.dz * a;
      }
    }
    for (let i = dying.length - 1; i >= 0; i--) {
      const d = dying[i];
      d.t += dt;
      const p = Math.min(d.t / FX_DYING, 1);
      d.entry.holder.scale.setScalar(d.s0 + (0.05 - d.s0) * p);
      d.entry.holder.position.y = d.entry.baseY - 0.25 * p;
      if (p >= 1) {
        overlayRoot.remove(d.entry.holder);
        dying.splice(i, 1);
      }
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const f = effects[i];
      f.t += dt;
      const p = Math.min(f.t / f.dur, 1);
      f.mesh.scale.setScalar(0.2 + 1.2 * p);
      f.mat.opacity = 0.7 * (1 - p);
      if (p >= 1) {
        overlayRoot.remove(f.mesh);
        f.mat.dispose();
        effects.splice(i, 1);
      }
    }
    dtBuf[dtIdx] = dtMs;
    dtIdx = (dtIdx + 1) % dtBuf.length;
    if (dtCnt < dtBuf.length) dtCnt++;
    fpsT += dtMs;
    if (shadowsOn && fpsT >= 1500) {
      fpsT = 0;
      let slow = 0;
      for (let i = 0; i < dtCnt; i++) if (dtBuf[i] > 20) slow++;
      if (slow / dtCnt > 0.6) {
        shadowsOn = false;
        sun.castShadow = false;
        console.log("тени отключены: низкий FPS");
      }
    }
    renderer.render(scene, camera);
  }

  resize();
  applyCamera();
  rafId = requestAnimationFrame(frame);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(rafId);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerCancel);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("contextmenu", onContext);
    if (ro) ro.disconnect();
    else if (typeof window !== "undefined") window.removeEventListener("resize", onWinResize);
    for (const f of effects) {
      overlayRoot.remove(f.mesh);
      f.mat.dispose();
    }
    effects.length = 0;
    for (const d of dying) overlayRoot.remove(d.entry.holder);
    dying.length = 0;
    for (const g of own.geos) g.dispose();
    for (const m of own.mats) m.dispose();
    for (const m of dimCache.values()) m.dispose();
    dimCache.clear();
    unitHolders.clear();
    cityHolders.clear();
    borderSegs.clear();
    borderMats.clear();
    borderKey = null;
    tilesMap.clear();
    pickMeshes = [];
    oceanGroups.length = 0;
    tileRoot.clear();
    overlayRoot.clear();
    borderRoot.clear();
    renderer.dispose();
    container.innerHTML = "";
  }

  return { draw, destroy, zoom };
}
