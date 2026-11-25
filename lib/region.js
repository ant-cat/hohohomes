// Where HoHoHomes works, and how the map is split up. Shared by the API and the map.

// The United States: lower 48, Alaska, Hawaii, Puerto Rico.
const US_BOXES = [
  { minLat: 24.4, maxLat: 49.5, minLng: -125.0, maxLng: -66.9 },
  { minLat: 51.2, maxLat: 71.5, minLng: -180.0, maxLng: -129.9 },
  { minLat: 18.8, maxLat: 22.3, minLng: -160.3, maxLng: -154.7 },
  { minLat: 17.8, maxLat: 18.6, minLng: -67.3, maxLng: -65.2 },
];

export function inUSA(lat, lng) {
  return US_BOXES.some((b) => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng);
}

// The whole country in view, for visitors whose location we don't know.
export const USA_CENTER = [-98.6, 39.5];
export const LOWER_48 = [
  [-125.0, 24.4],
  [-66.9, 49.5],
];

// Houses are stored in 1° × 1° cells (about 110 km tall), so a save in Denver never waits on one
// in Jacksonville and the map only downloads the cells in view.
// A cell is named by its south-west corner: "30_-82" holds 30–31°N, 82–81°W.
export const CELL_RE = /^-?\d{1,2}_-?\d{1,3}$/;

export function cellOf(lat, lng) {
  return `${Math.floor(lat)}_${Math.floor(lng)}`;
}

// Coordinates are stored to 5 decimals (about 1 m). Round before picking a cell so the
// cell always matches the stored position.
export function roundCoord(x) {
  return Math.round(x * 1e5) / 1e5;
}

export function cellsInBounds(south, west, north, east) {
  const out = [];
  for (let lat = Math.floor(south); lat <= Math.floor(north); lat++) {
    for (let lng = Math.floor(west); lng <= Math.floor(east); lng++) out.push(`${lat}_${lng}`);
  }
  return out;
}

export function cellCenter(cell) {
  const [lat, lng] = cell.split("_").map(Number);
  return { lat: lat + 0.5, lng: lng + 0.5 };
}

// Shared links point at a small area, never a house: the spot is snapped to a 0.01° grid
// (about 1 km), so everyone on the same few blocks shares the identical link.
export const NEAR_RE = /^(-?\d{1,2}\.\d{2}),(-?\d{1,3}\.\d{2})$/;

export function snapNear(lat, lng) {
  const snap = (x) => (Math.floor(x * 100 + 1e-9) / 100).toFixed(2);
  return `${snap(lat)},${snap(lng)}`;
}

// How zoomed in a shared link opens (whole numbers 10–15, default 14). The preview counts
// houses over a matching radius, so a city-wide link describes the city.
export const NEAR_RADIUS_M = { 10: 15000, 11: 8000, 12: 4000, 13: 2000, 14: 1000, 15: 700 };

export function parseZoom(raw) {
  const z = Number(raw);
  return Number.isInteger(z) && z >= 10 && z <= 15 ? z : 14;
}

// The middle of a shared area, or null if the link is malformed or outside the US.
export function parseNear(raw) {
  const m = typeof raw === "string" ? NEAR_RE.exec(raw) : null;
  if (!m) return null;
  const lat = Number(m[1]) + 0.005;
  const lng = Number(m[2]) + 0.005;
  return inUSA(lat, lng) ? { lat, lng } : null;
}

// The zoomed-out map shows one glow per area: cells whose houses sit within AREA_KM of the
// busiest cell nearby join it (a city and its suburbs across a cell line), and everything
// farther away is its own area with its own count. Grouping by distance on the ground, not by
// pixels on screen, so zooming out never folds Houston into Jacksonville.
export const AREA_KM = 90;

function km(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const s =
    Math.sin(toRad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

// cells: [{ cell, n, s, d, lat, lng }] with n > 0. Returns areas, busiest first:
// { cell (the busiest cell), n, s, d, lat, lng (middle of its houses), name: { lat, lng }
// (the busiest cell, to name the area after), box: [west, south, east, north] }.
export function groupAreas(cells, radiusKm = AREA_KM) {
  const left = [...cells].sort((a, b) => b.n - a.n || a.cell.localeCompare(b.cell));
  const areas = [];
  while (left.length) {
    const seed = left.shift();
    const members = [seed];
    for (let i = 0; i < left.length; ) {
      if (km(seed, left[i]) <= radiusKm) members.push(...left.splice(i, 1));
      else i++;
    }
    const n = members.reduce((t, m) => t + m.n, 0);
    areas.push({
      cell: seed.cell,
      n,
      s: members.reduce((t, m) => t + m.s, 0),
      d: members.reduce((t, m) => t + m.d, 0),
      lat: members.reduce((t, m) => t + m.lat * m.n, 0) / n,
      lng: members.reduce((t, m) => t + m.lng * m.n, 0) / n,
      name: { lat: seed.lat, lng: seed.lng },
      box: [
        Math.min(...members.map((m) => m.lng)),
        Math.min(...members.map((m) => m.lat)),
        Math.max(...members.map((m) => m.lng)),
        Math.max(...members.map((m) => m.lat)),
      ],
    });
  }
  return areas;
}
