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
