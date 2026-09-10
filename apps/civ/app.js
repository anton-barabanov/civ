import {
  TERRAIN, UNITS, BUILDINGS, TECHS, DIFFICULTIES, W, H,
  key, inMap, unitsAt, cityAt, unitById, isCoastal, reachable, moveUnit, attack,
  foundCity, cityYields, techAvailable, newGame, endTurn, save, load,
  computeVision, getState, getVisible,
  relKey, atWar, declareWar, offerPeace, strengthOf,
} from "./core.js";
import { createRenderer2D } from "./renderer2d.js";

export { debugApi } from "./core.js";

let rootEl = null;
let hubCtx = null;
let renderer = null;
let rendererMode = "2d";
let rendererGen = 0;

function initialRendererMode() {
  if (typeof location === "undefined") return "2d";
  try {
    const q = new URLSearchParams(location.search).get("renderer");
    if (q === "3d" || q === "2d") return q;
    const saved = localStorage.getItem("civ_renderer");
    if (saved === "3d" || saved === "2d") return saved;
  } catch (e) {}
  return "2d";
}

function persistRenderer(mode) {
  rendererMode = mode;
  if (typeof localStorage !== "undefined") {
    try { localStorage.setItem("civ_renderer", mode); } catch (e) {}
  }
}

async function swapRenderer(mode) {
  const gen = ++rendererGen;
  const mapEl = document.getElementById("civ-map");
  if (!mapEl) return;
  if (renderer) { renderer.destroy(); renderer = null; }
  mapEl.innerHTML = "";
  let next = null;
  if (mode === "3d") {
    try {
      const mod = await import("./renderer3d.js");
      next = await mod.createRenderer3D(mapEl, { onTileClick, onTileRightClick });
    } catch (e) {
      console.log("3D недоступно, включён 2D", e);
      const S = getState();
      if (S.log) { S.log.unshift("3D недоступно, включён 2D"); if (S.log.length > 30) S.log.length = 30; }
      mode = "2d";
    }
  }
  if (gen !== rendererGen) {
    if (next) next.destroy();
    return;
  }
  if (!next) next = createRenderer2D(mapEl, { onTileClick, onTileRightClick });
  persistRenderer(mode);
  renderer = next;
  refresh();
}

function buildViewModel() {
  const S = getState();
  const visible = getVisible();
  const sel = S.sel ? unitById(S.sel) : null;
  const reach = sel && sel.owner === 0
    ? [...reachable(sel).keys()].map((k) => ({ x: k % W, y: Math.floor(k / W) }))
    : [];
  const tiles = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = key(x, y);
      tiles.push({
        x, y,
        terrain: S.map[k],
        res: S.res ? S.res[k] : null,
        explored: !!S.explored[k],
        visible: !!visible[k],
        owner: S.tileOwner ? S.tileOwner[k] : -1,
      });
    }
  const cities = S.cities
    .filter((c) => S.explored[key(c.x, c.y)])
    .map((c) => ({ id: c.id, x: c.x, y: c.y, name: c.name, pop: c.pop, owner: c.owner, walls: c.buildings.includes("walls") }));
  const units = S.units
    .filter((u) => (u.owner === 0 || visible[key(u.x, u.y)]) && S.explored[key(u.x, u.y)])
    .map((u) => ({ id: u.id, type: u.type, x: u.x, y: u.y, owner: u.owner, movesLeft: u.moves, ready: u.owner === 0 && u.moves > 0, icon: UNITS[u.type].icon }));
  return {
    W,
    H,
    players: S.players.map((p) => ({ color: p.color })),
    tiles,
    cities,
    units,
    selected: sel ? { x: sel.x, y: sel.y } : null,
    reach,
  };
}

