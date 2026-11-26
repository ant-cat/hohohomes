import { get, put, list, del, BlobNotFoundError, BlobPreconditionFailedError } from "@vercel/blob";
import { cleanVibes, WOW, isShowstopper } from "./vibes";
import { inUSA, cellOf, roundCoord, CELL_RE } from "./region";
import { isDisplay, CONFIRM_METERS } from "./displays";
import { tapBlock, untapBlock, takeOver, publicBlock, midpoint } from "./blocks";

/*
 Storage
 -------
 Houses live in 1° cells (see lib/region.js), one folder per season and cell:

   pins/2026/30_-82/000000042~137~3~3031~-8165~2.json
                    rev        |   |  |          public displays (confirmed; older files have none)
                               |   |  centroid × 100 (lat, lng)
                               |   Showstoppers
                               houses

 A cell with lit blocks but no houses yet is named with 0 houses and its block count in the
 displays place (a cell with no houses has no displays), centroid at its first block. The name
 keeps the same six parts either way, so an older deploy (a rollback) still reads every file.

 A file holds { season, cell, rev, pins, blocks }. Blocks are lit stretches of street (lib/blocks.js),
 saved from a moving car without an exact house. Older files have no blocks.

 Every save is a new, numbered, never-overwritten file. Creating the next number only succeeds
 once, so two saves at the same moment can't both win (the loser re-reads and retries), and a
 fresh URL is never stale in the CDN. The counts and centroid in the name let the national
 summary come from one list() call, without downloading any houses.

 A season runs until January 15 (New York time); then every cell starts empty in a new season
 folder and last season's folders stay as the archive. Only the current season's old versions
 are ever cleaned up.

 Before cells, Jacksonville houses lived in one list (pins/2026/NNN.json, pins/NNN.json or
 pins.json). Those few cells read that list once and keep their share on their first save.
*/
const ROOT = "pins/";
const FIRST_SEASON = 2026;
const LEGACY_PATHNAME = "pins.json";
const LEGACY_BOUNDS = { minLat: 29.6, maxLat: 31.0, minLng: -82.3, maxLng: -81.0 }; // the old Jacksonville area
const KEEP_VERSIONS = 5;
const RESET_MONTH = 1;
const RESET_DAY = 15;

const MAX_PINS_PER_CELL = 5000;
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

// Local development without a Blob store keeps cells in memory.
const MEMORY = !process.env.BLOB_READ_WRITE_TOKEN && process.env.NODE_ENV !== "production";
const mem = (globalThis.__hohoCells ||= {});

/*
 Pin shape:
   id, lat, lng
   c   reports count          t  first seen      u  last report
   rs  rating sum, rn count   n  notes (newest first)
   v   { vibeId: count }      l  last confirmed lit
   lc  "Lit tonight" taps     k  undo receipts (private, never sent to browsers)
   w   "Worth the Drive" votes (3+ makes a Showstopper)
   d   public display: { n: name, by: [device keys], at: added, ok: confirmed at,
                         f: first night, e: last night (YYYY-MM-DD), h: hours text,
                         s: 1 when the owner seeded it }
       Homes have no d. "by" never leaves the server, and the name only does once ok is set,
       which takes a second, different device (see lib/displays.js).
*/

export { inUSA };

export function seasonFor(ms = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(new Date(ms))
      .map((p) => [p.type, Number(p.value)])
  );
  const beforeReset = parts.month === RESET_MONTH && parts.day < RESET_DAY;
  return beforeReset ? parts.year - 1 : parts.year;
}

const cellPrefix = (season, cell) => `${ROOT}${season}/${cell}/`;

function isLegacyCell(cell) {
  const [lat, lng] = cell.split("_").map(Number);
  return (
    lat + 1 > LEGACY_BOUNDS.minLat && lat <= LEGACY_BOUNDS.maxLat && lng + 1 > LEGACY_BOUNDS.minLng && lng <= LEGACY_BOUNDS.maxLng
  );
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
  const { k, d, ...rest } = p;
  if (d) rest.d = d.ok ? withWhen({ n: d.n, ok: 1 }, d) : { p: 1 };
  return rest;
}

