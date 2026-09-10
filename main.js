import { civApp } from "./apps/civ/app.js";

const root = document.getElementById("app");
let cleanup = null;

function start() {
  if (cleanup) { cleanup(); cleanup = null; }
  root.innerHTML = "";
  cleanup = civApp.mount(root) || null;
}

start();
