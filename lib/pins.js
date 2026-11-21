import { get, put, BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";

const PATHNAME = "pins.json";

// Jacksonville metro area, for now.
export const BOUNDS = { minLat: 29.6, maxLat: 31.0, minLng: -82.3, maxLng: -81.0 };
const MAX_PINS = 5000;
const DEDUPE_METERS = 20;
const MAX_NOTES_PER_PIN = 3;

function distanceMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function readPins() {
  let result;
  try {
    // Straight from storage, never a cached copy, so a write never builds on old data.
    result = await get(PATHNAME, { access: "public", useCache: false });
  } catch (err) {
    if (err instanceof BlobNotFoundError) return { pins: [], etag: null };
    throw err;
  }
  if (!result || !result.stream) return { pins: [], etag: null };
  const data = JSON.parse(await new Response(result.stream).text());
  return { pins: Array.isArray(data.pins) ? data.pins : [], etag: result.blob.etag };
}

export function cleanNote(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

// Adds a report. A report within ~20 m of an existing house counts toward that house.
export async function addPin({ lat, lng, rating, note }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { pins, etag } = await readPins();
    const now = Date.now();

    let target = null;
    let best = Infinity;
    for (const p of pins) {
      const d = distanceMeters(lat, lng, p.lat, p.lng);
      if (d < DEDUPE_METERS && d < best) {
        best = d;
        target = p;
      }
    }

    if (target) {
      target.c = (target.c || 1) + 1;
      if (rating) {
        target.rs = (target.rs || 0) + rating;
        target.rn = (target.rn || 0) + 1;
      }
      if (note) {
        target.n = [note, ...(target.n || [])].slice(0, MAX_NOTES_PER_PIN);
      }
      target.u = now;
    } else {
      if (pins.length >= MAX_PINS) {
        const e = new Error("The map is full for now.");
        e.status = 503;
        throw e;
      }
      target = {
        id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        lat: Math.round(lat * 1e5) / 1e5,
        lng: Math.round(lng * 1e5) / 1e5,
        c: 1,
        rs: rating || 0,
        rn: rating ? 1 : 0,
        n: note ? [note] : [],
        t: now,
        u: now,
      };
      pins.push(target);
    }

    try {
      await put(PATHNAME, JSON.stringify({ pins }), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: Boolean(etag),
        ...(etag ? { ifMatch: etag } : {}),
        cacheControlMaxAge: 60,
      });
      return { pins, pin: target, merged: target.c > 1 };
    } catch (err) {
      // Someone else wrote at the same moment: read again and retry.
      const conflict =
        err instanceof BlobPreconditionFailedError ||
        /already exists|precondition/i.test(String(err && err.message));
      if (!conflict) throw err;
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));
    }
  }
  const e = new Error("Busy right now, try again.");
  e.status = 503;
  throw e;
}