const publicPins = (pins) => pins.map(publicPin);

// Copies a display's season dates and hours (see lib/displays.js) onto another object.
function withWhen(out, when) {
  for (const f of ["f", "e", "h"]) {
    if (when && when[f]) out[f] = when[f];
    else delete out[f];
  }
  return out;
}
const hasWhen = (w) => Boolean(w && (w.f || w.e || w.h));

// The last copy this server instance wrote, so the next save can skip a download.
let lastWritten = null;

const NAME_RE = /^(\d+)(?:~(\d+)~(\d+)~(-?\d+)~(-?\d+)(?:~(\d+))?)?\.json$/;

// Numbered versions directly inside a folder, newest first.
async function listVersions(prefix) {
  const versions = [];
  let cursor;
  do {
    const page = await list({ prefix, limit: 1000, cursor });
    for (const b of page.blobs) {
      const m = NAME_RE.exec(b.pathname.slice(prefix.length));
      if (m) versions.push({ rev: Number(m[1]), url: b.url });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return versions.sort((a, b) => b.rev - a.rev);
}

async function fetchVersion(url) {
  // Each version has its own URL and never changes, so any cached copy is the right one.
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw httpError(503, "Busy right now, try again.");
  const data = JSON.parse(await res.text());
  return { pins: data.pins || [], blocks: data.blocks || [] };
}

// The Jacksonville list from before cells existed. Frozen, so it's cached for a minute.
let legacyCache = null;
async function legacyPins() {
  if (legacyCache && Date.now() - legacyCache.at < 60 * 1000) return legacyCache.pins;
  let pins;
  const seasonFlat = await listVersions(`${ROOT}${FIRST_SEASON}/`);
  if (seasonFlat[0]) pins = (await fetchVersion(seasonFlat[0].url)).pins;
  else {
    const flat = await listVersions(ROOT);
    if (flat[0]) pins = (await fetchVersion(flat[0].url)).pins;
    else {
      try {
        const result = await get(LEGACY_PATHNAME, { access: "public" });
        pins = result && result.stream ? JSON.parse(await new Response(result.stream).text()).pins || [] : [];
      } catch (err) {
        if (!(err instanceof BlobNotFoundError)) throw err;
        pins = [];
      }
    }
  }
  legacyCache = { at: Date.now(), pins };
  return pins;
}

// Returns a cell's pins and lit blocks, plus a version handle for the next write.
async function readCell(cell) {
  const season = seasonFor();
  if (MEMORY) {
    const m = (mem[`${season}/${cell}`] ||= { pins: [], blocks: [], rev: 0 });
    return {
      pins: structuredClone(m.pins).filter((p) => !HIDDEN.has(p.id)),
      blocks: structuredClone(m.blocks || []).filter((b) => !HIDDEN.has(b.id)),
      etag: { season, cell, rev: m.rev, older: [] },
    };
  }
  const prefix = cellPrefix(season, cell);
  const versions = await listVersions(prefix);
  const newest = versions[0];
  let pins;
  let blocks = [];
  if (newest && lastWritten && lastWritten.prefix === prefix && lastWritten.rev === newest.rev) {
    const data = JSON.parse(lastWritten.json);
    pins = data.pins;
    blocks = data.blocks || [];
  } else if (newest) {
    ({ pins, blocks } = await fetchVersion(newest.url));
  } else if (season === FIRST_SEASON && isLegacyCell(cell)) {
    pins = (await legacyPins()).filter((p) => cellOf(p.lat, p.lng) === cell);
  } else {
    pins = [];
  }
  pins = pins.filter((p) => !HIDDEN.has(p.id));
  blocks = blocks.filter((b) => !HIDDEN.has(b.id));
  return {
    pins,
    blocks,
    etag: { season, cell, rev: newest ? newest.rev : 0, older: versions.slice(KEEP_VERSIONS - 1).map((v) => v.url) },
  };
}

function centroid(pins) {
  if (!pins.length) return { lat: 0, lng: 0 };
  let lat = 0;
  let lng = 0;
  for (const p of pins) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / pins.length, lng: lng / pins.length };
}

async function writeCell(pins, etag, blocks = []) {
  const { season, cell } = etag;
  const rev = etag.rev + 1;
  if (MEMORY) {
    const m = (mem[`${season}/${cell}`] ||= { pins: [], blocks: [], rev: 0 });
    if (m.rev !== etag.rev) throw new BlobPreconditionFailedError();
    m.pins = structuredClone(pins);
    m.blocks = structuredClone(blocks);
    m.rev = rev;
    return;
  }
  const prefix = cellPrefix(season, cell);
  const json = JSON.stringify({ season, cell, rev, pins, blocks });
  const c = pins.length || !blocks.length ? centroid(pins) : midpoint(blocks[0].g);
  const name = [
    String(rev).padStart(9, "0"),
    pins.length,
    pins.filter(isShowstopper).length,
    Math.round(c.lat * 100),
    Math.round(c.lng * 100),
    pins.length ? pins.filter(isDisplay).length : blocks.length,
  ].join("~");
  // allowOverwrite: false makes this a compare-and-swap: only one save can create this number.
  try {
    await put(`${prefix}${name}.json`, json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
  } catch (err) {
    // Whatever the error looks like, if that number now exists someone else saved first.
    const now = await listVersions(prefix).catch(() => []);
    if (now[0] && now[0].rev >= rev) throw new BlobPreconditionFailedError();
    throw err;
  }
  lastWritten = { prefix, rev, json };
  if (etag.older.length) del(etag.older).catch((err) => console.error("cleanup failed", err));
}

// Reads, changes and writes one cell, retrying if someone else saved at the same moment.
// The cell's lit blocks ride along on the pins list as pins.blocks (not saved as part of the
// list), so a house report can take over the block it sits on.
async function mutateCell(cell, change) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { pins, blocks, etag } = await readCell(cell);
    const now = Date.now();
    for (const p of [...pins, ...blocks]) {
      if (p.k) {
        p.k = p.k.filter((r) => r.e > now);
        if (!p.k.length) delete p.k;
      }
    }
    Object.defineProperty(pins, "blocks", { value: blocks, enumerable: false, writable: true });
    const result = change(pins, now);
    try {
      await writeCell(pins, etag, pins.blocks);
      return { ...result, cells: { [cell]: publicPins(pins) }, blocks: { [cell]: pins.blocks.map(publicBlock) } };
    } catch (err) {
      const conflict =
        err instanceof BlobPreconditionFailedError || /already exists|precondition/i.test(String(err && err.message));
      if (!conflict) throw err;
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 300));
    }
  }
  throw httpError(503, "Busy right now, try again.");
}

