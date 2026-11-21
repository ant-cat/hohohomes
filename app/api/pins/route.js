import { readPins, addPin, cleanNote, BOUNDS } from "../../../lib/pins";

export const dynamic = "force-dynamic";

// Basic per-instance rate limit. Kept in memory only, never stored.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ADDS_PER_WINDOW = 20;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  h.count += 1;
  return h.count > MAX_ADDS_PER_WINDOW;
}

function json(body, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": cache },
  });
}

export async function GET() {
  try {
    const { pins } = await readPins();
    // Cached at Vercel's edge for 30 s, so reads stay nearly free.
    return json({ pins }, 200, "public, max-age=0, s-maxage=30, stale-while-revalidate=300");
  } catch (err) {
    console.error(err);
    return json({ error: "Could not load the map right now." }, 500);
  }
}

export async function POST(req) {
  const ip =
    (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "anon")
      .split(",")[0]
      .trim();
  if (limited(ip)) return json({ error: "That's a lot of lights! Try again in a bit." }, 429);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request." }, 400);
  }

  const lat = Number(body && body.lat);
  const lng = Number(body && body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ error: "Missing location." }, 400);
  if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng) {
    return json({ error: "For now cheer.here only covers the Jacksonville area." }, 400);
  }
  let rating = Number(body.rating) || 0;
  rating = Math.max(0, Math.min(3, Math.round(rating)));
  const note = cleanNote(body.note);

  try {
    const result = await addPin({ lat, lng, rating, note });
    return json(result);
  } catch (err) {
    console.error(err);
    return json({ error: err.status ? err.message : "Could not save that, try again." }, err.status || 500);
  }
}
