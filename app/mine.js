// Houses you just added, kept on this device for a few minutes.
//
// The house list the map downloads is cached for a little while (GET /api/pins), so a refresh
// right after you add a house can bring back a list from before it. To keep that from looking
// like your house vanished, the map remembers your own recent adds here and lays them over any
// list it downloads, until the cache catches up. It also remembers houses you took back (undo,
// or moved elsewhere) so an old list can't bring them back.
//
// Only this device ever sees this. Storage can be missing or blocked (private mode), so every
// read and write is wrapped and the map works the same without it.

import { cellOf } from "../lib/region";

const KEY = "hh:mine";
export const KEEP_MS = 10 * 60 * 1000;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (raw && typeof raw === "object" && raw.pins && raw.gone) return raw;
  } catch {}
  return { pins: {}, gone: {} };
}

function save(data) {
  try {
    if (!Object.keys(data.pins).length && !Object.keys(data.gone).length) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

// Reads the store, dropping anything older than KEEP_MS.
function fresh() {
  const data = load();
  const now = Date.now();
  let changed = false;
  for (const [id, v] of Object.entries(data.pins)) {
    if (!v || !v.pin || !(now - v.at < KEEP_MS)) {
      delete data.pins[id];
      changed = true;
    }
  }
  for (const [id, at] of Object.entries(data.gone)) {
    if (!(now - at < KEEP_MS)) {
      delete data.gone[id];
      changed = true;
    }
  }
  if (changed) save(data);
  return data;
}

// Remember a house you just added (or moved, or named), as the server saved it.
export function rememberMine(pin) {
  if (!pin || !pin.id) return;
  const data = fresh();
  data.pins[pin.id] = { pin, at: Date.now() };
  delete data.gone[pin.id];
  save(data);
}

// Stop laying this house over downloaded lists (it's still on the server, just not "yours").
export function dropMine(id) {
  const data = fresh();
  if (!data.pins[id]) return;
  delete data.pins[id];
  save(data);
}

// Cells that hold one of your recent houses, with a quick summary for the national map.
export function myCells() {
  const out = {};
  for (const { pin } of Object.values(fresh().pins)) {
    const cell = cellOf(pin.lat, pin.lng);
    (out[cell] ||= []).push(pin);
  }
  return out;
}

// After a save, the server's reply is the truth for the cells it sends back: refresh our copies
// from it, and anything of ours missing from those cells is gone (undone, moved or removed).
export function reconcileMine(cells) {
  if (!cells) return;
  const data = fresh();
  let changed = false;
  for (const [id, v] of Object.entries(data.pins)) {
    const cell = cellOf(v.pin.lat, v.pin.lng);
    if (!cells[cell]) continue;
    const now = cells[cell].find((p) => p.id === id);
    if (now) data.pins[id] = { pin: now, at: v.at };
    else {
      delete data.pins[id];
      data.gone[id] = Date.now();
    }
    changed = true;
  }
  if (changed) save(data);
}

// Someone else changed it since our copy: their version is newer than ours.
const newer = (a, b) => (a.u || 0) > (b.u || 0) || (a.l || 0) > (b.l || 0) || (a.c || 1) > (b.c || 1);

// Lays your recent houses over a freshly downloaded (possibly cached) list. Returns new arrays,
// never changes the ones passed in.
export function withMine(cells) {
  if (!cells) return cells;
  const data = fresh();
  const gone = data.gone;
  const mine = Object.values(data.pins).map((v) => v.pin);
  if (!mine.length && !Object.keys(gone).length) return cells;
  const out = {};
  for (const [cell, pins] of Object.entries(cells)) {
    let list = pins.filter((p) => !gone[p.id]);
    for (const m of mine) {
      if (cellOf(m.lat, m.lng) !== cell) continue;
      const i = list.findIndex((p) => p.id === m.id);
      if (i < 0) list = [...list, m];
      else if (!newer(list[i], m)) list = list.map((p, j) => (j === i ? m : p));
    }
    out[cell] = list;
  }
  return out;
}

// --- Lit blocks you just tapped -------------------------------------------------
// The same idea for blocks: your recent taps survive a cached download for a few minutes.

const BKEY = "hh:mineBlocks";

function loadBlocks() {
  try {
    const raw = JSON.parse(localStorage.getItem(BKEY) || "null");
    if (raw && typeof raw === "object" && raw.blocks && raw.gone) return raw;
  } catch {}
  return { blocks: {}, gone: {} };
}

function saveBlocks(data) {
  try {
    if (!Object.keys(data.blocks).length && !Object.keys(data.gone).length) localStorage.removeItem(BKEY);
    else localStorage.setItem(BKEY, JSON.stringify(data));
  } catch {}
}

function freshBlocks() {
  const data = loadBlocks();
  const now = Date.now();
  for (const [id, v] of Object.entries(data.blocks)) if (!v || !v.block || !(now - v.at < KEEP_MS)) delete data.blocks[id];
  for (const [id, at] of Object.entries(data.gone)) if (!(now - at < KEEP_MS)) delete data.gone[id];
  return data;
}

// cell: the block's cell, as the server filed it.
export function rememberMyBlock(cell, block) {
  if (!block || !block.id || !cell) return;
  const data = freshBlocks();
  data.blocks[block.id] = { block, cell, at: Date.now() };
  delete data.gone[block.id];
  saveBlocks(data);
}

export function dropMyBlock(id) {
  const data = freshBlocks();
  delete data.blocks[id];
  saveBlocks(data);
}

// Cells holding one of your recent blocks, for the national summary.
export function myBlockCells() {
  const out = {};
  for (const v of Object.values(freshBlocks().blocks)) (out[v.cell] ||= []).push(v.block);
  return out;
}

// A save's reply is the truth for its cells: anything of ours missing there is gone.
export function reconcileMyBlocks(blocks) {
  if (!blocks) return;
  const data = freshBlocks();
  for (const [id, v] of Object.entries(data.blocks)) {
    if (!blocks[v.cell]) continue;
    const now = blocks[v.cell].find((b) => b.id === id);
    if (now) data.blocks[id] = { ...v, block: now };
    else {
      delete data.blocks[id];
      data.gone[id] = Date.now();
    }
  }
  saveBlocks(data);
}

// Lays your recent blocks over a downloaded (maybe cached) list.
export function withMyBlocks(blocks) {
  if (!blocks) return blocks;
  const data = freshBlocks();
  const mine = Object.values(data.blocks);
  if (!mine.length && !Object.keys(data.gone).length) return blocks;
  const out = {};
  for (const [cell, list0] of Object.entries(blocks)) {
    let list = list0.filter((b) => !data.gone[b.id]);
    for (const m of mine) {
      if (m.cell !== cell) continue;
      const i = list.findIndex((b) => b.id === m.block.id);
      if (i < 0) list = [...list, m.block];
      else if ((list[i].u || 0) < (m.block.u || 0) || (list[i].c || 1) < (m.block.c || 1)) list = list.map((b, j) => (j === i ? m.block : b));
    }
    out[cell] = list;
  }
  return out;
}
