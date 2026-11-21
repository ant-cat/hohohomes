// Quick one-tap tags for a house. Shared by the API and the map.
export const VIBES = [
  { id: "music", emoji: "🎶", label: "Music Sync" },
  { id: "inflatables", emoji: "🎈", label: "Inflatable Jungle" },
  { id: "griswold", emoji: "✨", label: "Clark Griswold" },
  { id: "cozy", emoji: "🕯️", label: "Classic & Cozy" },
];

const IDS = new Set(VIBES.map((v) => v.id));

export function cleanVibes(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((v) => typeof v === "string" && IDS.has(v)))];
}

// A house counts as "lit" if someone confirmed it within this window.
export const FRESH_MS = 72 * 60 * 60 * 1000;

export function lastLit(p) {
  return p.l || p.u || p.t || 0;
}