function onTileClick(x, y) {
  const S = getState();
  if (S.over) { refresh(); return; }
  if (!inMap(x, y) || !S.explored[key(x, y)]) return;
  const sel = S.sel ? unitById(S.sel) : null;
  if (sel && sel.owner === 0) {
    if (sel.x === x && sel.y === y) { S.sel = null; refresh(); return; }
    const reach = reachable(sel);
    if (reach.has(key(x, y))) {
      const enemies = unitsAt(x, y).some((u) => u.owner !== 0) ||
        (cityAt(x, y) && cityAt(x, y).owner !== 0);
      if (enemies) attack(sel, x, y);
      else moveUnit(sel, x, y);
      if (S.sel && !unitById(S.sel)) S.sel = null;
      save();
      refresh();
      return;
    }
  }
  const mine = unitsAt(x, y).filter((u) => u.owner === 0);
  if (mine.length) {
    S.sel = mine[0].id;
  } else {
    S.sel = null;
    const c = cityAt(x, y);
    if (c && c.owner === 0 && getVisible()[key(x, y)]) showCity(c);
  }
  refresh();
}

function onTileRightClick() {
  getState().sel = null;
  refresh();
}

function sciTotal() {
  const S = getState();
  return S.cities.filter((c) => c.owner === 0).reduce((a, c) => a + cityYields(c).sci, 0);
}

function renderTopbar() {
  const S = getState();
  const p = S.players[0];
  const res = p.researching ? TECHS[p.researching] : null;
  const pct = res ? Math.min(100, Math.round((p.progress / res.cost) * 100)) : 0;
  const el = document.getElementById("civ-top");
  if (!el) return;
  el.innerHTML = `
    <button class="back" id="civ-home">⌂</button>
    <h1>Цивилизация · ход ${S.turn}<span class="civ-diff">${(DIFFICULTIES[S.difficulty] || DIFFICULTIES[1]).title}</span></h1>
    <div class="civ-sci">
      ${res ? `🔬 ${res.name} ${pct}%` : "🔬 выберите технологию"}
      <div class="civ-sci-bar"><div style="width:${pct}%"></div></div>
    </div>
    <button class="civ-tech-btn" id="civ-render-toggle">${rendererMode === "3d" ? "2D" : "3D"}</button>
    <button class="civ-tech-btn" id="civ-diplo">Дипломатия</button>
    <button class="civ-tech-btn" id="civ-tech">Технологии</button>
    <button class="civ-end" id="civ-end">Конец хода</button>
  `;
  document.getElementById("civ-home").onclick = () => {
    if (hubCtx && hubCtx.back) hubCtx.back();
    else showStart(true);
  };
  document.getElementById("civ-render-toggle").onclick = () => swapRenderer(rendererMode === "3d" ? "2d" : "3d");
  document.getElementById("civ-diplo").onclick = showDiplo;
  document.getElementById("civ-tech").onclick = showTech;
  document.getElementById("civ-end").onclick = () => { endTurn(); refresh(); };
}

function renderPanel() {
  const S = getState();
  const el = document.getElementById("civ-panel");
  if (!el) return;
  const sel = S.sel ? unitById(S.sel) : null;
  let body = `<div class="civ-hint">Кликните юнит, затем клетку. Сухопутные юниты могут выходить в море. ПКМ — снять выбор.</div>`;
  if (sel) {
    const u = UNITS[sel.type];
    const t = TERRAIN[S.map[key(sel.x, sel.y)]];
    body = `
      <div class="civ-unit">
        <b>${u.name}</b> · ⚔${u.atk} 🛡${u.def} · ходов: ${sel.moves}
        <span class="civ-terr">${t.name}${t.def ? ` (+${t.def}% защ.)` : ""}</span>
      </div>`;
    if (sel.type === "settler" && !cityAt(sel.x, sel.y) && TERRAIN[S.map[key(sel.x, sel.y)]].passable) {
      const tOwner = S.tileOwner ? S.tileOwner[key(sel.x, sel.y)] : -1;
      if (tOwner === -1 || tOwner === 0) body += `<button class="btn primary" id="civ-found">Основать город</button>`;
    }
    const ownCity = cityAt(sel.x, sel.y);
    if (ownCity && ownCity.owner === 0) {
      body += `<button class="btn text" id="civ-city">🏛 Открыть город</button>`;
    }
    if (sel.moves > 0) {
      body += `<button class="btn text" id="civ-skip">Пропустить ход</button>`;
    }
  }
  const myCities = S.cities.filter((c) => c.owner === 0);
  if (myCities.some((c) => !c.producing)) {
    body += `<div class="civ-warn">⚠ В городе не выбрано производство — кликните город</div>`;
  }
  el.innerHTML = body + `
    <div class="civ-log">${S.log.slice(0, 5).map((l) => `<div>${escapeHtml(l)}</div>`).join("")}</div>
  `;
  const f = document.getElementById("civ-found");
  if (f) f.onclick = () => {
    const u = unitById(getState().sel);
    if (u) { foundCity(u); save(); refresh(); }
  };
  const sk = document.getElementById("civ-skip");
  if (sk) sk.onclick = () => {
    const u = unitById(getState().sel);
    if (u) { u.moves = 0; save(); refresh(); }
  };
  const cb = document.getElementById("civ-city");
  if (cb) cb.onclick = () => {
    const u = unitById(getState().sel);
    const c = u && cityAt(u.x, u.y);
    if (c) showCity(c);
  };
}

