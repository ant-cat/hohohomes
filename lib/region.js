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
