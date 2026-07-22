import { carrierList } from "./carriers.js";

// Bundled brand logos (downloaded from Brandfetch), keyed by carrier id.
const LOGOS = {
  ups: "logos/ups.svg",
  usps: "logos/usps.svg",
  fedex: "logos/fedex.svg",
  tusk: "logos/tusk.jpg",
  dhl: "logos/dhl.svg",
  amazon: "logos/amazon.webp",
  ontrac: "logos/ontrac.webp",
  "pirate-ship": "logos/pirate-ship.webp",
  uniuni: "logos/uniuni.webp",
  yunexpress: "logos/yunexpress.webp",
  "canada-post": "logos/canada-post.webp",
  "royal-mail": "logos/royal-mail.webp",
  "australia-post": "logos/australia-post.webp",
  "deutsche-post": "logos/deutsche-post.png",
  "la-poste": "logos/la-poste.webp",
  postnl: "logos/postnl.webp",
  "japan-post": "logos/japan-post.webp",
  "china-post": "logos/china-post.webp",
};

const grid = document.getElementById("grid");
const emptyMsg = document.getElementById("empty");
const search = document.getElementById("search");
const savedEl = document.getElementById("saved");

let disabled = new Set();

// Fallback monogram (initials) when a logo is missing or fails to load.
function initials(name) {
  const words = name.split(/[\s/]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}
function hue(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
function monogram(c) {
  const el = document.createElement("div");
  el.className = "mono";
  el.textContent = initials(c.name);
  el.style.background = `hsl(${hue(c.id)} 45% 42%)`;
  return el;
}

function logoEl(c) {
  const box = document.createElement("div");
  box.className = "logo";
  const src = LOGOS[c.id];
  if (src) {
    const img = new Image();
    img.src = src;
    img.alt = c.name;
    img.onerror = () => {
      box.textContent = "";
      box.appendChild(monogram(c));
    };
    box.appendChild(img);
  } else {
    box.appendChild(monogram(c));
  }
  return box;
}

async function save() {
  await chrome.storage.sync.set({ disabledCarriers: [...disabled] });
  savedEl.classList.add("show");
  setTimeout(() => savedEl.classList.remove("show"), 1000);
}

function render() {
  grid.textContent = "";
  for (const c of carrierList) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.search = (c.name + " " + c.example).toLowerCase();

    const meta = document.createElement("div");
    meta.className = "meta";
    const nm = document.createElement("div");
    nm.className = "name";
    nm.textContent = c.name;
    const ex = document.createElement("div");
    ex.className = "ex";
    ex.textContent = c.example;
    meta.append(nm, ex);

    const sw = document.createElement("label");
    sw.className = "switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !disabled.has(c.id);
    const slider = document.createElement("span");
    slider.className = "slider";
    input.addEventListener("change", () => {
      if (input.checked) disabled.delete(c.id);
      else disabled.add(c.id);
      save();
    });
    sw.append(input, slider);

    card.append(logoEl(c), meta, sw);
    grid.appendChild(card);
  }
  applyFilter();
}

function applyFilter() {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  for (const card of grid.children) {
    const match = !q || card.dataset.search.includes(q);
    card.hidden = !match;
    if (match) shown++;
  }
  emptyMsg.hidden = shown > 0;
}

search.addEventListener("input", applyFilter);

document.getElementById("enableAll").addEventListener("click", () => {
  disabled = new Set();
  save();
  render();
});
document.getElementById("disableAll").addEventListener("click", () => {
  disabled = new Set(carrierList.map((c) => c.id));
  save();
  render();
});

chrome.storage.sync.get("disabledCarriers").then(({ disabledCarriers = [] }) => {
  disabled = new Set(disabledCarriers);
  render();
});