function refresh() {
  renderTopbar();
  renderPanel();
  if (renderer) renderer.draw(buildViewModel());
  renderOver();
}

function renderOver() {
  const S = getState();
  let el = document.getElementById("civ-over");
  if (!S.over) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement("div");
    el.id = "civ-over";
    el.className = "civ-modal";
    rootEl.appendChild(el);
  }
  const win = S.over.winner === 0;
  el.innerHTML = `
    <div class="civ-dialog">
      <h2>${win ? "🏆 Победа!" : "💀 Поражение"}</h2>
      <p>${win ? "Вы захватили все города противника." : "Противник уничтожил вашу цивилизацию."}</p>
      <p>Играть снова:</p>
      <div class="civ-diff-btns">${newGameButtons()}</div>
    </div>
  `;
  el.querySelectorAll(".civ-diff-btn").forEach((b) => {
    b.onclick = () => { newGame(Number(b.dataset.diff)); refresh(); };
  });
}

function showCity(c) {
  closeModal();
  const S = getState();
  const y = cityYields(c);
  const p = S.players[0];
  const unitOpts = Object.entries(UNITS)
    .filter(([, d]) => (!d.tech || p.techs.includes(d.tech)) && (!d.naval || isCoastal(c.x, c.y)))
    .map(([id, d]) => ({ k: "unit", id, name: d.name, cost: d.cost, info: `⚔${d.atk} 🛡${d.def}${d.naval ? " ⛵" : ""}` }));
  const bldOpts = Object.entries(BUILDINGS)
    .filter(([id, d]) => (!d.tech || p.techs.includes(d.tech)) && !c.buildings.includes(id))
    .map(([id, d]) => ({ k: "building", id, name: d.name, cost: d.cost, info: d.desc }));
  const opts = [...unitOpts, ...bldOpts];
  const cur = c.producing
    ? (c.producing.k === "unit" ? UNITS[c.producing.id] : BUILDINGS[c.producing.id])
    : null;
  const m = document.createElement("div");
  m.className = "civ-modal";
  m.id = "civ-modal";
  m.innerHTML = `
    <div class="civ-dialog civ-city">
      <h2>🏛 ${c.name} <span class="civ-pop">население ${c.pop}</span></h2>
      <div class="civ-yields">🌾 ${y.food} (еда) · 🔨 ${y.prod} (произв.) · 🔬 ${y.sci} (наука)</div>
      ${y.trade ? `<div class="civ-yields">🤝 Морская торговля: +${y.tradeProd}🔨 +${y.tradeSci}🔬</div>` : ""}
      <div class="civ-growth">Рост: ${c.foodStored}/${10 + c.pop * 5} еды</div>
      ${cur ? `<div class="civ-growth">Производит: ${cur.name} (${c.prodStored}/${cur.cost})</div>` : `<div class="civ-warn">Не выбрано производство!</div>`}
      ${c.buildings.length ? `<div class="civ-yields">Постройки: ${c.buildings.map((b) => BUILDINGS[b].name).join(", ")}</div>` : ""}
      <h3>Производить:</h3>
      <div class="civ-prod-list">
        ${opts.map((o) => `
          <button class="civ-prod ${c.producing && c.producing.id === o.id && c.producing.k === o.k ? "sel" : ""}"
                  data-k="${o.k}" data-id="${o.id}">
            <b>${o.name}</b><span>${o.info}</span><span>🔨 ${o.cost}</span>
          </button>`).join("")}
      </div>
      <button class="btn text" id="civ-close">Закрыть</button>
    </div>
  `;
  rootEl.appendChild(m);
  document.getElementById("civ-close").onclick = closeModal;
  m.querySelectorAll(".civ-prod").forEach((b) => {
    b.onclick = () => {
      c.producing = { k: b.dataset.k, id: b.dataset.id };
      save();
      showCity(c);
      refresh();
    };
  });
}

