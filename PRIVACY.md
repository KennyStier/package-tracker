# Privacy Policy — Package Tracker

_Last updated: 2026-07-21_

Package Tracker is designed to collect **no personal data**.

## What the extension does

- It watches for navigations to supported search engines and checks whether the
  search query is a shipping tracking number. If it is, it redirects the tab to
  the matching carrier's tracking page.
- The tracking-number check happens entirely on your device. Queries are
  inspected in memory and are never logged, stored, or transmitted.

## Data collection

- **We collect nothing.** No analytics, no telemetry, no accounts, no servers.
  The extension has no backend and makes no network requests of its own.
- Your **per-carrier on/off preferences** are stored with `chrome.storage.sync`,
  which keeps them locally and lets Chrome sync them across your own signed-in
  browsers. This data stays within your Google/Chrome account; the developer has
  no access to it.

## Permissions

- **webNavigation** — to detect when a search query is a tracking number so it
  can be redirected. The extension only inspects the search query on supported
  search-engine URLs; it does not read or retain your browsing history.
- **storage** — to save your enabled/disabled carrier preferences on your device.

The extension requests **no host permissions** and contains **no remote code**.

## Contact

Questions: open an issue at
https://github.com/KennyStier/package-tracker/issues
