import {
  TILE, TERRAIN, UNITS, BUILDINGS, TECHS, DIFFICULTIES, W, H,
  key, inMap, unitsAt, cityAt, unitById, isCoastal, reachable, moveUnit, attack,
  foundCity, cityYields, techAvailable, newGame, endTurn, save, load,
  playerGoldPerTurn, buyForGold, upgradeCost, upgradeUnit,
  computeVision, getState, getVisible, nextInStack,
  relKey, atWar, declareWar, offerPeace, strengthOf, offerDeal, demandTribute, resourceOwned,
  RELIGIONS, WONDERS, SS_PARTS, RESOURCES, isHolyCity, cityById,
  CULTURE_WIN_CITIES, legendaryCities, GREAT_PEOPLE, useGreatPerson,
  unitAvailable, resourceConnected, hasMarble, wonderCost, cityHappiness,
  startImprovement, cancelWork, spreadFaith, declareStateReligion, councilSupport,
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
  return "3d";
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
        impr: S.impr ? S.impr[k] : null,
        explored: !!S.explored[k],
        visible: !!visible[k],
        owner: S.tileOwner ? S.tileOwner[k] : -1,
      });
    }
  const cities = S.cities
    .filter((c) => S.explored[key(c.x, c.y)])
    .map((c) => ({
      id: c.id, x: c.x, y: c.y, name: c.name, pop: c.pop, owner: c.owner,
      walls: c.buildings.includes("walls"), religion: c.religion || null,
      happy: c.happy ?? 1, unhappy: c.unhappy ?? 0, riot: !!c.riot,
      revolt: (c.revoltPressure || 0) >= 3,
      wonders: (S.wonders || []).filter((w) => w.cityId === c.id).map((w) => w.id),
    }));
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
    S.sel = nextInStack(mine, S.sel).id;
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
  const gold = playerGoldPerTurn(0);
  const goldStrike = p.gold === 0 && gold.net < 0;
  const netStr = `${gold.net >= 0 ? "+" : ""}${gold.net}`;
  const happinessTotal = S.cities.filter((c) => c.owner === 0)
    .reduce((a, c) => a + (c.happy ?? 1) - (c.unhappy ?? 0), 0);
  const council = councilSupport();
  const el = document.getElementById("civ-top");
  if (!el) return;
  el.innerHTML = `
    <div class="topbar-row">
      <button class="back" id="civ-home">⌂</button>
      <h1>Цивилизация · ход ${S.turn}<span class="civ-diff">${(DIFFICULTIES[S.difficulty] || DIFFICULTIES[1]).title}</span></h1>
      <div class="civ-sci">
        ${res ? `🔬 ${res.name} ${pct}%` : "🔬 выберите технологию"}
        <div class="civ-sci-bar"><div style="width:${pct}%"></div></div>
      </div>
      <div class="civ-sci civ-gold" title="Золото: доход ${gold.income}🪙 − содержание ${gold.upkeep}🪙 = ${netStr}🪙 за ход">🪙 ${p.gold} (${netStr})${goldStrike ? ` <span class="civ-warn">⚠ наука остановлена</span>` : ""}</div>
      <div class="civ-cult" title="Легендарные города: ${legendaryCities(0).length} из ${CULTURE_WIN_CITIES}">🏛 ${legendaryCities(0).length}/${CULTURE_WIN_CITIES}</div>
      <div class="civ-cult" title="Космический корабль">🚀 ${(S.space[0] || []).length}/${Object.keys(SS_PARTS).length}</div>
      ${council ? `<div class="civ-cult" title="Поддержка во Всемирном совете">🤝 ${Math.round((100 * council.votes) / council.total)}%</div>` : ""}
      <div class="civ-cult" title="Суммарное счастье городов: счастье − недовольство">😊 ${happinessTotal >= 0 ? "+" : ""}${happinessTotal}</div>
    </div>
    <div class="topbar-row topbar-actions">
      <button class="civ-tech-btn" id="civ-render-toggle">${rendererMode === "3d" ? "2D" : "3D"}</button>
      <button class="civ-tech-btn" id="civ-diplo">Дипломатия</button>
      <button class="civ-tech-btn" id="civ-religion">Религия</button>
      <button class="civ-tech-btn" id="civ-tech">Технологии</button>
      <span class="topbar-spacer"></span>
      <button class="civ-end" id="civ-end">Конец хода</button>
    </div>
  `;
  document.getElementById("civ-home").onclick = () => {
    if (hubCtx && hubCtx.back) hubCtx.back();
    else showStart(true);
  };
  document.getElementById("civ-render-toggle").onclick = () => swapRenderer(rendererMode === "3d" ? "2d" : "3d");
  document.getElementById("civ-diplo").onclick = showDiplo;
  document.getElementById("civ-religion").onclick = showReligion;
  document.getElementById("civ-tech").onclick = showTech;
  document.getElementById("civ-end").onclick = () => { endTurn(); refresh(); };
}

