let ctx = null;
let master = null;
let muted = false;
let prefLoaded = false;
let armed = false;
let armedFns = [];

function loadPref() {
  if (prefLoaded) return;
  prefLoaded = true;
  try {
    const ls = globalThis.localStorage;
    if (ls && typeof ls.getItem === "function") muted = ls.getItem("civ1_sound") === "0";
  } catch (e) {
    muted = false;
  }
}

function savePref() {
  try {
    const ls = globalThis.localStorage;
    if (ls && typeof ls.setItem === "function") ls.setItem("civ1_sound", muted ? "0" : "1");
  } catch (e) {}
}

function disarm() {
  try {
    const d = globalThis.document;
    if (d && typeof d.removeEventListener === "function")
      for (const [t, fn] of armedFns) d.removeEventListener(t, fn);
  } catch (e) {}
  armedFns = [];
}

function arm() {
  if (armed) return;
  armed = true;
  try {
    const d = globalThis.document;
    if (!d || typeof d.addEventListener !== "function") return;
    const unlock = () => {
      try {
        const c = ensure();
        if (!c) { disarm(); return; }
        if (c.state === "suspended" && typeof c.resume === "function") {
          const p = c.resume();
          if (p && typeof p.then === "function") p.then(disarm, () => {});
        } else disarm();
      } catch (e) {}
    };
    armedFns = [["pointerdown", unlock], ["keydown", unlock]];
    for (const [t, fn] of armedFns) d.addEventListener(t, fn);
  } catch (e) {}
}

function ensure() {
  loadPref();
  arm();
  if (ctx) return ctx;
  try {
    const AC = globalThis.AudioContext ||
      (globalThis.window && (globalThis.window.AudioContext || globalThis.window.webkitAudioContext));
    if (typeof AC !== "function") return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.12;
    master.connect(ctx.destination);
  } catch (e) {
    ctx = null;
    master = null;
  }
  return ctx;
}

function wake(c) {
  try {
    if (c && c.state === "suspended" && typeof c.resume === "function") {
      const p = c.resume();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  } catch (e) {}
}

function tone(type, f0, f1, dur, at, vol) {
  const c = ensure();
  if (!c || muted || !master) return;
  try {
    wake(c);
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.015, dur * 0.4));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch (e) {}
}

function burst(dur, at, vol) {
  const c = ensure();
  if (!c || muted || !master) return;
  try {
    wake(c);
    const t0 = c.currentTime + at;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 1000;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
  } catch (e) {}
}

export const sfx = {
  enabled() {
    loadPref();
    arm();
    return !muted;
  },
  toggle() {
    loadPref();
    muted = !muted;
    savePref();
    arm();
    return !muted;
  },
  click() { tone("square", 900, 0, 0.04, 0, 0.5); },
  move() { tone("triangle", 500, 300, 0.09, 0, 0.7); },
  combat() { burst(0.16, 0, 0.8); tone("sawtooth", 160, 70, 0.13, 0, 0.7); },
  city() {
    tone("triangle", 523.25, 0, 0.35, 0, 0.6);
    tone("triangle", 659.25, 0, 0.35, 0.05, 0.6);
    tone("triangle", 783.99, 0, 0.35, 0.1, 0.6);
  },
  tech() {
    tone("sine", 587.33, 0, 0.12, 0, 0.7);
    tone("sine", 739.99, 0, 0.12, 0.09, 0.7);
    tone("sine", 880, 0, 0.16, 0.18, 0.7);
  },
  victory() {
    const seq = [[523.25, 0, 0.12], [587.33, 0.13, 0.12], [659.25, 0.26, 0.12], [783.99, 0.39, 0.12], [1046.5, 0.52, 0.5]];
    for (const [f, at, d] of seq) tone("triangle", f, 0, d, at, 0.7);
  },
  defeat() {
    const seq = [[440, 0, 0.2], [392, 0.22, 0.2], [349.23, 0.44, 0.2], [293.66, 0.66, 0.5]];
    for (const [f, at, d] of seq) tone("sine", f, 0, d, at, 0.7);
  },
};
