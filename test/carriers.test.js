import { test } from "node:test";
import assert from "node:assert/strict";
import { identifyCarrier, extractQuery, carrierList } from "../carriers.js";

const name = (q, disabled) => {
  const m = identifyCarrier(q, disabled);
  return m ? m.carrier.name : null;
};
const url = (q) => {
  const m = identifyCarrier(q);
  return m ? m.url : null;
};

// Build a valid 22-digit USPS IMpb using the same 3/1 MOD-10 weighting.
function uspsWithCheck(prefix21) {
  const d = prefix21.split("").map(Number);
  let sum = 0;
  let w = 3;
  for (let i = d.length - 1; i >= 0; i--) {
    sum += d[i] * w;
    w = w === 3 ? 1 : 3;
  }
  return prefix21 + String((10 - (sum % 10)) % 10);
}

// Build a valid S10 number: 2 letters + 8 serial digits + check digit + suffix.
function s10(prefix2, serial8, suffix2) {
  const weights = [8, 6, 4, 2, 3, 5, 9, 7];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(serial8[i]) * weights[i];
  let c = 11 - (sum % 11);
  if (c === 10) c = 0;
  else if (c === 11) c = 5;
  return `${prefix2}${serial8}${c}${suffix2}`;
}

test("UPS", () => {
  assert.equal(name("1Z999AA10123456784"), "UPS");
  assert.equal(name("1z999aa10123456784"), "UPS");
});

test("USPS domestic IMpb (MOD-10 gated)", () => {
  const valid = uspsWithCheck("940010000000000000000");
  assert.equal(name(valid), "USPS");
  // A bad checksum must fall through to FedEx (same 22-digit length).
  const bad = valid.slice(0, 21) + ((Number(valid[21]) + 1) % 10);
  assert.equal(name(bad), "FedEx");
});

test("FedEx 12-digit", () => {
  assert.equal(name("123456789012"), "FedEx");
});

test("DHL mod-7 air waybill", () => {
  assert.equal(name("1234567891"), "DHL"); // 123456789 % 7 === 1
  assert.equal(name("1234567890"), null); // wrong check digit
});

test("Amazon Logistics", () => {
  assert.equal(name("TBA000000000000"), "Amazon Logistics");
  assert.equal(
    url("TBA000000000000"),
    "https://track.amazon.com/tracking/TBA000000000000",
  );
});

test("OnTrac (+ legacy LaserShip)", () => {
  assert.equal(name("D00000000000000"), "OnTrac");
  assert.equal(name("1LS000000000000"), "OnTrac");
  assert.equal(name("LX00000000"), "OnTrac");
  assert.equal(
    url("D00000000000000"),
    "https://www.ontrac.com/tracking/?number=D00000000000000",
  );
});

test("UniUni", () => {
  assert.equal(name("UUS0000000000000000"), "UniUni");
  assert.equal(name("UNIA1234567890"), "UniUni");
});

test("YunExpress", () => {
  assert.equal(name("YT0000000000000000"), "YunExpress");
});

test("4PX", () => {
  assert.equal(name("4PX0000000000000CN"), "4PX");
  assert.equal(
    url("4PX0000000000000CN"),
    "https://track.4px.com/?locale=en_US#/result/0/4PX0000000000000CN",
  );
});

test("S10 international routes by country suffix", () => {
  assert.equal(name(s10("RA", "12345678", "US")), "USPS");
  assert.equal(name(s10("RA", "12345678", "CA")), "Canada Post");
  assert.equal(name(s10("RA", "12345678", "GB")), "Royal Mail");
  assert.equal(name(s10("RA", "12345678", "AU")), "Australia Post");
  assert.equal(name(s10("RA", "12345678", "DE")), "Deutsche Post / DHL");
  assert.equal(name(s10("RA", "12345678", "FR")), "La Poste");
  assert.equal(name(s10("RA", "12345678", "NL")), "PostNL");
  assert.equal(name(s10("RA", "12345678", "JP")), "Japan Post");
  assert.equal(name(s10("LP", "12345678", "CN")), "China Post / Cainiao");
});

test("S10 with bad check digit does not match", () => {
  assert.equal(name("RA123456789GB"), null); // 9 is not the valid check digit
});

test("S10 with unknown country suffix does not redirect", () => {
  assert.equal(name(s10("RA", "12345678", "ZZ")), null);
});

test("Canada Post domestic 16-digit", () => {
  assert.equal(name("1234567890123456"), "Canada Post");
});

test("tokenized and spaced queries", () => {
  assert.equal(name("track 1Z999AA10123456784 please"), "UPS");
  assert.equal(name("1Z 999 AA1 0123 4567 84"), "UPS");
});

test("garbage does not match", () => {
  assert.equal(name("hello world"), null);
  assert.equal(name("UUS123"), null);
});

test("disabling a carrier suppresses it", () => {
  const off = new Set(["ups"]);
  assert.equal(name("1Z999AA10123456784", off), null);
  // Disabling USPS lets a valid IMpb fall through to FedEx.
  const valid = uspsWithCheck("940010000000000000000");
  assert.equal(name(valid, new Set(["usps"])), "FedEx");
});

test("extractQuery pulls the query from search engines", () => {
  assert.equal(
    extractQuery("https://www.google.com/search?q=1Z999AA10123456784"),
    "1Z999AA10123456784",
  );
  assert.equal(extractQuery("https://search.brave.com/search?q=hello"), "hello");
  assert.equal(extractQuery("https://example.com/?q=x"), null);
});

test("carrierList ids are unique", () => {
  const ids = carrierList.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});
