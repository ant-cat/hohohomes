// Finding the stretch of street you're on, for "Light up the block".
//
// The map's own tiles (OpenFreeMap, from OpenStreetMap) carry every named street as lines. Once
// the camera is over your GPS spot, this picks the nearest named street and cuts out about a
// block of it each way, so one tap from a moving car saves "Oak St, 1400 block" with no address.

import { sameStreet } from "../lib/blocks";

const M_PER_DEG = 111320;
// About a block each way from where you are.
const HALF_BLOCK_M = 75;
// Freeways and their ramps never have houses on them.
const SKIP_CLASS = new Set(["motorway", "trunk", "motorway_construction", "trunk_construction", "rail", "transit", "ferry", "path", "track", "bridleway"]);

function projector(origin) {
  const kx = M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180);
  return {
    to: ([lng, lat]) => [(lng - origin.lng) * kx, (lat - origin.lat) * M_PER_DEG],
    from: ([x, y]) => [origin.lng + x / kx, origin.lat + y / M_PER_DEG],
  };
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// Nearest point on a polyline: { d, i (segment index), t (0..1 along it), p }.
function nearestOn(pts, q) {
  let best = { d: Infinity, i: 0, t: 0, p: pts[0] };
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / len)) : 0;
    const p = [ax + t * dx, ay + t * dy];
    const d = dist(p, q);
    if (d < best.d) best = { d, i, t, p };
  }
  return best;
}

// Walks `meters` along a chain of points from its start, returning the points passed.
function walk(chain, meters) {
  const out = [chain[0]];
  let left = meters;
  for (let i = 1; i < chain.length && left > 0; i++) {
    const l = dist(chain[i - 1], chain[i]);
    if (l >= left) {
      const t = l ? left / l : 0;
      out.push([chain[i - 1][0] + t * (chain[i][0] - chain[i - 1][0]), chain[i - 1][1] + t * (chain[i][1] - chain[i - 1][1])]);
      left = 0;
    } else {
      out.push(chain[i]);
      left -= l;
    }
  }
  return { pts: out, left };
}

// Tiles cut long streets at their edges, and the tiles' name layer joins a street's pieces only
// within one tile. So when the walk runs off the end of one piece, carry on along another piece
// of the same street that starts (or ends) right there.
function extend(chain, pieces, used, left) {
  let pts = chain;
  for (let hop = 0; hop < 4 && left > 0; hop++) {
    const end = pts[pts.length - 1];
    let next = null;
    for (const piece of pieces) {
      if (used.has(piece)) continue;
      if (dist(piece[0], end) < 6) next = piece;
      else if (dist(piece[piece.length - 1], end) < 6) next = [...piece].reverse();
      if (next) {
        used.add(piece);
        break;
      }
    }
    if (!next) break;
    const w = walk(next, left);
    pts = [...pts, ...w.pts.slice(1)];
    left = w.left;
  }
  return pts;
}

// Keeps the shape with few points (Douglas-Peucker, ~2 m).
function simplify(pts, tol = 2) {
  if (pts.length <= 2) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let maxD = 0;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = nearestOn([a, b], pts[i]).d;
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= tol) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), tol).slice(0, -1), ...simplify(pts.slice(idx), tol)];
}

function lines(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

// The named street nearest a GPS fix in the loaded tiles, and about a block of it around you:
// { street, line: [[lng, lat], ...], meters (from you to the street) }. Null when no named street
// is within maxMeters or the tiles aren't loaded yet.
export function findStreet(map, lngLat, maxMeters = 45) {
  const ref = map.getLayer("highway_name_other") || map.getLayer("highway_minor");
  const source = (ref && ref.source) || "openmaptiles";
  let features;
  try {
    features = map.querySourceFeatures(source, { sourceLayer: "transportation_name" });
  } catch {
    return null;
  }
  const proj = projector(lngLat);
  const here = [0, 0];
  const named = [];
  for (const f of features) {
    const pr = f.properties || {};
    const name = pr["name:en"] || pr.name_en || pr.name || "";
    if (!name || SKIP_CLASS.has(pr.class)) continue;
    for (const coords of lines(f.geometry)) {
      if (coords.length < 2) continue;
      named.push({ name, pts: coords.map(proj.to) });
    }
  }
  let best = null;
  for (const n of named) {
    const near = nearestOn(n.pts, here);
    if (near.d <= maxMeters && (!best || near.d < best.near.d)) best = { ...n, near };
  }
  if (!best) return null;

  // Every piece of the same street, so the walk can cross tile edges.
  const pieces = named.filter((n) => sameStreet(n.name, best.name) && n.pts !== best.pts).map((n) => n.pts);
  const { i, p } = best.near;
  const ahead = [p, ...best.pts.slice(i)];
  const behind = [p, ...best.pts.slice(0, i).reverse()];
  const used = new Set();
  const a = walk(ahead, HALF_BLOCK_M);
  const fwd = extend(a.pts, pieces, used, a.left);
  const b = walk(behind, HALF_BLOCK_M);
  const back = extend(b.pts, pieces, used, b.left);
  const stretch = simplify([...back.reverse(), ...fwd.slice(1)]);
  // Drop repeated points the walk can leave at a joint.
  const clean = stretch.filter((q, k) => k === 0 || dist(q, stretch[k - 1]) > 0.5);
  if (clean.length < 2) return null;
  const line = clean.slice(0, 12).map((q) => proj.from(q).map((x) => Math.round(x * 1e5) / 1e5));
  return { street: best.name, line, meters: best.near.d };
}

// Addresses near a spot, via Photon reverse geocoding. Started as soon as GPS lands so it runs
// while the camera flies in. Gives up quickly: the block saves without a number rather than keep
// a driver waiting. Resolves to a list of Photon features (empty on any failure).
export async function nearbyAddresses(lngLat, ms = 2500) {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => ctl && ctl.abort(), ms);
  try {
    const url = `https://photon.komoot.io/reverse?lon=${lngLat.lng.toFixed(5)}&lat=${lngLat.lat.toFixed(5)}&limit=5&lang=en&radius=0.15`;
    const res = await fetch(url, ctl ? { signal: ctl.signal } : undefined);
    const data = await res.json();
    return Array.isArray(data.features) ? data.features : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// The hundred block ("1400") from those addresses. Only trusted when the address is on the same
// street the map found.
export function hundredFrom(features, street) {
  for (const f of features || []) {
    const pr = f.properties || {};
    const n = parseInt(pr.housenumber, 10);
    // Under 100 there is no "block" number worth saying.
    if (!Number.isFinite(n) || n < 100) continue;
    if (!street || !pr.street || !sameStreet(pr.street, street)) continue;
    return Math.floor(n / 100) * 100;
  }
  return null;
}
