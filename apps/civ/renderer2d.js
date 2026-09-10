import { TILE, TERRAIN, W, H, TS, RELIGIONS } from "./core.js";

export function createRenderer2D(container, handlers) {
  const cv = document.createElement("canvas");
  cv.id = "civ-canvas";
  cv.width = W * TS;
  cv.height = H * TS;
  container.appendChild(cv);
  const ctx = cv.getContext("2d");
  let destroyed = false;

  const tileFromEvent = (e) => {
    const r = cv.getBoundingClientRect();
    const scale = cv.width / r.width;
    const x = Math.floor(((e.clientX - r.left) * scale) / TS);
    const y = Math.floor(((e.clientY - r.top) * scale) / TS);
    return [x, y];
  };

  const onClick = (e) => {
    const [x, y] = tileFromEvent(e);
    handlers.onTileClick(x, y);
  };

  const onContext = (e) => {
    e.preventDefault();
    handlers.onTileRightClick();
  };

  cv.addEventListener("click", onClick);
  cv.addEventListener("contextmenu", onContext);

  function drawGlyph(g, x, y, size) {
    ctx.font = `${size || TS - 6}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(g, x * TS + TS / 2, y * TS + TS - 6);
    ctx.textAlign = "left";
  }

  function draw(vm) {
    ctx.fillStyle = "#0d0d12";
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (const t of vm.tiles) {
      if (!t.explored) continue;
      ctx.fillStyle = TERRAIN[t.terrain].color;
      ctx.fillRect(t.x * TS, t.y * TS, TS - 1, TS - 1);
      if (t.terrain === TILE.FOREST) drawGlyph("🌲", t.x, t.y);
      if (t.terrain === TILE.MOUNTAIN) drawGlyph("⛰", t.x, t.y);
      if (t.terrain === TILE.HILLS) drawGlyph("⌃", t.x, t.y, 12);
      if (t.terrain === TILE.OCEAN && t.res) drawGlyph(t.res === "fish" ? "🐟" : "🐋", t.x, t.y);
      if (!t.visible) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(t.x * TS, t.y * TS, TS - 1, TS - 1);
      }
    }
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    const ownAt = (x, y) => (x < 0 || y < 0 || x >= vm.W || y >= vm.H) ? -1 : vm.tiles[y * vm.W + x].owner;
    for (const t of vm.tiles) {
      if (!t.explored || t.owner < 0 || !vm.players[t.owner]) continue;
      ctx.strokeStyle = vm.players[t.owner].color;
      const px = t.x * TS, py = t.y * TS, s = TS - 1;
      ctx.beginPath();
      if (ownAt(t.x, t.y - 1) !== t.owner) { ctx.moveTo(px, py); ctx.lineTo(px + s, py); }
      if (ownAt(t.x, t.y + 1) !== t.owner) { ctx.moveTo(px, py + s); ctx.lineTo(px + s, py + s); }
      if (ownAt(t.x - 1, t.y) !== t.owner) { ctx.moveTo(px, py); ctx.lineTo(px, py + s); }
      if (ownAt(t.x + 1, t.y) !== t.owner) { ctx.moveTo(px + s, py); ctx.lineTo(px + s, py + s); }
      ctx.stroke();
    }
    ctx.restore();
    for (const c of vm.cities) {
      const px = c.x * TS, py = c.y * TS;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(px + 2, py + 2, TS - 5, TS - 5);
      ctx.font = "19px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🏛️", px + TS / 2, py + TS / 2 + 6);
      ctx.textAlign = "left";
      ctx.fillStyle = vm.players[c.owner].color;
      ctx.fillRect(px + 2, py + TS - 10, 14, 9);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.fillText(String(c.pop), px + 6, py + TS - 3);
      if (c.walls) {
        ctx.font = "10px sans-serif";
        ctx.fillText("🛡", px + TS - 14, py + 11);
      }
      if (c.religion) {
        const rd = RELIGIONS[c.religion];
        ctx.fillStyle = rd.color;
        ctx.fillRect(px + 1, py + 1, 13, 12);
        ctx.font = "9px sans-serif";
        ctx.fillText(rd.icon, px + 3, py + 10);
      }
    }
    for (const u of vm.units) {
      const cx = u.x * TS + TS / 2;
      const cy = u.y * TS + TS / 2;
      const onWater = vm.tiles[u.y * vm.W + u.x].terrain === TILE.OCEAN;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fillStyle = vm.players[u.owner].color;
      ctx.fill();
      ctx.strokeStyle = onWater ? "#7fd4ff"
        : (u.ready ? "#ffe14d" : "rgba(0,0,0,0.6)");
      ctx.lineWidth = u.ready ? 2 : 1.5;
      ctx.stroke();
      ctx.font = "15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(u.icon, cx, cy + 5);
      ctx.textAlign = "left";
      if (u.ready) {
        ctx.beginPath();
        ctx.arc(cx + 10, cy - 9, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#ffe14d";
        ctx.fill();
      }
    }
    for (const r of vm.reach) {
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(r.x * TS + TS / 2 - 3, r.y * TS + TS / 2 - 3, 6, 6);
    }
    if (vm.selected) {
      ctx.strokeStyle = "#ffe14d";
      ctx.lineWidth = 2;
      ctx.strokeRect(vm.selected.x * TS + 1, vm.selected.y * TS + 1, TS - 3, TS - 3);
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cv.removeEventListener("click", onClick);
    cv.removeEventListener("contextmenu", onContext);
    container.innerHTML = "";
  }

  return { draw, destroy };
}