function renderPanel() {
  const S = getState();
  const el = document.getElementById("civ-panel");
  if (!el) return;
  const sel = S.sel ? unitById(S.sel) : null;
  let body = `<div class="civ-hint">Кликните юнит, затем клетку. ПКМ — снять выбор. Сухопутные юниты перевозятся кораблями: шагните на свой корабль для посадки.</div>`;
  if (sel) {
    const u = UNITS[sel.type];
    const t = TERRAIN[S.map[key(sel.x, sel.y)]];
    const stack = unitsAt(sel.x, sel.y).filter((x) => x.owner === 0);
    const stackInfo = stack.length > 1 ? ` <span class="civ-terr">Юнит ${stack.findIndex((x) => x.id === sel.id) + 1} из ${stack.length}</span>` : "";
    body = `
      <div class="civ-unit">
        <b>${u.name}</b> · ⚔${u.atk}${sel.atkBonus ? "+" + sel.atkBonus : ""} 🛡${u.def} · ходов: ${sel.moves}${stackInfo}
        <span class="civ-terr">${t.name}${t.def ? ` (+${t.def}% защ.)` : ""}</span>
      </div>`;
    if (sel.type === "settler" && !cityAt(sel.x, sel.y) && TERRAIN[S.map[key(sel.x, sel.y)]].passable) {
      const tOwner = S.tileOwner ? S.tileOwner[key(sel.x, sel.y)] : -1;
      if (tOwner === -1 || tOwner === 0) body += `<button class="btn primary" id="civ-found">Основать город</button>`;
    }
    if (sel.type === "worker") {
      const wk = key(sel.x, sel.y);
      if (sel.work) {
        const total = sel.work.kind === "road" ? 2 : 3;
        const nm = sel.work.kind === "farm" ? "🌱 Ферма" : sel.work.kind === "mine" ? "⚒ Шахта" : "🛤 Дорога";
        body += `<button class="btn text" disabled>${nm}: работа ${total - sel.work.left}/${total}</button>`;
        body += `<button class="btn text" id="civ-cancelwork">✖ Отменить работу</button>`;
      } else {
        const terr = S.map[wk];
        const onCity = !!cityAt(sel.x, sel.y);
        const tOwner = S.tileOwner ? S.tileOwner[wk] : -1;
        const busy = S.impr ? !!S.impr[wk] : false;
        const reason = (kind) => {
          if (onCity) return "Под клеткой расположен город";
          if (tOwner !== 0) return "Улучшения строятся только на своей территории";
          if (busy) return "Клетка уже улучшена";
          if (sel.moves <= 0) return "Нет ходов";
          if (kind === "farm" && terr !== TILE.GRASS && terr !== TILE.PLAINS) return "Ферма строится на лугах или равнине";
          if (kind === "mine" && terr !== TILE.HILLS) return "Шахта строится на холмах";
          if (kind === "road" && (terr === TILE.OCEAN || !TERRAIN[terr].passable)) return "Дорога строится на проходимой суше";
          return "";
        };
        const fr = reason("farm"), mr = reason("mine"), rr = reason("road");
        body += `<button class="btn primary" id="civ-farm" ${fr ? `disabled title="${fr}"` : ""}>🌱 Построить ферму (3 хода)</button>`;
        body += `<button class="btn primary" id="civ-mine" ${mr ? `disabled title="${mr}"` : ""}>⚒ Построить шахту (3 хода)</button>`;
        body += `<button class="btn primary" id="civ-road" ${rr ? `disabled title="${rr}"` : ""}>🛤 Построить дорогу (2 хода)</button>`;
      }
    }
    if (sel.type === "missionary") {
      const mCity = cityAt(sel.x, sel.y);
      let why = "";
      if (!mCity) why = "Миссионер должен быть в городе";
      else if (mCity.owner !== 0 && atWar(0, mCity.owner)) why = "В военное время вера не распространяется";
      body += `<button class="btn primary" id="civ-spread" ${why ? `disabled title="${why}"` : ""}>🕯 Распространить веру</button>`;
    }
    const ownCity = cityAt(sel.x, sel.y);
    if (ownCity && ownCity.owner === 0) {
      body += `<button class="btn text" id="civ-city">🏛 Открыть город</button>`;
    }
    if (u.gp) {
      const gpDef = GREAT_PEOPLE[u.gp];
      const inOwnCity = ownCity && ownCity.owner === 0;
      const gpBlocked = u.gp !== "scientist" && u.gp !== "general" && !inOwnCity;
      body += `<button class="btn primary" id="civ-gp" ${gpBlocked ? `disabled title="Великий человек должен быть в своём городе"` : `title="${gpDef.desc}"`}>✨ ${gpDef.desc}</button>`;
    }
    const upTo = u.upgrade ? UNITS[u.upgrade] : null;
    if (upTo) {
      const price = upgradeCost(sel);
      const onOwn = (ownCity && ownCity.owner === 0) ||
        (S.tileOwner && S.tileOwner[key(sel.x, sel.y)] === 0);
      let upTitle = "";
      if (!onOwn) upTitle = "Апгрейд доступен только на своей территории";
      else if (!unitAvailable(0, u.upgrade))
        upTitle = upTo.tech && !S.players[0].techs.includes(upTo.tech)
          ? `Не изучена технология: ${TECHS[upTo.tech].name}`
          : `Нужен ресурс в границах: ${(upTo.res || []).map((r) => RESOURCES[r].name).join(", ")}`;
      else if (S.players[0].gold < price) upTitle = `Мало золота: нужно ${price}🪙`;
      body += `<button class="btn text" id="civ-up" ${upTitle ? `disabled title="${upTitle}"` : ""}>⬆ Улучшить до ${upTo.name} за ${price}🪙</button>`;
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
  const fbtn = document.getElementById("civ-farm");
  if (fbtn) fbtn.onclick = () => {
    const u = unitById(getState().sel);
    if (u && startImprovement(u.id, "farm").ok) { save(); refresh(); }
  };
  const mbtn = document.getElementById("civ-mine");
  if (mbtn) mbtn.onclick = () => {
    const u = unitById(getState().sel);
    if (u && startImprovement(u.id, "mine").ok) { save(); refresh(); }
  };
  const rbtn = document.getElementById("civ-road");
  if (rbtn) rbtn.onclick = () => {
    const u = unitById(getState().sel);
    if (u && startImprovement(u.id, "road").ok) { save(); refresh(); }
  };
  const cw = document.getElementById("civ-cancelwork");
  if (cw) cw.onclick = () => {
    const u = unitById(getState().sel);
    if (u && cancelWork(u.id).ok) { save(); refresh(); }
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
  const ub = document.getElementById("civ-up");
  if (ub) ub.onclick = () => {
    const u = unitById(getState().sel);
    if (u && upgradeUnit(u).ok) { save(); refresh(); }
  };
  const gb = document.getElementById("civ-gp");
  if (gb) gb.onclick = () => {
    const u = unitById(getState().sel);
    if (u && useGreatPerson(u.id).ok) { save(); refresh(); }
  };
  const sp = document.getElementById("civ-spread");
  if (sp) sp.onclick = () => {
    const u = unitById(getState().sel);
    if (u && spreadFaith(u.id).ok) { save(); refresh(); }
  };
}

function refresh() {
  renderTopbar();
  renderPanel();
  if (renderer) renderer.draw(buildViewModel());
  renderOver();
  renderElectionModal();
}

let electionModalShown = null;

function renderElectionModal() {
  const S = getState();
  const list = S.elections || [];
  const last = list.length ? list[list.length - 1] : null;
  if (!last || S.over || electionModalShown === last || last.turn < S.turn - 1) return;
  if (document.getElementById("civ-modal")) return;
  electionModalShown = last;
  const alive = (i) => S.cities.some((c) => c.owner === i) || S.units.some((u) => u.owner === i && u.type === "settler");
  const dots = (arr) => arr.map((i) => (S.players[i] ? `<i class="civ-dot" style="background:${S.players[i].color}" title="${escapeHtml(S.players[i].name)}"></i>` : "")).join(" ");
  const winner = S.players[last.winner] || S.players[0];
  const m = document.createElement("div");
  m.className = "civ-modal";
  m.id = "civ-modal";
  m.innerHTML = `
    <div class="civ-dialog">
      <h2>🕊 Всемирный совет</h2>
      <p>Голосование хода ${last.turn}${last.won ? " · лидер мира избран" : " · большинство не достигнуто"}</p>
      <div class="civ-yields">Кандидат: ${escapeHtml(winner.name)} · за ${last.votes} из ${last.total} (${last.total ? Math.round((100 * last.votes) / last.total) : 0}%)</div>
      <div class="civ-sum-row">За: ${dots(last.voters)}</div>
      <div class="civ-sum-row">Воздержались: ${dots(S.players.map((_, i) => i).filter((i) => alive(i) && !last.voters.includes(i)))}</div>
      <button class="btn primary" id="civ-close">Закрыть</button>
    </div>
  `;
  rootEl.appendChild(m);
  document.getElementById("civ-close").onclick = closeModal;
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
  const type = S.over.type === "culture" ? "culture" : S.over.type === "space" ? "space" : S.over.type === "diplomacy" ? "diplomacy" : "conquest";
  const draw = S.over.winner === -1;
  const win = !draw && S.over.winner === 0;
  const winner = S.players[S.over.winner] || S.players[0];
  const dipElection = (S.elections || []).filter((e) => e.winner === S.over.winner).pop() || null;
  const dipPct = dipElection && dipElection.total ? Math.round((100 * dipElection.votes) / dipElection.total) : 0;
  const title = draw ? "🤝 Ничья"
    : !win ? "💀 Поражение"
    : type === "culture" ? "🕊 Культурная победа!"
    : type === "space" ? "🚀 Научная победа!"
    : type === "diplomacy" ? "🕊 Дипломатическая победа!"
    : "🏆 Победа завоеванием!";
  const sub = draw ? "Взаимное уничтожение: цивилизации пали в одной войне."
    : !win
    ? type === "space"
      ? `${escapeHtml(winner.name)} первыми вышли к звёздам: космический корабль запущен`
      : type === "diplomacy"
      ? `${escapeHtml(winner.name)} избраны во Всемирном совете лидером мира`
      : `${escapeHtml(winner.name)} победили ${type === "culture" ? "культурно" : "завоеванием"}`
    : type === "culture" ? "Ваши легендарные города — слава веков."
    : type === "space" ? `Космический корабль собран за ${S.turn} ходов.`
    : type === "diplomacy" ? `Поддержка ${dipPct}% голосов на выборах хода ${dipElection ? dipElection.turn : S.turn}.`
    : "Все противники повержены.";
  const myCities = S.cities.filter((c) => c.owner === 0);
  const cultureTotal = myCities.reduce((a, c) => a + (c.culture || 0), 0);
  const cityItems = S.players
    .map((p, i) => ({ p, n: S.cities.filter((c) => c.owner === i).length }))
    .filter((r) => r.n > 0)
    .map((r) => `<span><i class="civ-dot" style="background:${r.p.color}"></i>${escapeHtml(r.p.name)}: ${r.n}</span>`)
    .join("");
  const legends = legendaryCities(0);
  const wonderItems = (S.wonders || []).map((w) => {
    const d = WONDERS[w.id];
    const c = cityById(w.cityId);
    const owner = c ? S.players[c.owner] : null;
    return `<span><i class="civ-dot" style="background:${owner ? owner.color : "#888"}"></i>${d.icon} ${d.name}${owner ? ` (${escapeHtml(owner.name)})` : ""}</span>`;
  }).join("");
  el.innerHTML = `
    <div class="civ-dialog">
      <h2>${title}</h2>
      <p>${sub}</p>
      <div class="civ-summary">
        <div class="civ-yields">Ходов: ${S.turn} · Технологий: ${S.players[0].techs.length} · Суммарная культура: ${cultureTotal}</div>
        <div class="civ-sum-row">Города: ${cityItems}</div>
        ${legends.length ? `<div class="civ-sum-row">Легендарные города: ${legends.map((c) => escapeHtml(c.name)).join(", ")}</div>` : ""}
        ${wonderItems ? `<div class="civ-sum-row">Чудеса света: ${wonderItems}</div>` : ""}
      </div>
      <h3>Играть снова</h3>
      <div id="civ-ng-controls"></div>
    </div>
  `;
  newGameControls(1, 1);
}

function showCity(c) {
  closeModal();
  const S = getState();
  const y = cityYields(c);
  const hap = cityHappiness(c);
  const mood = c.riot
    ? "😡 бунт!"
    : hap.happy > hap.unhappy
      ? `😀 +${hap.happy - hap.unhappy}`
      : hap.unhappy > hap.happy
        ? `😡 ${hap.happy - hap.unhappy}`
        : "😐 0";
  const p = S.players[0];
  const pressure = c.revoltPressure || 0;
  const presser = c.revoltBy != null ? (S.players[c.revoltBy] || {}).name : null;
  const held = unitsAt(c.x, c.y).some((u) => u.owner === 0 && UNITS[u.type].atk > 0 && !UNITS[u.type].gp);
  const unitOpts = Object.entries(UNITS)
    .filter(([, d]) => !d.gp && (!d.tech || p.techs.includes(d.tech)) && (!d.naval || isCoastal(c.x, c.y)))
    .map(([id, d]) => {
      const need = (d.res || []).filter((r) => !resourceConnected(0, r));
      const noRel = id === "missionary" && !c.religion;
      return {
        k: "unit", id, name: d.name, cost: d.cost,
        info: `⚔${d.atk} 🛡${d.def}${d.naval ? " ⛵" : ""}${need.length ? ` · нужен ресурс: ${need.map((r) => `${RESOURCES[r].icon} ${RESOURCES[r].name}`).join(", ")} в границах` : ""}${noRel ? " · в городе нужна религия" : ""}`,
        ok: !need.length && !noRel,
        bad: noRel ? "в городе нужна религия" : "нужен ресурс в границах",
      };
    });
  const bldOpts = Object.entries(BUILDINGS)
    .filter(([id, d]) => (!d.tech || p.techs.includes(d.tech)) && !c.buildings.includes(id))
    .map(([id, d]) => ({ k: "building", id, name: d.name, cost: d.cost, info: d.desc }));
  const wonderOpts = Object.entries(WONDERS).map(([id, d]) => {
    const built = (S.wonders || []).find((w) => w.id === id);
    const techOk = !d.tech || p.techs.includes(d.tech);
    return {
      k: "wonder", id, name: `${d.icon} ${d.name}`, cost: wonderCost(c, id),
      info: built ? `${d.desc} · построено: ${S.players[built.owner].name}` :
        (!techOk ? `${d.desc} · нужна технология: ${TECHS[d.tech].name}` : `${d.desc}${hasMarble(c) ? " · 🏛 Мрамор −25%" : ""}`),
      ok: !built && techOk,
    };
  });
  const opts = [...unitOpts, ...bldOpts];
  const cur = c.producing
    ? (c.producing.k === "unit" ? UNITS[c.producing.id] : c.producing.k === "building" ? BUILDINGS[c.producing.id] : c.producing.k === "project" ? SS_PARTS[c.producing.id] : WONDERS[c.producing.id])
    : null;
  const m = document.createElement("div");
  m.className = "civ-modal";
  m.id = "civ-modal";
  m.innerHTML = `
    <div class="civ-dialog civ-city">
      <h2>🏛 ${c.name} <span class="civ-pop">население ${c.pop}</span></h2>
      <div class="civ-yields">🌾 ${y.food} (еда) · 🔨 ${y.prod} (произв.) · 🔬 ${y.sci} (наука) · 🪙 ${y.gold} (золото)</div>
      <div class="civ-growth">Настроение: ${mood} · 😀 ${hap.happy} / 😡 ${hap.unhappy}</div>
      ${pressure > 0 ? `<div class="civ-warn">⚠ Давление ${escapeHtml(presser || "соседей")}: ${pressure}/5${held ? " · сдерживает гарнизон" : ""}</div>` : ""}
      ${y.trade ? `<div class="civ-yields">🤝 Морская торговля: +${y.tradeGold}🪙</div>` : ""}
      <div class="civ-growth">Рост: ${c.foodStored}/${10 + c.pop * 5} еды</div>
      ${cur ? `<div class="civ-growth">Производит: ${cur.name} (${c.prodStored}/${c.producing.k === "wonder" ? wonderCost(c, c.producing.id) : cur.cost})</div>` : `<div class="civ-warn">Не выбрано производство!</div>`}
      ${c.buildings.length ? `<div class="civ-yields">Постройки: ${c.buildings.map((b) => BUILDINGS[b].name).join(", ")}</div>` : ""}
      ${c.religion
        ? `<div class="civ-yields">Религия: ${RELIGIONS[c.religion].icon} ${RELIGIONS[c.religion].name}${isHolyCity(c) ? " · святой город" : ""}</div>`
        : `<div class="civ-yields">Религии нет</div>`}
      <h3>Производить:</h3>
      <div class="civ-prod-list">
        ${opts.map((o) => {
          const price = Math.ceil(o.cost * 3);
          const afford = p.gold >= price;
          const buyBlocked = !afford || o.ok === false;
          return `
          <div style="display:flex;gap:6px;align-items:stretch">
            <button class="civ-prod ${c.producing && c.producing.id === o.id && c.producing.k === o.k ? "sel" : ""}" style="flex:1"
                    data-k="${o.k}" data-id="${o.id}" ${o.ok === false ? "disabled" : ""}>
              <b>${o.name}</b><span>${o.info}</span><span>🔨 ${o.cost}</span>
            </button>
            <button class="btn text civ-buy" style="width:auto;white-space:nowrap;padding:6px 10px;font-size:12.5px"
                    data-k="${o.k}" data-id="${o.id}" ${buyBlocked ? `disabled title="${o.ok === false ? o.bad : `Недостаточно золота: нужно ${price}🪙`}"` : `title="Купить за ${price}🪙"`}>Купить 🪙${price}</button>
          </div>`;
        }).join("")}
      </div>
      <h3>Чудеса света:</h3>
      <div class="civ-prod-list">
        ${wonderOpts.map((o) => `
          <button class="civ-prod ${c.producing && c.producing.id === o.id && c.producing.k === o.k ? "sel" : ""}"
                  data-k="${o.k}" data-id="${o.id}" ${o.ok ? "" : "disabled"}>
            <b>${o.name}</b><span>${o.info}</span><span>🔨 ${o.cost}</span>
          </button>`).join("")}
      </div>
      ${p.techs.includes("rocketry") ? `
      <h3>🚀 Космический корабль:</h3>
      <div class="civ-prod-list">
        ${Object.entries(SS_PARTS).map(([id, d]) => {
          const built = (S.space[0] || []).includes(id);
          return `<button class="civ-prod ${c.producing && c.producing.id === id && c.producing.k === "project" ? "sel" : ""}"
                  data-k="project" data-id="${id}" ${built ? "disabled" : ""}>
            <b>${d.name}</b><span>${built ? "построено" : "часть космического корабля"}</span><span>🔨 ${d.cost}</span>
          </button>`;
        }).join("")}
      </div>` : ""}
      <button class="btn text" id="civ-close">Закрыть</button>
    </div>
  `;
  rootEl.appendChild(m);
  document.getElementById("civ-close").onclick = closeModal;
  m.querySelectorAll(".civ-buy").forEach((b) => {
    b.onclick = () => {
      const r = buyForGold(c.id, b.dataset.k, b.dataset.id);
      if (r.ok) { save(); showCity(c); refresh(); }
    };
  });
  m.querySelectorAll(".civ-prod").forEach((b) => {
    b.onclick = () => {
      if (b.dataset.k === "wonder" && (S.wonders || []).some((w) => w.id === b.dataset.id)) return;
      if (b.dataset.k === "project" && (S.space[0] || []).includes(b.dataset.id)) return;
      if (b.dataset.k === "unit" && !unitAvailable(0, b.dataset.id)) return;
      if (b.dataset.k === "unit" && b.dataset.id === "missionary" && !c.religion) return;
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

let diploTrade = { open: null, giveTech: null, wantTech: null, giveGold: 0, wantGold: 0, giveRes: [], wantRes: [], status: "" };

function toggleArr(arr, v) { return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]; }

function showDiplo() {
  closeModal();
  const S = getState();
  const me = S.players[0];
  const dt = diploTrade;
  const pt = S.pendingTribute && S.players[S.pendingTribute.ai] ? S.pendingTribute : null;
  const ptCard = pt ? `
      <div class="civ-prod">
        <b>⚠ ${escapeHtml(S.players[pt.ai].name)} требуют дань</b>
        <span>${pt.amount}🪙 в ход в течение 10 ходов</span>
        <span>
          <button class="btn text" id="civ-pt-pay">Принять</button>
          <button class="btn text" id="civ-pt-war" title="Отказ означает немедленную войну">Отказать (война)</button>
        </span>
      </div>` : "";
  const m = document.createElement("div");
  m.className = "civ-modal";
  m.id = "civ-modal";
  m.innerHTML = `
    <div class="civ-dialog civ-techs">
      <h2>🤝 Дипломатия</h2>
      ${ptCard}
      <div class="civ-prod-list">
        ${S.players.slice(1).map((p, idx) => {
          const i = idx + 1;
          const rel = (S.relations || {})[relKey(0, i)] || { war: false, since: -1 };
          const status = rel.war ? `⚔ война с хода ${rel.since}` : "🕊 мир";
          const cd = 10 - (S.turn - (rel.lastTradeTurn ?? -99));
          const cooldown = !rel.war && cd > 0;
          const open = !rel.war && dt.open === i;
          const mine = me.techs.filter((t) => !p.techs.includes(t));
          const theirs = p.techs.filter((t) => !me.techs.includes(t));
          const myRes = Object.keys(RESOURCES).filter((r) => resourceOwned(0, r));
          const theirRes = Object.keys(RESOURCES).filter((r) => resourceOwned(i, r));
          const tin = (S.tributes || {})[`${i}:0`];
          const tout = (S.tributes || {})[`0:${i}`];
          const pairDeals = (S.resDeals || []).filter((d) => (d.from === 0 && d.to === i) || (d.from === i && d.to === 0));
          const summaryBits = [];
          if (tin) summaryBits.push(`Получаете дань ${tin.amount}🪙/ход (ост. ${tin.turnsLeft})`);
          if (tout) summaryBits.push(`Платите дань ${tout.amount}🪙/ход (ост. ${tout.turnsLeft})`);
          if (pairDeals.length) summaryBits.push(`Ресурсы по сделке: ${pairDeals.map((d) => `${RESOURCES[d.res].icon} ${RESOURCES[d.res].name} (ост. ${d.left})`).join(", ")}`);
          const hasSel = !!(dt.giveTech || dt.wantTech || dt.giveGold || dt.wantGold || dt.giveRes.length || dt.wantRes.length);
          const goldBtns = (cur, who, treasury) => [25, 50, 100]
            .filter((g) => g < treasury)
            .map((g) => `<button class="civ-prod ${cur === g ? "sel" : ""}" data-${who}-gold="${g}"><b>${g}🪙</b></button>`).join("") +
            (treasury > 0 ? `<button class="civ-prod ${cur === treasury ? "sel" : ""}" data-${who}-gold="${treasury}"><b>всё ${treasury}🪙</b></button>` : "");
          const resBtns = (cur, who, list) => list.map((r) => `<button class="civ-prod ${cur.includes(r) ? "sel" : ""}" data-${who}-res="${r}"><b>${RESOURCES[r].icon} ${RESOURCES[r].name}</b><span>ресурс</span></button>`).join("");
          const tributeOk = !cooldown && strengthOf(i) < 0.6 * strengthOf(0);
          const tributeTitle = cooldown
            ? `Дань доступна через ${cd} ход.`
            : `Нужен значительный перевес силы: ${strengthOf(0)} против ${strengthOf(i)}`;
          return `<div class="civ-prod">
            <b><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${p.color};margin-right:6px;vertical-align:middle"></span>${escapeHtml(p.name)}</b>
            <span>${status} · сила: ${strengthOf(i)}</span>
            <span>
              <button class="btn text" data-war="${i}" ${rel.war ? "disabled" : ""}>Объявить войну</button>
              <button class="btn text" data-peace="${i}" ${rel.war ? "" : "disabled"}>Предложить мир</button>
              ${rel.war
                ? `<button class="btn text" disabled>Торговля</button> <i>Только в мирное время</i>`
                : `<button class="btn text" data-trade="${i}">${open ? "Скрыть сделки" : "Сделки"}</button>${cooldown ? ` <i>сделка доступна через ${cd} ход.</i>` : ""}`}
            </span>
          </div>
          ${open ? `
          <div class="civ-prod" style="flex-direction:column;align-items:stretch;gap:6px">
            <b>🤝 Сделки</b>
            ${summaryBits.length ? `<span>${summaryBits.join(" · ")}</span>` : ""}
            ${cooldown ? `<span>Сделка доступна через ${cd} ходов</span>` : ""}
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <div style="flex:1;min-width:180px"><b>Отдаю:</b>
                <div class="civ-prod-list" style="margin-top:4px">
                  ${mine.length ? mine.map((t) => `<button class="civ-prod ${dt.giveTech === t ? "sel" : ""}" data-give-tech="${t}"><b>${TECHS[t].name}</b><span>🔬 ${TECHS[t].cost}</span></button>`).join("") : "<span>нет технологий</span>"}
                  ${goldBtns(dt.giveGold, "give", me.gold)}
                  ${myRes.length ? resBtns(dt.giveRes, "give", myRes) : ""}
                </div>
              </div>
              <div style="flex:1;min-width:180px"><b>Прошу:</b>
                <div class="civ-prod-list" style="margin-top:4px">
                  ${theirs.length ? theirs.map((t) => `<button class="civ-prod ${dt.wantTech === t ? "sel" : ""}" data-want-tech="${t}"><b>${TECHS[t].name}</b><span>🔬 ${TECHS[t].cost}</span></button>`).join("") : "<span>нет технологий</span>"}
                  ${goldBtns(dt.wantGold, "want", p.gold)}
                  ${theirRes.length ? resBtns(dt.wantRes, "want", theirRes) : ""}
                </div>
              </div>
            </div>
            <div>
              <button class="btn text" data-offer="${i}" ${hasSel && !cooldown ? "" : "disabled"}>Предложить сделку</button>
              ${dt.status ? `<span> ${escapeHtml(dt.status)}</span>` : ""}
            </div>
            <div>
              <button class="btn text" data-tribute="${i}" ${tributeOk ? "" : `disabled title="${tributeTitle}"`}>Потребовать дань</button>
            </div>
          </div>` : ""}`;
        }).join("")}
      </div>
      <button class="btn text" id="civ-close">Закрыть</button>
    </div>
  `;
  rootEl.appendChild(m);
  document.getElementById("civ-close").onclick = closeModal;
  const payBtn = document.getElementById("civ-pt-pay");
  if (payBtn) payBtn.onclick = () => {
    const st = getState();
    const pd = st.pendingTribute;
    if (!pd) return;
    if (!st.tributes) st.tributes = {};
    st.tributes[`0:${pd.ai}`] = { amount: pd.amount, turnsLeft: 10 };
    st.pendingTribute = null;
    save();
    refresh();
    showDiplo();
  };
  const warBtn = document.getElementById("civ-pt-war");
  if (warBtn) warBtn.onclick = () => {
    const st = getState();
    const pd = st.pendingTribute;
    if (!pd) return;
    st.pendingTribute = null;
    declareWar(pd.ai, 0);
    save();
    refresh();
    showDiplo();
  };
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
  m.querySelectorAll("[data-trade]").forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.trade);
      diploTrade = { open: diploTrade.open === i ? null : i, giveTech: null, wantTech: null, giveGold: 0, wantGold: 0, giveRes: [], wantRes: [], status: "" };
      showDiplo();
    };
  });
  m.querySelectorAll("[data-give-tech]").forEach((b) => {
    b.onclick = () => {
      diploTrade.giveTech = diploTrade.giveTech === b.dataset.giveTech ? null : b.dataset.giveTech;
      showDiplo();
    };
  });
  m.querySelectorAll("[data-want-tech]").forEach((b) => {
    b.onclick = () => {
      diploTrade.wantTech = diploTrade.wantTech === b.dataset.wantTech ? null : b.dataset.wantTech;
      showDiplo();
    };
  });
  m.querySelectorAll("[data-give-gold]").forEach((b) => {
    b.onclick = () => {
      const g = Number(b.dataset.giveGold);
      diploTrade.giveGold = diploTrade.giveGold === g ? 0 : g;
      showDiplo();
    };
  });
  m.querySelectorAll("[data-want-gold]").forEach((b) => {
    b.onclick = () => {
      const g = Number(b.dataset.wantGold);
      diploTrade.wantGold = diploTrade.wantGold === g ? 0 : g;
      showDiplo();
    };
  });
  m.querySelectorAll("[data-give-res]").forEach((b) => {
    b.onclick = () => {
      diploTrade.giveRes = toggleArr(diploTrade.giveRes, b.dataset.giveRes);
      showDiplo();
    };
  });
  m.querySelectorAll("[data-want-res]").forEach((b) => {
    b.onclick = () => {
      diploTrade.wantRes = toggleArr(diploTrade.wantRes, b.dataset.wantRes);
      showDiplo();
    };
  });
  m.querySelectorAll("[data-offer]").forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.offer);
      const give = {};
      if (diploTrade.giveTech) give.techs = [diploTrade.giveTech];
      if (diploTrade.giveGold > 0) give.gold = diploTrade.giveGold;
      if (diploTrade.giveRes.length) give.res = [...diploTrade.giveRes];
      const get = {};
      if (diploTrade.wantTech) get.techs = [diploTrade.wantTech];
      if (diploTrade.wantGold > 0) get.gold = diploTrade.wantGold;
      if (diploTrade.wantRes.length) get.res = [...diploTrade.wantRes];
      const r = offerDeal(0, i, { give, get });
      diploTrade.status = r.ok ? "Сделка состоялась" : `Отказ: ${r.reason}`;
      if (r.ok) {
        diploTrade.giveTech = null;
        diploTrade.wantTech = null;
        diploTrade.giveGold = 0;
        diploTrade.wantGold = 0;
        diploTrade.giveRes = [];
        diploTrade.wantRes = [];
        save();
        refresh();
      }
      showDiplo();
    };
  });
  m.querySelectorAll("[data-tribute]").forEach((b) => {
    b.onclick = () => {
      const i = Number(b.dataset.tribute);
      const r = demandTribute(0, i);
      diploTrade.status = r.ok ? `Дань назначена: ${r.amount}🪙/ход на 10 ходов` : `Отказ: ${r.reason}`;
      if (r.ok) {
        save();
        refresh();
      }
      showDiplo();
    };
  });
}

