// Shared carrier definitions + matching logic.
// Imported by the background service worker, the popup, and the settings page.
// This module is pure (no chrome.* calls) so it can be unit tested under Node.

// ---- Checksum validators -------------------------------------------------

// DHL Express 10-digit air waybill: 10th digit == first 9 digits mod 7.
function dhlAwbCheck(num) {
  if (!/^\d{10}$/.test(num)) return false;
  return Number(num.slice(0, 9)) % 7 === Number(num[9]);
}

// USPS domestic IMpb (USS-128 MOD-10, 3/1 weighting from the right).
function uspsMod10(num) {
  const digits = num.split("").map(Number);
  const check = digits.pop();
  let sum = 0;
  let weight = 3;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += digits[i] * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === check;
}

// UPU S10 check digit over the 9-digit serial (8 digits + 1 check).
function s10Check(nineDigits) {
  const d = nineDigits.replace(/[^0-9]/g, "");
  if (d.length !== 9) return false;
  const weights = [8, 6, 4, 2, 3, 5, 9, 7];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * weights[i];
  let c = 11 - (sum % 11);
  if (c === 10) c = 0;
  else if (c === 11) c = 5;
  return c === Number(d[8]);
}

// Build an S10 carrier entry for a given 2-letter origin country suffix.
function s10(id, name, suffix, url) {
  return {
    id,
    name,
    example: `RA123456785${suffix}`,
    pattern: new RegExp(`^[A-Z]{2}\\d{9}${suffix}$`, "i"),
    validate: (num) => s10Check(num.slice(2, 11)),
    url,
  };
}

// ---- Carriers ------------------------------------------------------------
// Each carrier: { id, name, example, pattern, validate?(num)->bool, url(num) }
// `id` groups entries for the settings toggles (several entries can share one
// id, e.g. USPS domestic + international). `validate` runs after `pattern`
// matches; a failing validate lets the number fall through to the next carrier.

export const carriers = [
  {
    id: "ups",
    name: "UPS",
    example: "1Z999AA10123456784",
    pattern: /^1Z[0-9A-Z]{16}$/i,
    url: (num) => `https://www.ups.com/track?tracknum=${num}`,
  },
  {
    id: "usps",
    name: "USPS",
    example: "9400100000000000000000",
    // Domestic IMpb (20 or 22 digits), validated by MOD-10.
    pattern: /^(\d{20}|\d{22})$/,
    validate: uspsMod10,
    url: (num) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`,
  },
  s10(
    "usps",
    "USPS",
    "US",
    (num) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${num}`,
  ),
  {
    id: "fedex",
    name: "FedEx",
    example: "123456789012",
    // 12, 15, 20, or 22 digits. After USPS so valid IMpb goes to USPS.
    pattern: /^(\d{12}|\d{15}|\d{20}|\d{22})$/,
    url: (num) => `https://www.fedex.com/fedextrack/?trknbr=${num}`,
  },
  {
    id: "amazon",
    name: "Amazon Logistics",
    example: "TBA000000000000",
    // TBA/TBM/TBC + digits. Note: usually only resolves while signed in to Amazon.
    pattern: /^TB[A-Z]\d{10,13}$/i,
    url: (num) => `https://track.amazon.com/tracking/${num}`,
  },
  {
    id: "ontrac",
    name: "OnTrac",
    example: "D00000000000000",
    // OnTrac C/D + 14 digits, plus legacy LaserShip prefixes (now on OnTrac).
    pattern: /^([CD]\d{14}|1LS[0-9A-Z]{6,}|LX\d{6,})$/i,
    url: (num) => `https://www.ontrac.com/tracking/?number=${num}`,
  },
  {
    id: "pirate-ship",
    name: "Pirate Ship",
    example: "AHOY12ABCD",
    pattern: /^AHOY[0-9A-Z]{6,}$/i,
    url: (num) =>
      `https://a1.asendiausa.com/tracking/?trackingkey=A6320AE0-4D36-45E7-BF95-893D6DE3F2D1&trackingnumber=${num}`,
  },
  {
    id: "tusk",
    name: "Tusk",
    example: "TUSK99XY01",
    pattern: /^TUSK[0-9A-Z]{6,}$/i,
    url: (num) => `https://shipmenttracking.tusklogistics.com/?trackingNumber=${num}`,
  },
  {
    id: "uniuni",
    name: "UniUni",
    example: "UUS0000000000000000",
    // UUS… (covers UUSC…) or UNIA… + alphanumeric serial. No public check digit.
    pattern: /^(UUS|UNIA)[0-9A-Z]{9,}$/i,
    url: (num) => `https://www.uniuni.com/tracking/?no=${num}`,
  },
  {
    id: "yunexpress",
    name: "YunExpress",
    example: "YT0000000000000000",
    pattern: /^YT\d{16}$/i,
    url: (num) => `https://www.yuntrack.com/parcelTracking?id=${num}`,
  },
  {
    id: "4px",
    name: "4PX",
    example: "4PX0000000000000CN",
    pattern: /^4PX[0-9A-Z]{6,}$/i,
    url: (num) => `https://track.4px.com/?locale=en_US#/result/0/${num}`,
  },
  {
    id: "dhl",
    name: "DHL",
    example: "1234567891",
    // Express 10-digit AWB (mod-7) or DHL eCommerce JJD/JD forms.
    pattern: /^(\d{10}|(JJD|JD)\d{15,18})$/i,
    validate: (num) => (/^\d{10}$/.test(num) ? dhlAwbCheck(num) : true),
    url: (num) =>
      `https://www.dhl.com/us-en/home/tracking/tracking-parcel.html?submit=1&tracking-id=${num}`,
  },

  // --- International postal, routed by S10 origin-country suffix ------------
  s10(
    "canada-post",
    "Canada Post",
    "CA",
    (num) =>
      `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${num}`,
  ),
  s10(
    "royal-mail",
    "Royal Mail",
    "GB",
    (num) => `https://www.royalmail.com/track-your-item#/tracking-results/${num}`,
  ),
  s10(
    "australia-post",
    "Australia Post",
    "AU",
    (num) => `https://auspost.com.au/mypost/track/details/${num}`,
  ),
  s10(
    "deutsche-post",
    "Deutsche Post / DHL",
    "DE",
    (num) =>
      `https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode=${num}`,
  ),
  s10(
    "la-poste",
    "La Poste",
    "FR",
    (num) =>
      `https://www.laposte.fr/particulier/outils/suivre-vos-envois?code=${num}`,
  ),
  s10(
    "postnl",
    "PostNL",
    "NL",
    (num) => `https://postnl.nl/tracktrace/?B=${num}`,
  ),
  s10(
    "japan-post",
    "Japan Post",
    "JP",
    (num) =>
      `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${num}&locale=en`,
  ),
  s10(
    "china-post",
    "China Post / Cainiao",
    "CN",
    // Cainiao's global tracker reliably resolves CN-origin and AliExpress LP…CN numbers.
    (num) => `https://global.cainiao.com/detail.htm?mailNoList=${num}`,
  ),

  {
    id: "canada-post",
    name: "Canada Post",
    example: "1234567890123456",
    // Canadian domestic parcels are 16 digits. Placed last so more specific
    // patterns win; the loosest rule here, hence a good disable candidate.
    pattern: /^\d{16}$/,
    url: (num) =>
      `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${num}`,
  },
];

