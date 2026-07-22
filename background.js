import { extractQuery, identifyCarrier } from "./carriers.js";

// Cache the set of user-disabled carrier ids, refreshed when settings change.
// Kept as a promise so a navigation on a cold-started worker awaits the load.
let disabledPromise = loadDisabled();

async function loadDisabled() {
  const { disabledCarriers = [] } = await chrome.storage.sync.get("disabledCarriers");
  return new Set(disabledCarriers);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.disabledCarriers) {
    disabledPromise = loadDisabled();
  }
});

// Intercept navigations to search engines and redirect recognized tracking
// numbers to the carrier's tracking page.
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only act on top-level navigations.
  if (details.frameId !== 0) return;

  const query = extractQuery(details.url);
  if (!query) return;

  const disabled = await disabledPromise;
  const match = identifyCarrier(query, disabled);
  if (match) {
    chrome.tabs.update(details.tabId, { url: match.url });
  }
});