function showReligion() {
  closeModal();
  const S = getState();
  const founded = S.religions || [];
  const mine = founded.find((r) => r.owner === 0) || null;
  const mineHoly = mine ? cityById(mine.holyCityId) : null;
  const myRelCities = S.cities.filter((c) => c.owner === 0 && c.religion);
  const cur = S.players[0].stateReligion || null;
  const present = Object.entries(RELIGIONS).filter(([id]) => S.cities.some((c) => c.owner === 0 && c.religion === id));
  const m = document.createElement("div");
  m.className = "civ-modal";
  m.id = "civ-modal";
  m.innerHTML = `
    <div class="civ-dialog civ-techs">
      <h2>🕯 Религия</h2>
      ${mine
        ? `<div class="civ-yields">Ваша религия: ${RELIGIONS[mine.id].icon} ${RELIGIONS[mine.id].name} · священный город ${escapeHtml(mineHoly ? mineHoly.name : "—")} (ход ${mine.turn})</div>`
        : `<div class="civ-yields">Вы не основали религию</div>`}
      <div class="civ-prod-list">
        ${Object.entries(RELIGIONS).map(([id, r]) => {
          const f = founded.find((x) => x.id === id);
          if (!f) return `<div class="civ-prod"><b>${r.icon} ${r.name}</b><span>не основана</span><span>${TECHS[r.tech].name}</span></div>`;
          const holy = cityById(f.holyCityId);
          const founder = S.players[f.owner];
          const cnt = S.cities.filter((c) => c.religion === id).length;
          return `<div class="civ-prod">
            <b>${r.icon} ${r.name}</b>
            <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${founder.color};margin-right:6px;vertical-align:middle"></span>${escapeHtml(founder.name)} · священный город ${escapeHtml(holy ? holy.name : "—")} (ход ${f.turn})</span>
            <span>городов: ${cnt}</span>
          </div>`;
        }).join("")}
      </div>
      <h3>Государственная религия</h3>
      ${cur
        ? `<div class="civ-yields">Объявлена: ${RELIGIONS[cur].icon} ${RELIGIONS[cur].name} — +1 счастье и +1 культура в городах с этой религией, +2 золота от святого города</div>`
        : `<div class="civ-yields">Не объявлена. Эффекты: +1 счастье и +1 культура в городах с государственной религией, +2 золота от святого города, дипломатия зависит от веры соседей</div>`}
      <div class="civ-prod-list">
        ${present.length ? present.map(([id, r]) => `
          <button class="civ-prod ${cur === id ? "sel" : ""}" data-rel="${id}" ${cur === id ? "disabled" : ""}>
            <b>${cur === id ? "✓ " : ""}${r.icon} ${r.name}</b>
            <span>${cur === id ? "государственная религия" : "Сделать государственной"}</span>
            <span>городов: ${S.cities.filter((c) => c.owner === 0 && c.religion === id).length}</span>
          </button>`).join("") : `<div class="civ-yields">Ни одна религия не присутствует в ваших городах</div>`}
      </div>
      <div class="civ-yields">Ваши религиозные города: ${myRelCities.length ? myRelCities.map((c) => `${escapeHtml(c.name)} ${RELIGIONS[c.religion].icon}`).join(", ") : "нет"}</div>
      <button class="btn text" id="civ-close">Закрыть</button>
    </div>
  `;
  rootEl.appendChild(m);
  document.getElementById("civ-close").onclick = closeModal;
  m.querySelectorAll("[data-rel]").forEach((b) => {
    b.onclick = () => {
      declareStateReligion(0, b.dataset.rel);
      save();
      showReligion();
      refresh();
    };
  });
}

function closeModal() {
  const m = document.getElementById("civ-modal");
  if (m) m.remove();
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
  if (getState().over) return;
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