// Distinct carriers in priority order — for the settings page toggles.
export const carrierList = (() => {
  const seen = new Set();
  const out = [];
  for (const c of carriers) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({ id: c.id, name: c.name, example: c.example });
  }
  return out;
})();

// Names in priority order, for display in the popup.
export const carrierNames = carrierList.map((c) => c.name);

const NO_DISABLED = new Set();

// ---- Matching ------------------------------------------------------------

function matchCandidate(candidate, disabledIds) {
  for (const carrier of carriers) {
    if (disabledIds.has(carrier.id)) continue;
    if (!carrier.pattern.test(candidate)) continue;
    if (carrier.validate && !carrier.validate(candidate)) continue;
    return { carrier, trackingNumber: candidate, url: carrier.url(candidate) };
  }
  return null;
}

// Identify a carrier from an arbitrary query. Tries the whole string (spaces
// stripped) and each individual token. `disabledIds` is an optional Set of
// carrier ids the user has turned off.
export function identifyCarrier(query, disabledIds = NO_DISABLED) {
  if (!query) return null;
  const raw = query.trim();
  if (!raw) return null;

  const candidates = [];
  const collapsed = raw.replace(/\s+/g, "");
  if (collapsed) candidates.push(collapsed);
  for (const token of raw.split(/\s+/)) {
    const cleaned = token.replace(/^[^0-9A-Za-z]+|[^0-9A-Za-z]+$/g, "");
    if (cleaned) candidates.push(cleaned);
  }

  for (const candidate of candidates) {
    const match = matchCandidate(candidate, disabledIds);
    if (match) return match;
  }
  return null;
}

// Extract a search query from common search-engine result URLs.
export function extractQuery(url) {
  try {
    const parsed = new URL(url);
    const searchEngines = [
      { host: /(^|\.)google\./, param: "q" },
      { host: /(^|\.)bing\.com$/, param: "q" },
      { host: /(^|\.)search\.yahoo\.com$/, param: "p" },
      { host: /(^|\.)duckduckgo\.com$/, param: "q" },
      { host: /(^|\.)ecosia\.org$/, param: "q" },
      { host: /(^|\.)search\.brave\.com$/, param: "q" },
      { host: /(^|\.)startpage\.com$/, param: "query" },
      { host: /(^|\.)qwant\.com$/, param: "q" },
    ];

    for (const engine of searchEngines) {
      if (engine.host.test(parsed.hostname)) {
        return parsed.searchParams.get(engine.param);
      }
    }
  } catch {
    // not a valid URL
  }
  return null;
}