function showTech() {
  closeModal();
  const S = getState();
  const p = S.players[0];
  const m = document.createElement("div");
  m.className = "civ-modal";
  m.id = "civ-modal";
  m.innerHTML = `
    <div class="civ-dialog civ-techs">
      <h2>🔬 Технологии</h2>
      <div class="civ-yields">Наука: ${sciTotal()} в ход${p.researching ? ` · изучается: ${TECHS[p.researching].name}` : ""}</div>
      <div class="civ-prod-list">
        ${Object.entries(TECHS).map(([id, t]) => {
          const done = p.techs.includes(id);
          const can = techAvailable(p, id);
          const active = p.researching === id;
          const req = t.req.length ? `нужно: ${t.req.map((r) => TECHS[r].name).join(", ")}` : "стартовая";
          return `<button class="civ-prod ${done ? "done" : ""} ${active ? "sel" : ""}" data-tech="${id}" ${(!can && !done) ? "disabled" : ""}>
            <b>${t.name}</b><span>${done ? "изучено" : req}</span><span>🔬 ${t.cost}</span>
          </button>`;
        }).join("")}
      </div>
      <button class="btn text" id="civ-close">Закрыть</button>
    </div>
  `;
  rootEl.appendChild(m);
  document.getElementById("civ-close").onclick = closeModal;
  m.querySelectorAll(".civ-prod[data-tech]").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.tech;
      if (p.techs.includes(id)) return;
      if (!techAvailable(p, id)) return;
      if (p.researching !== id) { p.researching = id; p.progress = 0; }
      save();
      showTech();
      refresh();
    };
  });
}

function showDiplo() {
  closeModal();
  const S = getState();
  const m = document.createElement("div");
  m.className = "civ-modal";
  m.id = "civ-modal";
  m.innerHTML = `
    <div class="civ-dialog civ-techs">
      <h2>🤝 Дипломатия</h2>
      <div class="civ-prod-list">
        ${S.players.slice(1).map((p, idx) => {
          const i = idx + 1;
          const rel = (S.relations || {})[relKey(0, i)] || { war: false, since: -1 };
          const status = rel.war ? `⚔ война с хода ${rel.since}` : "🕊 мир";
          return `<div class="civ-prod">
            <b><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.color};margin-right:6px;vertical-align:middle"></span>${escapeHtml(p.name)}</b>
            <span>${status} · сила: ${strengthOf(i)}</span>
            <span>
              <button class="btn text" data-war="${i}" ${rel.war ? "disabled" : ""}>Объявить войну</button>
              <button class="btn text" data-peace="${i}" ${rel.war ? "" : "disabled"}>Предложить мир</button>
            </span>
          </div>`;
        }).join("")}
      </div>
      <button class="btn text" id="civ-close">Закрыть</button>
    </div>
  `;
  rootEl.appendChild(m);
  document.getElementById("civ-close").onclick = closeModal;
  m.querySelectorAll("[data-war]").forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.war);
      if (atWar(0, i)) return;
      declareWar(0, i);
      save();
      showDiplo();
      refresh();
    };
  });
  m.querySelectorAll("[data-peace]").forEach((b) => {
    b.onclick = () => {
      offerPeace(0, Number(b.dataset.peace));
      save();
      showDiplo();
      refresh();
    };
  });
}

