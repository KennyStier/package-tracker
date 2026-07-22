# Package Tracker

A Chrome/Brave (Manifest V3) extension that recognizes carrier tracking numbers
and jumps straight to the carrier's tracking page — no more copy‑pasting into a
carrier website.

Two entry points:

- **Address bar / search** — type or paste a tracking number into the omnibox.
  When it resolves to a search (Google, Bing, Yahoo, DuckDuckGo, Ecosia, Brave,
  Startpage, Qwant), the extension detects the carrier and redirects the tab to
  the tracking page before the search results load.
- **Toolbar popup** — click the extension icon, paste a number, and it opens the
  matching carrier page in a new tab. Live‑detects the carrier as you type.

Every carrier can be toggled on/off from the **Settings** page (gear link in the
popup) — handy if a pattern ever collides with something you actually search for.

## Supported carriers

**US:** UPS · USPS · FedEx · DHL · Amazon Logistics\* · OnTrac (+ LaserShip) ·
Pirate Ship · Tusk · UniUni

**Cross‑border e‑commerce:** YunExpress · 4PX · Cainiao / AliExpress (`LP…CN`)

**International postal** (routed by the UPU S10 country suffix, check‑digit
validated): USPS `US` · Canada Post `CA` · Royal Mail `GB` · Australia Post `AU`
· Deutsche Post/DHL `DE` · La Poste `FR` · PostNL `NL` · Japan Post `JP` ·
China Post/Cainiao `CN`

\* Amazon Logistics `TBA…` numbers usually only resolve while you're signed in to
Amazon in the same browser.

Loose numeric formats are validated with their real check digits so random
numbers don't false‑match: DHL 10‑digit air waybills (mod‑7), USPS IMpb
(MOD‑10), and every S10 international number (UPU check digit). A 20/22‑digit
number that fails the USPS checksum falls through to FedEx.

## Files

| File            | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `manifest.json` | MV3 manifest (module service worker, popup, options page)     |
| `carriers.js`   | **Single source of truth**: carrier patterns, checksums, URLs |
| `background.js` | Service worker: intercepts search navigations and redirects   |
| `popup.html/js` | Toolbar popup UI                                              |
| `settings.html/js` | Per‑carrier enable/disable, stored in `chrome.storage.sync` |
| `icon.svg`      | Editable source for the toolbar/store icon                    |
| `icon48/128.png` | Rendered icons referenced by the manifest                    |
| `logos/`        | Bundled carrier brand logos shown on the settings page        |
| `test/`         | Node test suite for `carriers.js`                             |

`carriers.js` is a plain ES module with no `chrome.*` calls, so it is unit
tested directly under Node.

The icon PNGs are rendered from `icon.svg` with `rsvg-convert -w 128 icon.svg
-o icon128.png` (and `-w 48` for `icon48.png`). Carrier logos in `logos/` come
from Brandfetch and are bundled so the settings page works offline with no
remote requests; a carrier with no bundled logo falls back to a colored
initials monogram.

## Install (development)

1. Open `brave://extensions` (or `chrome://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select this folder.

## Develop & test

```sh
npm test        # runs node --test against test/carriers.js
```

No dependencies — the tests use Node's built‑in runner (Node 18+).

## Adding a carrier

All carrier logic lives in `carriers.js`. To add one, append an object to the
`carriers` array:

```js
{
  id: "my-carrier",          // stable id; groups entries for the settings toggle
  name: "My Carrier",        // shown in the popup and settings
  example: "MC123456789",    // sample number for the settings UI
  pattern: /^MC\d{9}$/i,     // must be anchored (^…$)
  // Optional: return false to let the number fall through to the next carrier.
  // validate: (num) => checkDigitIsValid(num),
  url: (num) => `https://mycarrier.com/track?no=${num}`,
}
```

Guidelines:

- **Anchor the pattern** (`^…$`) and keep it as specific as possible. Prefer a
  distinctive prefix; add a `validate` check‑digit function for purely numeric
  formats so they don't swallow other carriers' numbers.
- **Order matters** — carriers are matched top‑to‑bottom, first match wins. Put
  specific patterns above loose ones.
- For UPU S10 postal numbers (`XX#########YY`) use the `s10(id, name, suffix, url)`
  helper — it wires up the pattern and check‑digit validation for you.
- Add a case to `test/carriers.test.js` and run `npm test`.

The tracking URL should accept the number as a query param or path segment.
For JS single‑page tracking sites, confirm the real deep‑link by submitting a
number on the live site and copying the resulting address‑bar URL — don't guess
the parameter name.

## Package for the Chrome Web Store

Zip only the runtime files (exclude dev files):

```sh
zip -r web-tracking.zip \
  manifest.json background.js carriers.js \
  popup.html popup.js settings.html settings.js \
  icon48.png icon128.png logos
```

Carrier logos in `logos/` are bundled (downloaded from Brandfetch), so the
settings page works offline with no remote requests.

## License

MIT — see [LICENSE](LICENSE).
