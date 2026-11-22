import { readCells, addPin, changeReport, cleanNote, inUSA } from "../../../lib/pins";
import { CELL_RE } from "../../../lib/region";
import { json, clientIp, rateLimiter, readJson, deviceKey } from "../../../lib/http";
import { checkName } from "../../../lib/displays";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const addLimited = rateLimiter(20, HOUR);
const changeLimited = rateLimiter(120, HOUR);

function failure(err) {
  if (!err.status) console.error(err);
  return json({ error: err.status ? err.message : "Could not save that, try again." }, err.status || 500);
}

function readSpot(body) {
  const lat = Number(body && body.lat);
  const lng = Number(body && body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: json({ error: "Missing location." }, 400) };
  if (!inUSA(lat, lng)) {
    return { error: json({ error: "For now HoHoHomes only covers the United States." }, 400) };
  }
  return { lat, lng };
}

const MAX_CELLS = 40;

// The houses in some cells: GET /api/pins?cells=30_-82,30_-81
export async function GET(req) {
  const cells = [...new Set((new URL(req.url).searchParams.get("cells") || "").split(",").filter(Boolean))];
  if (!cells.length || cells.length > MAX_CELLS || !cells.every((c) => CELL_RE.test(c))) {
    return json({ error: "Bad request." }, 400);
  }
  try {
    const data = await readCells(cells);
    // Cached at Vercel's edge for 30 s, so reads stay nearly free.
    return json(data, 200, "public, max-age=0, s-maxage=30, stale-while-revalidate=300");
  } catch (err) {
    console.error(err);
    return json({ error: "Could not load the map right now." }, 500);
  }
}

// Drop a pin. Returns a short-lived token for undo, move and vibes.
export async function POST(req) {
  if (addLimited(clientIp(req))) return json({ error: "That's a lot of lights! Try again in a bit." }, 429);
  const body = await readJson(req);
  if (!body) return json({ error: "Bad request." }, 400);
  const spot = readSpot(body);
  if (spot.error) return spot.error;

  let rating = Number(body.rating) || 0;
  rating = Math.max(0, Math.min(3, Math.round(rating)));
  try {
    return json(await addPin({ ...spot, rating, note: cleanNote(body.note), vibes: body.vibes }));
  } catch (err) {
    return failure(err);
  }
}

// Change your own recent pin: { token, action: "undo" | "move" | "vibes" | "display", lat?, lng?, vibes?, name? }
// "display" names it as a public display (farm, park, business…); an empty name makes it a home again.
export async function PATCH(req) {
  if (changeLimited(clientIp(req))) return json({ error: "Slow down a little and try again." }, 429);
  const body = await readJson(req);
  if (!body || typeof body.token !== "string") return json({ error: "Bad request." }, 400);
  const { action } = body;
  let extra = {};
  if (action === "move") {
    const spot = readSpot(body);
    if (spot.error) return spot.error;
    extra = spot;
  } else if (action === "vibes") {
    extra = { vibes: body.vibes };
  } else if (action === "display") {
    const checked = checkName(body.name);
    if (checked.error) return json({ error: checked.error }, 400);
    extra = { name: checked.name, key: deviceKey(req) };
  } else if (action !== "undo") {
    return json({ error: "Unknown action." }, 400);
  }
  try {
    return json(await changeReport(body.token, action, extra));
  } catch (err) {
    return failure(err);
  }
}
