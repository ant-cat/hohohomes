import { get, put, list, del, BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";
import { cleanVibes } from "./vibes";

// Every save is a new, numbered, never-overwritten file: pins/000000042.json.
// Creating the next number only succeeds once, so two saves at the same moment can't
// both win (the loser re-reads and retries), and a fresh URL is never stale in the CDN.
const PREFIX = "pins/";
const LEGACY_PATHNAME = "pins.json"; // the single file used before versions; read once to migrate
const KEEP_VERSIONS = 5;
const versionPath = (rev) => `${PREFIX}${String(rev).padStart(9, "0")}.json`;

// Jacksonville metro area, for now.
export const BOUNDS = { minLat: 29.6, maxLat: 31.0, minLng: -82.3, maxLng: -81.0 };
const MAX_PINS = 5000;
const DEDUPE_METERS = 20;
const MAX_NOTES_PER_PIN = 3;
// How long the person who dropped a pin can undo, move it or change its vibes.
const RECEIPT_MS = 30 * 60 * 1000;
const MAX_RECEIPTS_PER_PIN = 20;

// Moderation: comma-separated pin ids in HIDDEN_PIN_IDS are dropped on read and on the next write.
const HIDDEN = new Set(
  (process.env.HIDDEN_PIN_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

// Local development without a Blob store keeps pins in memory.
const MEMORY = !process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== "production";
const mem = (globalThis.__hohoPins ||= { pins: [], version: 0 });

/*
 Pin shape in pins.json:
   id, lat, lng
   c   reports count          t  first seen      u  last report
   rs  rating sum, rn count   n  notes (newest first)
   v   { vibeId: count }      l  last confirmed lit
   lc  "Lit tonight" taps     k  undo receipts (private, never sent to browsers)
*/

export function inBounds(lat, lng) {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

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

function publicPin(p) {
  const { k, ...rest } = p;
  return rest;
}

const publicPins = (pins) => pins.map(publicPin);

// The last copy this server instance wrote, so the next save can skip a download.
let lastWritten = null;

async function readLegacy() {
  try {
    const result = await get(LEGACY_PATHNAME, { access: "public" });
    if (!result || !result.stream) return [];
    const data = JSON.parse(await new Response(result.stream).text());
    return Array.isArray(data.pins) ? data.pins : [];
  } catch (err) {
    if (err instanceof BlobNotFoundError) return [];
    throw err;
  }
}

async function listVersions() {
  const versions = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, limit: 1000, cursor });
    for (const b of page.blobs) {
      const rev = Number(b.pathname.slice(PREFIX.length).replace(/\.json$/, ""));
      if (Number.isInteger(rev)) versions.push({ rev, url: b.url });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return versions.sort((a, b) => b.rev - a.rev); // newest first
}

// Returns the pins plus a "version" handle for the next write.
async function readRaw() {
  if (MEMORY) {
    const pins = structuredClone(mem.pins).filter((p) => !HIDDEN.has(p.id));
    return { pins, etag: { rev: mem.version, older: [] } };
  }
  const versions = await listVersions();
  const newest = versions[0];
  let pins;
  if (!newest) {
    pins = await readLegacy();
  } else if (lastWritten && lastWritten.rev === newest.rev) {
    pins = JSON.parse(lastWritten.json).pins;
  } else {
    // Each version has its own URL and never changes, so any cached copy is the right one.
    const res = await fetch(newest.url, { cache: "no-store" });
    if (!res.ok) throw httpError(503, "Busy right now, try again.");
    pins = JSON.parse(await res.text()).pins || [];
  }
  pins = pins.filter((p) => !HIDDEN.has(p.id));
  return { pins, etag: { rev: newest ? newest.rev : 0, older: versions.slice(KEEP_VERSIONS - 1).map((v) => v.url) } };
}

async function write(pins, etag) {
  if (MEMORY) {
    if (mem.version !== etag.rev) throw new BlobPreconditionFailedError();
    mem.pins = structuredClone(pins);
    mem.version += 1;
    return;
  }
  const rev = etag.rev + 1;
  const json = JSON.stringify({ pins, rev });
  // allowOverwrite: false makes this a compare-and-swap: only one save can create this number.
  try {
    await put(versionPath(rev), json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
  } catch (err) {
    // Whatever the error looks like, if that number now exists someone else saved first.
    const now = await listVersions().catch(() => []);
    if (now[0] && now[0].rev >= rev) throw new BlobPreconditionFailedError();
    throw err;
  }
  lastWritten = { rev, json };
  // Tidy up old versions, keeping a few as an undo history.
  if (etag.older.length) del(etag.older).catch((err) => console.error("cleanup failed", err));
}

export async function readPins() {
  const { pins } = await readRaw();
  return { pins: publicPins(pins) };
}

// Reads, changes and writes pins.json, retrying if someone else wrote at the same moment.
async function mutate(change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { pins, etag } = await readRaw();
    const now = Date.now();
    for (const p of pins) {
      if (p.k) {
        p.k = p.k.filter((r) => r.e > now);
        if (!p.k.length) delete p.k;
      }
    }
    const result = change(pins, now);
    try {
      await write(pins, etag);
      return { ...result, pins: publicPins(pins) };
    } catch (err) {
      const conflict =
        err instanceof BlobPreconditionFailedError ||
        /already exists|precondition/i.test(String(err && err.message));
      if (!conflict) throw err;
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));
    }
  }
  throw httpError(503, "Busy right now, try again.");
}

export function cleanNote(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function bump(pin, vibe, by) {
  const v = (pin.v ||= {});
  v[vibe] = (v[vibe] || 0) + by;
  if (v[vibe] <= 0) delete v[vibe];
}

// Adds one report. A report within ~20 m of an existing house counts toward that house.
function report(pins, now, { lat, lng, rating, note, vibes, token, expires }) {
  let target = null;
  let best = Infinity;
  for (const p of pins) {
    const d = distanceMeters(lat, lng, p.lat, p.lng);
    if (d < DEDUPE_METERS && d < best) {
      best = d;
      target = p;
    }
  }
  const receipt = { t: token, e: expires, at: now, v: vibes, r: rating || 0, n: note || "" };

  if (target) {
    receipt.pl = target.l || null;
    receipt.pu = target.u || null;
    target.c = (target.c || 1) + 1;
    if (rating) {
      target.rs = (target.rs || 0) + rating;
      target.rn = (target.rn || 0) + 1;
    }
    if (note) target.n = [note, ...(target.n || [])].slice(0, MAX_NOTES_PER_PIN);
    target.u = now;
    target.l = now;
  } else {
    if (pins.length >= MAX_PINS) throw httpError(503, "The map is full for now.");
    target = {
      id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      lat: Math.round(lat * 1e5) / 1e5,
      lng: Math.round(lng * 1e5) / 1e5,
      c: 1,
      rs: rating || 0,
      rn: rating ? 1 : 0,
      n: note ? [note] : [],
      v: {},
      t: now,
      u: now,
      l: now,
    };
    pins.push(target);
  }
  for (const vibe of vibes) bump(target, vibe, 1);
  target.k = [...(target.k || []), receipt].slice(-MAX_RECEIPTS_PER_PIN);
  return { pin: target, merged: target.c > 1 };
}

function findReceipt(pins, token) {
  if (typeof token !== "string" || !token) return null;
  for (const pin of pins) {
    const receipt = pin.k && pin.k.find((r) => r.t === token);
    if (receipt) return { pin, receipt };
  }
  return null;
}

// Takes one report back out of a house, removing the house if it was the only one.
function withdraw(pins, pin, receipt) {
  pin.k = pin.k.filter((r) => r !== receipt);
  if (!pin.k.length) delete pin.k;
  pin.c = (pin.c || 1) - 1;
  if (receipt.r) {
    pin.rs = Math.max(0, (pin.rs || 0) - receipt.r);
    pin.rn = Math.max(0, (pin.rn || 0) - 1);
  }
  if (receipt.n && pin.n) {
    const i = pin.n.indexOf(receipt.n);
    if (i >= 0) pin.n.splice(i, 1);
  }
  for (const vibe of receipt.v || []) bump(pin, vibe, -1);
  if (pin.c <= 0) {
    pins.splice(pins.indexOf(pin), 1);
    return;
  }
  // Nobody else touched it since: put its timestamps back.
  if (pin.l === receipt.at && receipt.pl) pin.l = receipt.pl;
  if (pin.u === receipt.at && receipt.pu) pin.u = receipt.pu;
}

export async function addPin({ lat, lng, rating, note, vibes }) {
  const token = crypto.randomUUID();
  const result = await mutate((pins, now) =>
    report(pins, now, { lat, lng, rating, note, vibes: cleanVibes(vibes), token, expires: now + RECEIPT_MS })
  );
  return { pins: result.pins, pin: publicPin(result.pin), merged: result.merged, token };
}

// Undo, move or re-tag your own recent report, using the token from addPin.
export async function changeReport(token, action, body) {
  const result = await mutate((pins, now) => {
    const found = findReceipt(pins, token);
    if (!found) throw httpError(410, "Too late to change that one.");
    const { pin, receipt } = found;

    if (action === "undo") {
      withdraw(pins, pin, receipt);
      return { pin: null };
    }
    if (action === "move") {
      withdraw(pins, pin, receipt);
      return report(pins, now, {
        lat: body.lat,
        lng: body.lng,
        rating: receipt.r,
        note: receipt.n,
        vibes: receipt.v || [],
        token,
        expires: receipt.e,
      });
    }
    if (action === "vibes") {
      const next = cleanVibes(body.vibes);
      const prev = receipt.v || [];
      for (const v of prev) if (!next.includes(v)) bump(pin, v, -1);
      for (const v of next) if (!prev.includes(v)) bump(pin, v, 1);
      receipt.v = next;
      return { pin };
    }
    throw httpError(400, "Unknown action.");
  });
  return { pins: result.pins, pin: result.pin ? publicPin(result.pin) : null, merged: Boolean(result.merged) };
}

// "Lit tonight": anyone can confirm a house is still glowing.
export async function confirmLit(id) {
  const result = await mutate((pins, now) => {
    const pin = pins.find((p) => p.id === id);
    if (!pin) throw httpError(404, "That house isn't on the map anymore.");
    pin.l = now;
    pin.lc = (pin.lc || 0) + 1;
    return { pin };
  });
  return { pins: result.pins, pin: publicPin(result.pin) };
}
