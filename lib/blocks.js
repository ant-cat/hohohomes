// Lit blocks: "I see lights here" from a moving car lights up the stretch of street you're on,
// with no address and no exact house. Shared by the API and the map.
//
// Block shape:
//   id
//   s   street name ("Oak St"), or "" when the road has no name in the map data
//   r   hundred block (1400 for "1400 block"), when an address nearby said so
//   g   the stretch of street: [[lng, lat], ...], 2 to MAX_POINTS points, about 150 m long
//   c   how many people saw lights here (one per device)
//   t   first tap, u last tap
//   by  device keys that tapped (private, never sent to browsers)
//   k   undo receipts (private)
//
// A block stays until someone pins a house on it: a new house within TAKEOVER_METERS of the
// stretch (or pinned from the block's own card) takes over, and the block leaves the map.

import { inUSA, roundCoord } from "./region";

export const MAX_POINTS = 12;
export const MAX_LENGTH_M = 400;
// A tap counts toward a block on the same street when it's this close to the stretch.
export const MERGE_METERS = 45;
// The tap must be near the stretch it sends (GPS on the road, the stretch around it).
export const TAP_NEAR_METERS = 90;
// A house this close to a block's stretch takes over from it.
export const TAKEOVER_METERS = 30;
export const STREET_MAX = 60;
const MAX_KEYS = 40;

const M_PER_DEG = 111320;

// Flat x/y meters around an origin. Fine at street scale.
function projector(origin) {
  const kx = M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180);
  return ([lng, lat]) => [(lng - origin.lng) * kx, (lat - origin.lat) * M_PER_DEG];
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Meters from a spot ({ lat, lng }) to the nearest point of a stretch.
export function metersToLine(spot, g) {
  if (!Array.isArray(g) || !g.length) return Infinity;
  const to = projector(spot);
  const pts = g.map(to);
  if (pts.length === 1) return Math.hypot(pts[0][0], pts[0][1]);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, segDist(0, 0, ...pts[i - 1], ...pts[i]));
  return best;
}

export function lineLength(g) {
  if (!g || g.length < 2) return 0;
  const to = projector({ lng: g[0][0], lat: g[0][1] });
  const pts = g.map(to);
  let m = 0;
  for (let i = 1; i < pts.length; i++) m += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return m;
}

// The point halfway along the stretch, as { lat, lng }: the block's cell and card go by it.
export function midpoint(g) {
  if (g.length === 1) return { lng: g[0][0], lat: g[0][1] };
  const to = projector({ lng: g[0][0], lat: g[0][1] });
  const pts = g.map(to);
  const lens = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let left = total / 2;
  for (let i = 1; i < g.length; i++) {
    const l = lens[i - 1];
    if (left <= l || i === g.length - 1) {
      const t = l ? Math.min(1, left / l) : 0;
      return { lng: g[i - 1][0] + t * (g[i][0] - g[i - 1][0]), lat: g[i - 1][1] + t * (g[i][1] - g[i - 1][1]) };
    }
    left -= l;
  }
  return { lng: g[0][0], lat: g[0][1] };
}

// Street names come from map data on the phone, so tidy them like any typed text.
export function cleanStreet(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, STREET_MAX);
}