// --- Reading ----------------------------------------------------------------

export async function readCells(cells) {
  const out = {};
  const blocks = {};
  await Promise.all(
    cells.map(async (cell) => {
      const r = await readCell(cell);
      out[cell] = publicPins(r.pins);
      blocks[cell] = r.blocks.map(publicBlock);
    })
  );
  return { cells: out, blocks };
}

// Houses per cell for the zoomed-out national map: counts, Showstoppers and a centroid,
// all read from file names, so no houses are downloaded.
export async function readSummary() {
  const season = seasonFor();
  const cells = {};
  if (MEMORY) {
    for (const [key, m] of Object.entries(mem)) {
      const [s, cell] = key.split("/");
      const nb = (m.blocks || []).length;
      if (Number(s) !== season || (!m.pins.length && !nb)) continue;
      const c = m.pins.length ? centroid(m.pins) : midpoint(m.blocks[0].g);
      cells[cell] = { n: m.pins.length, s: m.pins.filter(isShowstopper).length, d: m.pins.filter(isDisplay).length, b: nb, lat: c.lat, lng: c.lng };
    }
  } else {
    const prefix = `${ROOT}${season}/`;
    const newest = {};
    let cursor;
    do {
      const page = await list({ prefix, limit: 1000, cursor });
      for (const b of page.blobs) {
        const [cell, name] = b.pathname.slice(prefix.length).split("/");
        if (!name || !CELL_RE.test(cell)) continue;
        const m = NAME_RE.exec(name);
        if (!m || m[2] === undefined) continue;
        const rev = Number(m[1]);
        if (!newest[cell] || rev > newest[cell].rev) {
          const n = Number(m[2]);
          // No houses: the sixth part counts lit blocks (see the top of this file).
          const sixth = Number(m[6] || 0);
          newest[cell] = { rev, n, s: Number(m[3]), d: n ? sixth : 0, b: n ? 0 : sixth, lat: Number(m[4]) / 100, lng: Number(m[5]) / 100 };
        }
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    // b: lit blocks, so the map knows to download a cell that has only blocks so far.
    for (const [cell, v] of Object.entries(newest)) if (v.n || v.b) cells[cell] = { n: v.n, s: v.s, d: v.d, b: v.b, lat: v.lat, lng: v.lng };
    // Jacksonville cells that haven't been saved since cells existed still live in the old list.
    if (season === FIRST_SEASON) {
      const byCell = {};
      for (const p of await legacyPins()) {
        if (HIDDEN.has(p.id)) continue;
        const cell = cellOf(p.lat, p.lng);
        if (newest[cell]) continue;
        (byCell[cell] ||= []).push(p);
      }
      for (const [cell, pins] of Object.entries(byCell)) {
        const c = centroid(pins);
        cells[cell] = { n: pins.length, s: pins.filter(isShowstopper).length, d: 0, lat: c.lat, lng: c.lng };
      }
    }
  }
  return { season, cells };
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
  if (vibe === WOW) {
    // The dropper's own "Worth the Drive" counts as one vote, and comes off on undo.
    pin.w = Math.max(0, (pin.w || 0) + by);
    if (!pin.w) delete pin.w;
    return;
  }
  const v = (pin.v ||= {});
  v[vibe] = (v[vibe] || 0) + by;
  if (v[vibe] <= 0) delete v[vibe];
}

// Adds one report. A report within ~20 m of an existing house counts toward that house.
// A new house takes over any lit block it sits on (and fromBlock, the block it was pinned from).
function report(pins, now, { lat, lng, rating, note, vibes, token, expires, fromBlock }) {
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
  const isNew = !target;

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
    if (pins.length >= MAX_PINS_PER_CELL) throw httpError(503, "This area of the map is full for now.");
    target = {
      id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      lat: roundCoord(lat),
      lng: roundCoord(lng),
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
  // A new house takes over the blocks it sits on. Pinned from a block's card, even a house that
  // was already on the map takes over that block: someone just said which house it was.
  if (pins.blocks && (isNew || fromBlock)) {
    const gone = takeOver(pins.blocks, { lat: target.lat, lng: target.lng }, fromBlock, !isNew);
    if (gone.length) receipt.bk = gone;
  }
  if (fromBlock) receipt.fb = fromBlock;
  for (const vibe of vibes) bump(target, vibe, 1);
  target.k = [...(target.k || []), receipt].slice(-MAX_RECEIPTS_PER_PIN);
  return { pin: target, merged: target.c > 1, receipt };
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
  unDisplay(pin, receipt);
  // Taking back the report brings back the blocks it took over.
  if (receipt.bk && pins.blocks) {
    for (const b of receipt.bk) if (!pins.blocks.some((x) => x.id === b.id)) pins.blocks.push(b);
  }
  if (pin.c <= 0) {
    pins.splice(pins.indexOf(pin), 1);
    return;
  }
  // Nobody else touched it since: put its timestamps back.
  if (pin.l === receipt.at && receipt.pl) pin.l = receipt.pl;
  if (pin.u === receipt.at && receipt.pu) pin.u = receipt.pu;
}

// --- Public displays ----------------------------------------------------------
//
// A report can say its house is a public display, with a name. The name stays private until a
// second, different device vouches for it: by tapping "I see this display too", or by adding a
// display within CONFIRM_METERS of it. Devices are told apart by a keyed hash of their network
// address (lib/http.js deviceKey), the same thing the rate limits go by.

const MAX_DISPLAY_KEYS = 20;

// Takes back what one report did to a display: the name it gave (while still unconfirmed),
// or the confirmation it added.
function unDisplay(pin, receipt) {
  if (!pin.d || !receipt.dh) return;
  if (receipt.dm) {
    if (!pin.d.ok) delete pin.d;
  } else if (receipt.dc) {
    pin.d.by = pin.d.by.filter((h) => h !== receipt.dh);
    // A seeded display (s) was confirmed by the owner, so it stays confirmed.
    if (pin.d.by.length < 2 && !pin.d.s) delete pin.d.ok;
  }
}

function nearestDisplay(pins, lat, lng, except) {
  let best = null;
  let bestD = CONFIRM_METERS;
  for (const p of pins) {
    if (!p.d || p === except) continue;
    const dist = distanceMeters(lat, lng, p.lat, p.lng);
    if (dist <= bestD) {
      best = p;
      bestD = dist;
    }
  }
  return best;
}

// One more device vouches for a display. Returns what happened, for the toast.
function vouch(pin, key, now) {
  if (pin.d.by.includes(key)) return pin.d.ok ? "already" : "same";
  const was = Boolean(pin.d.ok);
  if (pin.d.by.length < MAX_DISPLAY_KEYS) pin.d.by.push(key);
  if (!was) pin.d.ok = now;
  return was ? "seen" : "confirmed";
}

// Makes a report's house a public display, or, next to an existing display, a second look at it.
// An empty name turns it back into a home.
function applyDisplay(pins, now, pin, receipt, name, key, when = {}) {
  if (!name) {
    unDisplay(pin, receipt);
    for (const f of ["dn", "dh", "dm", "dc", "dw"]) delete receipt[f];
    return { pin, merged: pin.c > 1, display: "home" };
  }
  if (hasWhen(when)) receipt.dw = when;
  else delete receipt.dw;
  if (receipt.dm && pin.d) {
    // Their own display: they can fix the name while it waits for a second look, and its dates.
    if (!pin.d.ok) pin.d.n = name;
    withWhen(pin.d, when);
    receipt.dn = name;
    return { pin, merged: pin.c > 1, display: pin.d.ok ? "seen" : "pending" };
  }
  if (receipt.dc) {
    if (pin.d && !hasWhen(pin.d) && hasWhen(when)) withWhen(pin.d, when);
    return { pin, merged: true, display: "already" };
  }

  const other = pin.d ? pin : nearestDisplay(pins, pin.lat, pin.lng, pin);
  if (other) {
    let target = pin;
    if (other !== pin) {
      // Their report joins the display it's next to, rather than starting a second one.
      const { r, n, v, t, e } = receipt;
      withdraw(pins, pin, receipt);
      const res = report(pins, now, { lat: other.lat, lng: other.lng, rating: r, note: n, vibes: v || [], token: t, expires: e });
      target = res.pin;
      receipt = res.receipt;
    }
    const display = vouch(target, key, now);
    // A second look can fill in dates the display doesn't have yet, but never replace them.
    if (!hasWhen(target.d) && hasWhen(when)) withWhen(target.d, when);
    if (display === "confirmed" || display === "seen") {
      receipt.dc = 1;
      receipt.dh = key;
      receipt.dn = name;
    }
    return { pin: target, merged: true, display };
  }

  pin.d = withWhen({ n: name, by: [key], at: now }, when);
  receipt.dm = 1;
  receipt.dh = key;
  receipt.dn = name;
  return { pin, merged: pin.c > 1, display: "pending" };
}

// --- Changing ---------------------------------------------------------------

// Tokens say which cell the report is in: "30_-82~<random>".
function cellOfToken(token) {
  const cell = typeof token === "string" ? token.split("~")[0] : "";
  if (!CELL_RE.test(cell)) throw httpError(410, "Too late to change that one.");
  return cell;
}

export async function addPin({ lat, lng, rating, note, vibes, fromBlock }) {
  lat = roundCoord(lat);
  lng = roundCoord(lng);
  const cell = cellOf(lat, lng);
  const token = `${cell}~${crypto.randomUUID()}`;
  const result = await mutateCell(cell, (pins, now) =>
    report(pins, now, { lat, lng, rating, note, vibes: cleanVibes(vibes), token, expires: now + RECEIPT_MS, fromBlock })
  );
  return { cells: result.cells, blocks: result.blocks, pin: publicPin(result.pin), merged: result.merged, token };
}

// Undo, move or re-tag your own recent report, using the token from addPin.
// Moving to another cell returns a new token for that cell.
export async function changeReport(token, action, body) {
  const cell = cellOfToken(token);
  const findOrGone = (pins) => {
    const found = findReceipt(pins, token);
    if (!found) throw httpError(410, "Too late to change that one.");
    return found;
  };

  if (action === "move") {
    const lat = roundCoord(body.lat);
    const lng = roundCoord(body.lng);
    const to = cellOf(lat, lng);
    if (to === cell) {
      const r = await mutateCell(cell, (pins, now) => {
        const { pin, receipt } = findOrGone(pins);
        const { dn, dh, dw, fb } = receipt;
        withdraw(pins, pin, receipt);
        const res = report(pins, now, { lat, lng, rating: receipt.r, note: receipt.n, vibes: receipt.v || [], token, expires: receipt.e, fromBlock: fb });
        return dn ? applyDisplay(pins, now, res.pin, res.receipt, dn, dh, dw) : res;
      });
      return { cells: r.cells, blocks: r.blocks, pin: publicPin(r.pin), merged: r.merged, display: r.display, token };
    }
    // Across a cell line: take it out of the old cell, then add it to the new one.
    let moved;
    const out = await mutateCell(cell, (pins) => {
      const { pin, receipt } = findOrGone(pins);
      moved = { ...receipt };
      withdraw(pins, pin, receipt);
      return {};
    });
    const newToken = `${to}~${token.split("~").slice(1).join("~")}`;
    const r = await mutateCell(to, (pins, now) => {
      const res = report(pins, now, { lat, lng, rating: moved.r, note: moved.n, vibes: moved.v || [], token: newToken, expires: moved.e });
      return moved.dn ? applyDisplay(pins, now, res.pin, res.receipt, moved.dn, moved.dh, moved.dw) : res;
    });
    return {
      cells: { ...out.cells, ...r.cells },
      blocks: { ...out.blocks, ...r.blocks },
      pin: publicPin(r.pin),
      merged: r.merged,
      display: r.display,
      token: newToken,
    };
  }

  const r = await mutateCell(cell, (pins, now) => {
    const { pin, receipt } = findOrGone(pins);
    if (action === "display") return applyDisplay(pins, now, pin, receipt, body.name, body.key, body.when);
    if (action === "undo") {
      withdraw(pins, pin, receipt);
      return { pin: null };
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
  return { cells: r.cells, blocks: r.blocks, pin: r.pin ? publicPin(r.pin) : null, merged: Boolean(r.merged), display: r.display, token };
}

function onPin(cell, id, change) {
  return mutateCell(cell, (pins, now) => {
    const pin = pins.find((p) => p.id === id);
    if (!pin) throw httpError(404, "That house isn't on the map anymore.");
    return change(pin, pins, now);
  });
}

// "Lit tonight": anyone can confirm a house is still glowing.
export async function confirmLit(cell, id) {
  const r = await onPin(cell, id, (pin, pins, now) => {
    pin.l = now;
    pin.lc = (pin.lc || 0) + 1;
    return { pin };
  });
  return { cells: r.cells, pin: publicPin(r.pin) };
}

// "Worth the Drive": anyone can vote a house up. Votes only ever add.
export async function voteWorthTheDrive(cell, id) {
  const r = await onPin(cell, id, (pin) => {
    pin.w = (pin.w || 0) + 1;
    return { pin };
  });
  return { cells: r.cells, pin: publicPin(r.pin) };
}

// "I see this display too": a second device makes a named display public.
export async function confirmDisplay(cell, id, key) {
  const r = await onPin(cell, id, (pin, pins, now) => {
    if (!pin.d) throw httpError(404, "That one isn't a public display.");
    const display = vouch(pin, key, now);
    if (display === "same") throw httpError(409, "Thanks! It needs someone else to see it too.");
    if (display === "already") throw httpError(409, "You've already confirmed this one ⭐");
    return { pin, display };
  });
  return { cells: r.cells, pin: publicPin(r.pin), display: r.display };
}

// Owner moderation: take a house off the map entirely.
export async function removePin(cell, id) {
  const r = await onPin(cell, id, (pin, pins) => {
    pins.splice(pins.indexOf(pin), 1);
    return {};
  });
  return { cells: r.cells };
}

// Owner only: puts a list of known public displays on the map, already confirmed, with their dates.
// Safe to run twice: a display already within CONFIRM_METERS of a seeded spot gets the seeded name
// and dates instead of a second star. Seeded displays carry no device key, so anyone's later
// "I see this display too" still counts as their own look.
export async function seedDisplays(list) {
  const byCell = {};
  for (const item of list) (byCell[cellOf(item.lat, item.lng)] ||= []).push(item);
  const results = [];
  let cells = {};
  for (const [cell, items] of Object.entries(byCell)) {
    const r = await mutateCell(cell, (pins, now) => {
      const done = [];
      for (const item of items) {
        const lat = roundCoord(item.lat);
        const lng = roundCoord(item.lng);
        // An existing display nearby, or a plain house right on the spot, becomes the seeded display.
        let pin =
          nearestDisplay(pins, lat, lng, null) || pins.find((p) => !p.d && distanceMeters(lat, lng, p.lat, p.lng) < DEDUPE_METERS) || null;
        const added = !pin;
        if (added) {
          if (pins.length >= MAX_PINS_PER_CELL) throw httpError(503, "This area of the map is full for now.");
          pin = { id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, lat, lng, c: 1, rs: 0, rn: 0, n: [], v: {}, t: now, u: now, l: now };
          pins.push(pin);
        }
        const d = pin.d || { by: [], at: now };
        d.n = item.name;
        d.ok = d.ok || now;
        d.s = 1;
        withWhen(d, item.when);
        pin.d = d;
        done.push({ name: item.name, id: pin.id, added });
      }
      return { done };
    });
    results.push(...r.done);
    cells = { ...cells, ...r.cells };
  }
  return { results, cells };
}

// --- Lit blocks -----------------------------------------------------------------
//
// "I see lights here" from a car saves the stretch of street, not a house (see lib/blocks.js).
// The block lives in the cell of its middle. Tokens work like house tokens: "30_-82~<random>".

export async function addBlockTap({ lat, lng, street, hundred, line, key }) {
  const mid = midpoint(line);
  const cell = cellOf(roundCoord(mid.lat), roundCoord(mid.lng));
  const token = `${cell}~${crypto.randomUUID()}`;
  const r = await mutateCell(cell, (pins, now) =>
    tapBlock(pins.blocks, now, { lat, lng, street, hundred, line, key, token, expires: now + RECEIPT_MS })
  );
  return {
    cells: r.cells,
    blocks: r.blocks,
    block: publicBlock(r.block),
    merged: r.merged,
    counted: r.counted,
    token: r.counted ? token : null,
  };
}

// Takes back your own recent tap (Undo on the "Block lit" toast).
export async function undoBlockTap(token) {
  const cell = cellOfToken(token);
  const r = await mutateCell(cell, (pins) => ({ block: untapBlock(pins.blocks, token) }));
  return { cells: r.cells, blocks: r.blocks, block: r.block ? publicBlock(r.block) : null };
}

// Owner moderation: take a lit block off the map.
export async function removeBlock(cell, id) {
  const r = await mutateCell(cell, (pins) => {
    const i = pins.blocks.findIndex((b) => b.id === id);
    if (i < 0) throw httpError(404, "That block isn't on the map anymore.");
    pins.blocks.splice(i, 1);
    return {};
  });
  return { cells: r.cells, blocks: r.blocks };
}