function closeModal() {
  const m = document.getElementById("civ-modal");
  if (m) m.remove();
}

function newGameButtons() {
  return DIFFICULTIES.map((d, i) =>
    `<button class="btn ${i === 1 ? "primary" : "text"} civ-diff-btn" data-diff="${i}">${d.title}</button>`).join("");
}

function newGameControls(selectedDiff = 1, selectedOpps = 1, onDone) {
  const holder = document.getElementById("civ-ng-controls");
  if (!holder) return;
  const oppBtns = [1, 2, 3, 4];
  const sync = () => {
    DIFFICULTIES.forEach((d, i) => {
      const b = document.getElementById(`civ-ng-diff-${i}`);
      if (b) b.className = `btn ${i === selectedDiff ? "primary" : "text"}`;
    });
    for (const n of oppBtns) {
      const b = document.getElementById(`civ-ng-opp-${n}`);
      if (b) b.className = `btn ${n === selectedOpps ? "primary" : "text"}`;
    }
  };
  holder.innerHTML = `
    <p>Сложность:</p>
    <div class="civ-diff-btns">${DIFFICULTIES.map((d, i) =>
      `<button class="btn ${i === selectedDiff ? "primary" : "text"}" id="civ-ng-diff-${i}">${d.title}</button>`).join("")}</div>
    <p>Противники:</p>
    <div class="civ-diff-btns">${oppBtns.map((n) =>
      `<button class="btn ${n === selectedOpps ? "primary" : "text"}" id="civ-ng-opp-${n}">${n}</button>`).join("")}</div>
    <button class="btn primary" id="civ-ng-go">Начать игру</button>
  `;
  DIFFICULTIES.forEach((d, i) => {
    const b = document.getElementById(`civ-ng-diff-${i}`);
    if (b) b.onclick = () => { selectedDiff = i; sync(); };
  });
  for (const n of oppBtns) {
    const b = document.getElementById(`civ-ng-opp-${n}`);
    if (b) b.onclick = () => { selectedOpps = n; sync(); };
  }
  const go = document.getElementById("civ-ng-go");
  if (go) go.onclick = () => { newGame(selectedDiff, selectedOpps); if (onDone) onDone(); refresh(); };
}

function showStart(showContinue) {
  const m = document.createElement("div");
  m.className = "civ-modal";
  m.id = "civ-start";
  m.innerHTML = `
    <div class="civ-dialog">
      <h2>🏛 Цивилизация</h2>
      <p>Пошаговая 4X-стратегия: расширяйтесь, изучайте технологии, захватите все города противников.</p>
      ${showContinue ? `<button class="btn primary" id="civ-continue">Продолжить игру</button>` : ""}
      <div id="civ-ng-controls"></div>
    </div>
  `;
  rootEl.appendChild(m);
  const cont = document.getElementById("civ-continue");
  if (cont) cont.onclick = () => m.remove();
  newGameControls(1, 1, () => m.remove());
}

function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

export const civApp = {
  id: "civ",
  title: "Цивилизация",
  description: "Пошаговая 4X-стратегия в духе Civilization: города, технологии, война с ИИ",
  icon: "🏛️",
  mount(root, nav) {
    rootEl = root;
    hubCtx = nav;
    const hadSave = load();
    root.innerHTML = `
      <div class="topbar" id="civ-top"></div>
      <div class="civ-map-wrap" id="civ-map"></div>
      <div id="civ-panel" class="civ-panel"></div>
    `;
    rendererGen++;
    rendererMode = initialRendererMode();
    renderer = null;
    if (rendererMode === "3d") swapRenderer("3d");
    else renderer = createRenderer2D(document.getElementById("civ-map"), { onTileClick, onTileRightClick });
    if (!hadSave) newGame();
    computeVision();
    refresh();
    showStart(hadSave && !getState().over);
    return () => {
      closeModal();
      const ov = document.getElementById("civ-over");
      if (ov) ov.remove();
      const st = document.getElementById("civ-start");
      if (st) st.remove();
      rendererGen++;
      if (renderer) renderer.destroy();
      renderer = null;
      rootEl = null;
      hubCtx = null;
    };
  },
};
