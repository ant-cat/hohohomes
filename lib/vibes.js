// Quick one-tap tags for a house. Shared by the API and the map.
export const VIBES = [
  { id: "music", emoji: "🎶", label: "Music Sync" },
  { id: "inflatables", emoji: "🎈", label: "Inflatable Jungle" },
  { id: "griswold", emoji: "✨", label: "Clark Griswold" },
  { id: "cozy", emoji: "🕯️", label: "Classic & Cozy" },
];

// "Worth the Drive": a positive-only vote. Enough of them make a house a Showstopper.
// Nothing ever ranks a house down; smaller displays just stay lights.
export const WOW = "wow";
export const SHOWSTOPPER_VOTES = 3;
export const isShowstopper = (p) => (p.w || 0) >= SHOWSTOPPER_VOTES;

const IDS = new Set([...VIBES.map((v) => v.id), WOW]);

export function cleanVibes(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((v) => typeof v === "string" && IDS.has(v)))];
}

// A house counts as "lit" if someone confirmed it within this window.
export const FRESH_MS = 72 * 60 * 60 * 1000;

// Houses stay lit on the map. Every vote makes one shine a little brighter: a "Lit tonight" tap,
// a "Worth the Drive" vote, or someone else adding the same house. The curve is gentle at the
// top, so one vote shows, a well-loved house stands out, and a busy street doesn't blow out.
export const FULL_GLOW_VOTES = 12;
export const votesFor = (p) => Math.max(0, (p.c || 1) - 1) + (p.lc || 0) + (p.w || 0);
export const glowFor = (p) => Math.min(1, Math.log2(1 + votesFor(p)) / Math.log2(1 + FULL_GLOW_VOTES));

export function lastLit(p) {
  return p.l || p.u || p.t || 0;
}
