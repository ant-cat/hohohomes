// Small geometry helpers for snapping a GPS fix to a house, plus neighborhood names.

const M_PER_DEG = 111320;

export function metersBetween(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Flat x/y meters around an origin. Fine at house scale.
function projector(origin) {
  const kx = M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180);
  return {
    to: ([lng, lat]) => [(lng - origin.lng) * kx, (lat - origin.lat) * M_PER_DEG],
    from: ([x, y]) => ({ lng: origin.lng + x / kx, lat: origin.lat + y / M_PER_DEG }),
  };
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
  const x = ax + t * dx;
  const y = ay + t * dy;
  return [Math.hypot(px - x, py - y), x, y];
}

function inside(px, py, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function areaAndCentroid(ring) {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x0, y0] = ring[j];
    const [x1, y1] = ring[i];
    const f = x0 * y1 - x1 * y0;
    a += f;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  a /= 2;
  if (!a) return { area: 0, c: ring[0] };
  return { area: Math.abs(a), c: [cx / (6 * a), cy / (6 * a)] };
}

// Finds the building footprint closest to a GPS fix in the loaded map tiles.
// House-sized footprints snap to their middle; big buildings snap to the nearest wall.
// Returns null when nothing is close enough or the tiles aren't loaded yet.
export function snapToBuilding(map, lngLat, maxMeters = 35) {
  const layer = map.getLayer("building");
  if (!layer || !layer.source) return null;
  let features;
  try {
    features = map.querySourceFeatures(layer.source, layer.sourceLayer ? { sourceLayer: layer.sourceLayer } : {});
  } catch {
    return null;
  }
  const proj = projector(lngLat);
  let best = null;
  for (const f of features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const poly of polys) {
      const ring = poly[0].map(proj.to);
      if (ring.length < 3) continue;
      let d = Infinity;
      let near = null;
      if (inside(0, 0, ring)) {
        d = 0;
        near = [0, 0];
      } else {
        for (let i = 1; i < ring.length; i++) {
          const [sd, x, y] = distToSegment(0, 0, ...ring[i - 1], ...ring[i]);
          if (sd < d) {
            d = sd;
            near = [x, y];
          }
        }
      }
      if (d < maxMeters && (!best || d < best.d)) best = { d, ring, near };
    }
  }
  if (!best) return null;
  const { area, c } = areaAndCentroid(best.ring);
  const pt = area > 0 && area < 1200 ? c : best.near;
  return proj.from(pt);
}

// Neighborhood or street name for a spot, via Photon reverse geocoding.
// Cached in memory and in localStorage, and queued so we never hammer the service.
const names = new Map();
let queue = Promise.resolve();

function stored(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// scale "hood" names the neighborhood (for Hot Zones); "city" names the city (for the national view).
export function placeName(lng, lat, precision = 3, scale = "hood") {
  const key = `hh:place:${scale}:${lat.toFixed(precision)},${lng.toFixed(precision)}`;
  if (names.has(key)) return names.get(key);
  const saved = stored(key);
  if (saved !== null) {
    const p = Promise.resolve(saved);
    names.set(key, p);
    return p;
  }
  const p = (queue = queue
    .catch(() => {})
    .then(async () => {
      const res = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&limit=1&lang=en`);
      const data = await res.json();
      const f = data.features && data.features[0];
      const pr = (f && f.properties) || {};
      const name =
        scale === "city"
          ? pr.city || pr.county || pr.state || ""
          : pr.district || pr.locality || pr.street || pr.city || "";
      store(key, name);
      await new Promise((r) => setTimeout(r, 200));
      return name;
    }));
  p.catch(() => names.delete(key));
  names.set(key, p);
  return p;
}
