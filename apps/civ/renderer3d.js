export async function createRenderer3D(container, handlers) {
  const THREE = await import("./vendor/three.module.js");
  const models = await import("./models3d.js");

  let destroyed = false;
  let rafId = 0;
  let mapW = 26;
  let mapH = 18;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d0d12);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "70vh";
  canvas.style.touchAction = "none";
  container.appendChild(canvas);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(8, 14, 6);
  scene.add(sun);

  const PHI_MIN = 0.15, PHI_MAX = 1.35, R_MIN = 6, R_MAX = 40;
  const orbit = { theta: -Math.PI / 4, phi: 0.7, radius: 24, target: new THREE.Vector3(0, 0, 0) };

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
        g.traverse((o) => {
          if (!o.isMesh) return;
          o.userData.tile = { x: t.x, y: t.y };
          o.userData.baseMat = o.material;
          kids.push(o);
        });
        tileRoot.add(g);
        entry = { group: g, kids, dimmed: null, resMesh: null, ocean: t.terrain === 0, x: t.x, y: t.y };
        tilesMap.set(idx, entry);
        if (entry.ocean) oceanGroups.push(entry);
      }
      const dim = !t.visible;
      if (entry.dimmed !== dim) {
        entry.dimmed = dim;
        for (const k of entry.kids) k.material = dim ? dimOf(k.userData.baseMat) : k.userData.baseMat;
      }
      const wantRes = entry.ocean && t.res && t.visible;
      if (wantRes && !entry.resMesh) {
        entry.resMesh = models.createWaterResourceMesh(t.res);
        entry.resMesh.position.set(0.22, 0.02, -0.22);
        entry.group.add(entry.resMesh);
      } else if (!wantRes && entry.resMesh) {
        entry.group.remove(entry.resMesh);
        entry.resMesh = null;
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

  function syncEntities(vm) {
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
        e = { holder, mesh: null, ring, type: null, owner: -1 };
        unitHolders.set(u.id, e);
      }
      if (e.type !== u.type || e.owner !== u.owner) {
        if (e.mesh) e.holder.remove(e.mesh);
        e.mesh = models.createUnitMesh(u.type, vm.players[u.owner].color);
        e.holder.add(e.mesh);
        e.type = u.type;
        e.owner = u.owner;
      }
      const k = u.y * vm.W + u.x;
      const i = per.get(k) || 0;
      per.set(k, i + 1);
      const water = vm.tiles[k].terrain === 0;
      e.holder.position.set(tileX(u.x, vm) + i * 0.22, water ? -0.03 : 0, tileZ(u.y, vm) + i * 0.22);
      e.ring.position.y = water ? 0.06 : 0.012;
      e.ring.visible = u.owner === 0 && u.movesLeft > 0;
    }
    for (const [id, e] of unitHolders) {
      if (seenU.has(id)) continue;
      overlayRoot.remove(e.holder);
      unitHolders.delete(id);
    }
    const seenC = new Set();
    for (const c of vm.cities) {
      seenC.add(c.id);
      let e = cityHolders.get(c.id);
      if (!e) {
        const holder = new THREE.Group();
        overlayRoot.add(holder);
        e = { holder, mesh: null, pop: -1, walls: null, owner: -1, religion: null, relMesh: null, wonder: null, wMesh: null };
        cityHolders.set(c.id, e);
      }
      const walls = !!c.walls;
      const wonder = (c.wonders && c.wonders[0]) || null;
      if (e.pop !== c.pop || e.walls !== walls || e.owner !== c.owner || e.wonder !== wonder) {
        if (e.mesh) e.holder.remove(e.mesh);
        e.mesh = models.createCityMesh(c.pop, vm.players[c.owner].color, walls, c.id % 100000);
        e.holder.add(e.mesh);
        if (e.wMesh) e.holder.remove(e.wMesh);
        e.wMesh = wonder ? models.createWonderMesh(wonder) : null;
        if (e.wMesh) {
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
    syncTiles(vm);
    syncEntities(vm);
    syncBorders(vm);
  }

  const clockStart = performance.now();
  function frame() {
    if (destroyed) return;
    rafId = requestAnimationFrame(frame);
    const t = (performance.now() - clockStart) / 1000;
    for (const e of oceanGroups) e.group.position.y = 0.03 * Math.sin(t * 2 + (e.x + e.y) * 0.8);
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

  return { draw, destroy };
}
