// Public displays: farms, parks, businesses, churches and drive-throughs that put on a show.
// Shared by the API, the map and the city pages.
//
// A home pin never carries a name. A public display does, but its name stays private until a
// second, separate visitor confirms it, so nobody can put a name on a neighbor's house by
// themselves. Until then the pin looks like any other house.

export const NAME_MAX = 50;
// A display added within this distance of another one confirms it instead of making a second.
export const CONFIRM_METERS = 100;

// Confirmed, public displays only. Public pins carry d: { n: name, ok: 1 } once confirmed,
// or d: { p: 1 } (no name) while they wait for a second look.
export const isDisplay = (p) => Boolean(p && p.d && p.d.ok && p.d.n);
export const isPendingDisplay = (p) => Boolean(p && p.d && !p.d.ok);

// A short, plain list. It catches the obvious, not the determined; HIDDEN_PIN_IDS and the
// owner's remove button handle the rest. Words that are never part of a real place's name match anywhere; short ones that hide inside
// real names (Hancock, Grape, Sussex) only match as a whole word.
const ANYWHERE = ["fuck", "fuk", "shit", "bitch", "cunt", "asshole", "whore", "slut", "nigg", "retard", "porn", "pussy"];
const WHOLE_WORD = new Set(["dick", "dicks", "cock", "cocks", "sex", "sexy", "rape", "fag", "fags", "kkk", "nazi", "ass", "penis", "tits", "boobs"]);

function looksBad(name) {
  const plain = name
    .toLowerCase()
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t");
  const flat = plain.replace(/[^a-z]/g, "");
  if (ANYWHERE.some((w) => flat.includes(w))) return true;
  return plain.split(/[^a-z]+/).some((w) => WHOLE_WORD.has(w));
}

// Returns { name } or { error }. An empty name means "not a display after all".
export function checkName(raw) {
  if (typeof raw !== "string") return { name: "" };
  const name = raw
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX);
  if (!name) return { name: "" };
  if (name.length < 3) return { error: "Give it a name, like Sunny Acres Farm." };
  if (looksBad(name)) return { error: "Try a friendlier name." };
  if (/https?:|www\.|\.(com|net|org|io|app)\b/i.test(name)) return { error: "Just the name, no links." };
  if (/\d{3}\D{0,3}\d{3}\D{0,3}\d{4}/.test(name)) return { error: "Just the name, no phone numbers." };
  // "123 Oak St" is a home address, not a display's name.
  if (/^\d+\s+\S+/.test(name) && /\b(st|street|rd|road|ave|avenue|dr|drive|ln|lane|ct|court|way|blvd|cir|circle|pl|place|ter|trl)\b\.?$/i.test(name)) {
    return { error: "Use the display's name, not an address." };
  }
  return { name };
}

// --- Season dates -----------------------------------------------------------
//
// A display can say when it runs: f (first night) and e (last night) as YYYY-MM-DD, and h, short
// hours like "6-10 PM". All optional. Before its first night a display looks lighter on the map
// and its card says when it starts; after its last night it looks lighter and says it's over.

export const HOURS_MAX = 30;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function realDay(s) {
  if (typeof s !== "string" || !DAY_RE.test(s)) return "";
  const [y, m, d] = s.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? s : "";
}

// Today in New York, as YYYY-MM-DD, so a display flips on the evening it starts across the US mainland.
export function today(ms = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ms));
}

// Returns { when: { f?, e?, h? } } or { error }. Empty input means "no dates".
export function checkWhen(raw) {
  if (!raw || typeof raw !== "object") return { when: {} };
  const when = {};
  if (raw.from) {
    when.f = realDay(raw.from);
    if (!when.f) return { error: "That start date doesn't look right." };
  }
  if (raw.to) {
    when.e = realDay(raw.to);
    if (!when.e) return { error: "That end date doesn't look right." };
  }
  if (when.f && when.e && when.e < when.f) return { error: "The last night comes before the first one." };
  for (const day of [when.f, when.e]) {
    if (!day) continue;
    const gap = Math.abs(Date.parse(day) - Date.parse(today()));
    if (gap > 400 * 86400000) return { error: "Pick dates in this holiday season." };
  }
  if (typeof raw.hours === "string") {
    const h = raw.hours.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, HOURS_MAX);
    if (h) {
      if (/https?:|www\.|\.(com|net|org|io|app)\b/i.test(h) || /\d{3}\D{0,3}\d{3}\D{0,3}\d{4}/.test(h) || looksBad(h)) {
        return { error: "Just the hours, like 6-10 PM." };
      }
      when.h = h;
    }
  }
  return { when };
}

// "soon" before the first night, "over" after the last, "on" in between, "" with no dates.
export function displayPhase(d, now = Date.now()) {
  if (!d || (!d.f && !d.e)) return "";
  const t = today(now);
  if (d.f && t < d.f) return "soon";
  if (d.e && t > d.e) return "over";
  return "on";
}

export function shortDay(s) {
  const [, m, d] = s.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

// "Nov 27 – Jan 3", "From Dec 1" or "Through Jan 3".
export function dateRange(d) {
  if (!d) return "";
  if (d.f && d.e) return `${shortDay(d.f)} – ${shortDay(d.e)}`;
  if (d.f) return `From ${shortDay(d.f)}`;
  if (d.e) return `Through ${shortDay(d.e)}`;
  return "";
}
