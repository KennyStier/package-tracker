import { identifyCarrier } from "./carriers.js";

const input = document.getElementById("input");
const button = document.getElementById("go");
const status = document.getElementById("status");
const form = document.getElementById("form");
const settings = document.getElementById("settings");

let disabled = new Set();
let currentMatch = null;

function refresh() {
  currentMatch = identifyCarrier(input.value, disabled);
  if (currentMatch) {
    status.className = "status match";
    status.innerHTML = `Detected <span class="name">${currentMatch.carrier.name}</span> — press Track.`;
    button.disabled = false;
  } else {
    status.className = "status";
    status.textContent = input.value.trim()
      ? "No carrier recognized for that number."
      : "";
    button.disabled = true;
  }
}

input.addEventListener("input", refresh);

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentMatch) return;
  chrome.tabs.create({ url: currentMatch.url });
  window.close();
});

settings.addEventListener("click", () => chrome.runtime.openOptionsPage());

chrome.storage.sync.get("disabledCarriers").then(({ disabledCarriers = [] }) => {
  disabled = new Set(disabledCarriers);
  refresh();
});
