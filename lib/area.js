import { readCells, readSummary } from "./pins";
import { cellsInBounds, NEAR_RADIUS_M } from "./region";
import { isShowstopper } from "./vibes";

// What a shared area link says about itself. Only ever totals for the area, never a house.
const MIN_HOUSES = 3; // below this, previews don't give a count, so one home can't be singled out

function meters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const s =
    Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function placeName({ lat, lng }, city) {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}&limit=1&lang=en`, {
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(2500),
    });
    const pr = ((await res.json()).features || [])[0]?.properties || {};
    return city ? pr.city || pr.county || "" : pr.district || pr.locality || pr.city || "";
  } catch {
    return "";
  }
}

export async function areaSummary(center, zoom = 14) {
  const radius = NEAR_RADIUS_M[zoom] || 1000;
  const dLat = radius / 111000 + 0.002;
  const dLng = dLat / Math.cos((center.lat * Math.PI) / 180);
  const cells = cellsInBounds(center.lat - dLat, center.lng - dLng, center.lat + dLat, center.lng + dLng);
  // Zoomed out to a city, name the city; closer in, the neighborhood.
  const [data, name] = await Promise.all([readCells(cells), placeName(center, zoom <= 12)]);
  const near = Object.values(data.cells)
    .flat()
    .filter((p) => meters(center, p) <= radius);
  const n = near.length;
  const s = near.filter(isShowstopper).length;
  return { name, n: n >= MIN_HOUSES ? n : 0, s: n >= MIN_HOUSES ? s : 0 };
}

// plain: no emoji, for the preview image (which draws its own sparkle).
export function areaTitle({ name, n, s }, { plain = false } = {}) {
  const where = name ? `near ${name}` : "nearby";
  if (!n) return `Christmas lights ${where}`;
  const stars = s ? ` · ${s} ${plain ? "" : "🤩 "}${s === 1 ? "Showstopper" : "Showstoppers"}` : "";
  return `${plain ? "" : "✨ "}${n} houses lit ${where}${stars}`;
}

export async function nationalTotal() {
  const { cells } = await readSummary();
  return Object.values(cells).reduce((t, c) => t + c.n, 0);
}