// "Oak Street" and "oak st" are the same street.
const SUFFIX = { street: "st", avenue: "ave", road: "rd", drive: "dr", lane: "ln", court: "ct", boulevard: "blvd", place: "pl", circle: "cir", terrace: "ter", parkway: "pkwy", highway: "hwy", trail: "trl" };
export function sameStreet(a, b) {
  const norm = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/[.,']/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => SUFFIX[w] || w)
      .join(" ");
  return norm(a) === norm(b);
}

// Checks what a phone sent: { lat, lng (the tap), street, hundred, line }. Returns the clean
// block parts, or { error }.
export function checkBlock(body) {
  const lat = Number(body && body.lat);
  const lng = Number(body && body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "Missing location." };
  if (!inUSA(lat, lng)) return { error: "For now HoHoHomes only covers the United States." };
  const raw = body.line;
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > MAX_POINTS) return { error: "Couldn't tell which street that is." };
  const g = [];
  for (const p of raw) {
    const x = Number(p && p[0]);
    const y = Number(p && p[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !inUSA(y, x)) return { error: "Couldn't tell which street that is." };
    g.push([roundCoord(x), roundCoord(y)]);
  }
  const len = lineLength(g);
  if (len < 5 || len > MAX_LENGTH_M) return { error: "Couldn't tell which street that is." };
  if (metersToLine({ lat, lng }, g) > TAP_NEAR_METERS) return { error: "Couldn't tell which street that is." };
  const h = Number(body.hundred);
  const r = Number.isInteger(h) && h >= 0 && h < 100000 && h % 100 === 0 ? h : null;
  return { lat: roundCoord(lat), lng: roundCoord(lng), street: cleanStreet(body.street), hundred: r, line: g };
}

export function publicBlock(b) {
  const { k, by, ...rest } = b;
  return rest;
}

// One tap. A tap on the same street near a block counts toward it (once per device);
// otherwise it starts a new block. Returns { block, merged, counted, receipt }.
export function tapBlock(blocks, now, { lat, lng, street, hundred, line, key, token, expires }, maxBlocks = 3000) {
  let target = null;
  let best = MERGE_METERS;
  for (const b of blocks) {
    if (!sameStreet(b.s, street)) continue;
    const d = Math.min(metersToLine({ lat, lng }, b.g), metersToLine(midpoint(line), b.g));
    if (d <= best) {
      best = d;
      target = b;
    }
  }
  const receipt = { t: token, e: expires, at: now, h: key };
  if (target) {
    const by = (target.by ||= []);
    if (by.includes(key)) {
      // The same phone again: thanks, but it doesn't count twice.
      return { block: target, merged: true, counted: false, receipt: null };
    }
    if (by.length < MAX_KEYS) by.push(key);
    receipt.pu = target.u || null;
    target.c = (target.c || 1) + 1;
    target.u = now;
    if (!target.r && hundred !== null) target.r = hundred;
    if (!target.s && street) target.s = street;
    target.k = [...(target.k || []), receipt].slice(-20);
    return { block: target, merged: true, counted: true, receipt };
  }
  if (blocks.length >= maxBlocks) {
    const e = new Error("This area of the map is full for now.");
    e.status = 503;
    throw e;
  }
  const block = {
    id: `b${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    s: street,
    g: line,
    c: 1,
    t: now,
    u: now,
    by: [key],
    k: [receipt],
  };
  if (hundred !== null) block.r = hundred;
  blocks.push(block);
  return { block, merged: false, counted: true, receipt };
}

// Takes one tap back out. Returns the block, or null if it's gone.
export function untapBlock(blocks, token) {
  for (const b of blocks) {
    const receipt = b.k && b.k.find((r) => r.t === token);
    if (!receipt) continue;
    b.k = b.k.filter((r) => r !== receipt);
    if (!b.k.length) delete b.k;
    if (b.by) b.by = b.by.filter((h) => h !== receipt.h);
    b.c = (b.c || 1) - 1;
    if (b.c <= 0) {
      blocks.splice(blocks.indexOf(b), 1);
      return null;
    }
    if (b.u === receipt.at && receipt.pu) b.u = receipt.pu;
    return b;
  }
  const e = new Error("Too late to change that one.");
  e.status = 410;
  throw e;
}

// A new house takes over the blocks it sits on (and the one it was pinned from, by id).
// onlyFrom: the house was already on the map, so only the block it was pinned from goes.
// Returns the blocks taken off, so an undo of that report can put them back.
export function takeOver(blocks, spot, fromId, onlyFrom = false) {
  const gone = [];
  for (let i = blocks.length - 1; i >= 0; i--) {
    const b = blocks[i];
    if (b.id === fromId || (!onlyFrom && metersToLine(spot, b.g) <= TAKEOVER_METERS)) {
      gone.push(b);
      blocks.splice(i, 1);
    }
  }
  return gone;
}

// How bright a block glows, 0 to 1, on the same curve as houses (lib/vibes.js glowFor).
export const FULL_BLOCK_VOTES = 12;
export const blockGlow = (b) => Math.min(1, Math.log2(1 + Math.max(0, (b.c || 1) - 1)) / Math.log2(1 + FULL_BLOCK_VOTES));

// "Oak St, 1400 block", "Oak St", or a plain stand-in when the road has no name.
export function blockTitle(b) {
  if (b.s && b.r !== undefined && b.r !== null) return `${b.s}, ${b.r} block`;
  if (b.s) return b.s;
  return "A lit stretch of street";
}
