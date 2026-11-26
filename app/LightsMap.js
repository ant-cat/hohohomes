"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VIBES, WOW, isShowstopper, glowFor } from "../lib/vibes";
import { isDisplay, checkName, checkWhen, displayPhase, NAME_MAX, HOURS_MAX } from "../lib/displays";
import ScoutBadges from "./ScoutBadges";
import { scoutAdded, scoutUndone, scoutMoved, scoutLit, scoutWow, scoutTagged } from "./scout";
import { inUSA, cellOf, cellsInBounds, USA_CENTER, LOWER_48, snapNear, parseNear, parseZoom, groupAreas } from "../lib/region";
import { snapToBuilding, metersBetween, placeName } from "./geo";
import { primeAudio, chime, haptic, lightUp } from "./fx";
import { popupNode, isFresh, rememberConfirmed, rememberVoted, rememberMyDisplay, forgetMyDisplay } from "./popup";
import Welcome, { shouldWelcome, rememberWelcomed } from "./Welcome";
import { track } from "../lib/analytics";
import { rememberMine, dropMine, myCells, reconcileMine, withMine } from "./mine";
import { locate, locateTrouble } from "./locate";
import { blockGlow, blockTitle, midpoint, sameStreet, metersToLine, MERGE_METERS } from "../lib/blocks";
import { findStreet, nearbyAddresses, hundredFrom } from "./street";
import { blockNode } from "./blockCard";
import { rememberMyBlock, dropMyBlock, myBlockCells, reconcileMyBlocks, withMyBlocks } from "./mine";

const STYLE = "https://tiles.openfreemap.org/styles/dark";
// Below LOAD_ZOOM the map shows one glow per area (nearby 1° cells from the national summary,
// see groupAreas); from there in, it downloads the houses of the cells in view.
const LOAD_ZOOM = 7.5;
const MAX_LOAD_CELLS = 40;
const CELL_STALE_MS = 2 * 60 * 1000;

// Zoomed out, houses gather into glowing Hot Zones; from ORB_ZOOM in, each house is a twinkling light.
const CLUSTER_MAX_ZOOM = 13;
const ORB_ZOOM = 14;
const MAX_ORBS = 300;
// Confirmed public displays are gold stars, shown from the moment their area loads.
const MAX_STARS = 150;
// From here in, a star carries its name.
const STAR_NAME_ZOOM = 13;
// Map filters: everything, Showstoppers only, or public displays only.
const FILTERS = {
  all: { keepHouse: () => true, keepStar: () => true },
  show: { keepHouse: isShowstopper, keepStar: isShowstopper },
  disp: { keepHouse: () => false, keepStar: () => true },
};
const MAX_ZONE_LABELS = 24;
const HUES = ["warm", "warm", "warm", "red", "gold", "green", "blue", "warm", "pink", "gold"];
const SPARK_COLORS = ["#fff1c9", "#ff5a5f", "#ffc94d", "#5fe39a", "#7cc4ff", "#ff8fc7"];
// Lit blocks (a stretch of street lit from a car, see lib/blocks.js) glow from this zoom in, as a
// band along the street with a string of bulbs that chase along it.
const BLOCK_MIN_ZOOM = 10;
const BULB_SPACING_M = 11;
// GPS worse than this can't tell one street from the next, so you tap the house instead.
const BLOCK_MAX_ACCURACY_M = 80;
// Reports this close to a house count toward it (the server's rule too, in lib/pins.js).
const DEDUPE_METERS = 20;
// A house shown the moment you tap, before the server has saved it.
const PENDING = "new-";
const isPending = (id) => typeof id === "string" && id.startsWith(PENDING);

// Fixed snowflake positions (the same on server and client).
const SNOW = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: `${1.5 + ((i * 7) % 5) / 2}px`,
  dur: `${5 + ((i * 13) % 7)}s`,
  delay: `${-((i * 29) % 11)}s`,
  dx: `${((i * 17) % 21) - 10}px`,
}));
// The sound button: a sleigh bell that rings (waves) or sits quiet (a small ✕).
function JingleBell({ muted }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <g transform="translate(-2.6 .4) scale(1.02)" opacity={muted ? 0.55 : 1}>
        <path d="M9.6 6.2c-1.3-.9-2.9-.7-3.6.2 1.2.9 2.6.9 3.6-.2z" fill="#7fa58a" />
        <path d="M14.4 6.2c1.3-.9 2.9-.7 3.6.2-1.2.9-2.6.9-3.6-.2z" fill="#6c9478" />
        <circle cx="12" cy="5.4" r="1.7" fill="none" stroke="#d9b56a" strokeWidth="1.4" />
        <circle cx="12" cy="13.6" r="6.6" fill="#d9b56a" />
        <path d="M5.6 12.6h12.8" stroke="#9a7a3c" strokeWidth="1.3" />
        <circle cx="12" cy="16.4" r="1.25" fill="#7a5c28" />
        <path d="M12 17.4v2.4" stroke="#7a5c28" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="9.6" cy="10.6" r="1.1" fill="#f3e2b4" opacity=".7" />
      </g>
      {muted ? (
        <path d="M18 10.5l4 4M22 10.5l-4 4" stroke="#f0e4c8" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <g className="bell-waves" fill="none" stroke="#f0e4c8" strokeWidth="1.5" strokeLinecap="round">
          <path d="M17.8 10.3c.9.9 1.3 2 1.3 3.2s-.4 2.3-1.3 3.2" />
          <path d="M20.4 8.4c1.4 1.4 2.1 3.2 2.1 5.1s-.7 3.7-2.1 5.1" opacity=".55" />
        </g>
      )}
    </svg>
  );
}

const DISPLAY_SAID = {
  pending: "⭐ Saved! It shows on the map once someone else confirms it.",
  same: "⭐ Saved! It still needs someone else to confirm it.",
  confirmed: "⭐ You confirmed it. It's on the map now!",
  seen: "⭐ Added your vote for this display.",
  already: "⭐ You've already confirmed this one.",
};

// The Displays filter: a little gold star that glints.
function StarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.8l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3.1-5.4 3.1 1.2-6-4.5-4.2 6.1-.7z"
        fill="#ffc94d"
        stroke="#ffe7a8"
        strokeWidth=".8"
        strokeLinejoin="round"
      />
      <path className="glint" d="M18.6 3.2v3M17.1 4.7h3" stroke="#fff6dc" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

// A string of fairy lights along the top of the bottom dock, each with its own twinkle.
const DOCK_LIGHTS = Array.from({ length: 11 }, (_, i) => `${-((i * 0.73) % 2.6).toFixed(2)}s`);


function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Houses for the glows and sparks. Public displays draw as their own stars instead.
function toGeoJSON(pins, filter = "all") {
  pins = pins.filter((p) => !isDisplay(p) && FILTERS[filter].keepHouse(p));
  return {
    type: "FeatureCollection",
    features: pins.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, b: Math.round(glowFor(p) * 100) / 100, s: isShowstopper(p) ? 1 : 0, h: hash(p.id) % SPARK_COLORS.length },
    })),
  };
}

// Lit blocks as lines (the glowing band) and as bulbs every few meters along them.
function blocksGeoJSON(blocks, filter = "all") {
  const lines = [];
  const bulbs = [];
  if (filter === "all") {
    for (const bk of blocks) {
      if (!bk.g || bk.g.length < 2) continue;
      const b = Math.round(blockGlow(bk) * 100) / 100;
      lines.push({ type: "Feature", geometry: { type: "LineString", coordinates: bk.g }, properties: { id: bk.id, b } });
      // Bulbs: walk the stretch in flat meters.
      const lat0 = bk.g[0][1];
      const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
      let carry = BULB_SPACING_M / 2;
      let k = hash(bk.id) % 5;
      for (let i = 1; i < bk.g.length; i++) {
        const [ax, ay] = bk.g[i - 1];
        const [bx, by] = bk.g[i];
        const len = Math.hypot((bx - ax) * kx, (by - ay) * 111320);
        for (let d = carry; d < len; d += BULB_SPACING_M) {
          const t = d / len;
          bulbs.push({
            type: "Feature",
            geometry: { type: "Point", coordinates: [ax + t * (bx - ax), ay + t * (by - ay)] },
            properties: { id: bk.id, b, ph: k % 3, h: k % SPARK_COLORS.length },
          });
          k++;
        }
        carry = (carry - len) % BULB_SPACING_M;
        if (carry < 0) carry += BULB_SPACING_M;
      }
    }
  }
  return { lines: { type: "FeatureCollection", features: lines }, bulbs: { type: "FeatureCollection", features: bulbs } };
}

function makeOrb(p) {
  const h = hash(p.id);
  const el = document.createElement("button");
  el.type = "button";
  el.className = `orb h-${HUES[h % HUES.length]}`;
  el.setAttribute("aria-label", "House with lights");
  // Staggered timing so a street reads like a string of fairy lights.
  el.style.setProperty("--d", `-${((h >>> 4) % 3000) / 1000}s`);
  el.style.setProperty("--t", `${1.8 + ((h >>> 9) % 16) / 10}s`);
  el.appendChild(document.createElement("i"));
  return el;
}

// A public display: a gold star with its name underneath.
function makeStar(p) {
  const h = hash(p.id);
  const el = document.createElement("button");
  el.type = "button";
  el.className = "orb star";
  el.setAttribute("aria-label", `Public display: ${p.d.n}`);
  el.style.setProperty("--d", `-${((h >>> 4) % 4000) / 1000}s`);
  const star = document.createElement("i");
  const name = document.createElement("span");
  name.className = "star-name";
  name.textContent = p.d.n;
  el.append(star, name);
  return el;
}

async function api(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Couldn't reach HoHoHomes. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Our API sends { error: "text" }; Vercel's own errors send { error: { code, message } }.
    const msg = typeof data.error === "string" ? data.error : "";
    throw new Error(msg || (res.status === 429 ? "Slow down a little and try again." : "Could not save that, try again."));
  }
  return data;
}

// Houses, Showstoppers and displays in one cell, for the zoomed-out map.
function summarize(pins) {
  let lat = 0;
  let lng = 0;
  for (const p of pins) {
    lat += p.lat;
    lng += p.lng;
  }
  return {
    n: pins.length,
    s: pins.filter(isShowstopper).length,
    d: pins.filter(isDisplay).length,
    lat: lat / pins.length,
    lng: lng / pins.length,
  };
}

function loadMuted() {
  try {
    return localStorage.getItem("hh:muted") === "1";
  } catch {
    return false;
  }
}

export default function LightsMap() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const libRef = useRef(null);
  const pinsRef = useRef([]);
  const modeRef = useRef("idle");
  const sessionRef = useRef(null); // the pin you just dropped: token, vibes, location
  const adjustRef = useRef(null); // draggable marker while adjusting
  const orbsRef = useRef(new Map());
  const zonesRef = useRef(new Map());
  const popupRef = useRef(null);
  const hiddenIdRef = useRef(null);
  const mutedRef = useRef(false);
  const lastWriteRef = useRef(0);
  const vibeTimerRef = useRef(null);
  const nameRef = useRef(""); // the display name being typed in the tray
  const whenRef = useRef({ from: "", to: "", hours: "" }); // its season, also typed in the tray
  const openPopupRef = useRef(() => {});
  const cellsRef = useRef(new Map()); // cell -> { pins, at }: the houses downloaded so far
  const pendingRef = useRef(new Map()); // id -> pin: houses you just tapped, still saving
  const summaryRef = useRef(null); // cell -> { n, s, lat, lng }: houses per cell, nationwide
  const dropAtRef = useRef(() => {});
  const blockChaseRef = useRef(null);
  const blocksRef = useRef(new Map()); // cell -> lit blocks downloaded so far
  const pendingBlocksRef = useRef(new Map()); // id -> a block you just tapped, still saving
  const blockSessionRef = useRef(null); // your last block tap: token, for Undo
  const fromBlockRef = useRef(null); // picking a house from a lit block's card
  const openBlockRef = useRef(() => {});

  const [count, setCount] = useState(null);
  const [shows, setShows] = useState(0); // how many Showstoppers
  const [displays, setDisplays] = useState(0); // how many public displays
  const [filter, setFilter] = useState("all"); // all | show (Showstoppers only) | disp (public displays only)
  const filterRef = useRef("all");
  const [mode, setMode] = useState("idle"); // idle | locating | picking | adjusting
  const [toast, setToast] = useState("");
  const [locHelp, setLocHelp] = useState(null); // { title, fix, action, again } when finding you didn't work
  const [blockDrop, setBlockDrop] = useState(null); // { status, title, merged, counted } after lighting a block
  const [finding, setFinding] = useState(""); // "" | "you" | "street": what "I see lights here" is waiting on

  // Keep the bottom dock above the on-screen keyboard while typing an address.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const lift = () => {
      const kb = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
      root.style.setProperty("--kb", `${kb > 80 ? kb : 0}px`);
    };
    lift();
    vv.addEventListener("resize", lift);
    vv.addEventListener("scroll", lift);
    return () => {
      vv.removeEventListener("resize", lift);
      vv.removeEventListener("scroll", lift);
      root.style.removeProperty("--kb");
    };
  }, []);
  const [query, setQuery] = useState("");
  const [mapError, setMapError] = useState("");
  const [drop, setDrop] = useState(null); // { status, merged, snapped, rough, vibes }
  const [trayOpen, setTrayOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [welcome, setWelcome] = useState(false); // first visit on this device
  const [hint, setHint] = useState(false); // "near me or pinch to explore", until they move the map
  const [touch, setTouch] = useState(true);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const m = loadMuted();
    mutedRef.current = m;
    setMuted(m);
    setWelcome(shouldWelcome());
    try {
      setTouch(window.matchMedia("(pointer: coarse)").matches);
    } catch {}
  }, []);

  const closeWelcome = useCallback(() => {
    rememberWelcomed();
    setWelcome(false);
    if (!mutedRef.current) primeAudio(); // this tap lets iOS play the chime later
  }, []);

  const say = useCallback((msg, ms = 3200) => {
    setToast(msg);
    if (msg) setTimeout(() => setToast((t) => (t === msg ? "" : t)), ms);
  }, []);

  // When we can't find you: say why and how to fix it, and stay up long enough to read.
  const explainLocate = useCallback((err, again) => {
    const help = { ...locateTrouble(err), again };
    setToast("");
    setLocHelp(help);
    setTimeout(() => setLocHelp((h) => (h === help ? null : h)), 15000);
  }, []);

  // Twinkling house lights and public-display stars, as DOM markers, only for what's in view.
  const syncOrbs = useCallback(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const orbs = orbsRef.current;
    const want = new Map();
    const zoom = map.getZoom();
    const f = FILTERS[filterRef.current];
    if (zoom >= LOAD_ZOOM) {
      const b = map.getBounds();
      const padLng = (b.getEast() - b.getWest()) * 0.15;
      const padLat = (b.getNorth() - b.getSouth()) * 0.15;
      const inView = (p) =>
        p.id !== hiddenIdRef.current &&
        p.lng > b.getWest() - padLng &&
        p.lng < b.getEast() + padLng &&
        p.lat > b.getSouth() - padLat &&
        p.lat < b.getNorth() + padLat;
      const c = map.getCenter();
      const nearest = (list, max) =>
        list.length <= max
          ? list
          : list
              .map((p) => [(p.lng - c.lng) ** 2 + (p.lat - c.lat) ** 2, p])
              .sort((x, y) => x[0] - y[0])
              .slice(0, max)
              .map((x) => x[1]);
      const stars = pinsRef.current.filter((p) => isDisplay(p) && f.keepStar(p) && inView(p));
      for (const p of nearest(stars, MAX_STARS)) want.set(p.id, p);
      if (zoom >= ORB_ZOOM) {
        const houses = pinsRef.current.filter((p) => !isDisplay(p) && f.keepHouse(p) && inView(p));
        for (const p of nearest(houses, MAX_ORBS)) want.set(p.id, p);
      }
    }
    map.getContainer().classList.toggle("star-names", zoom >= STAR_NAME_ZOOM);
    for (const [id, o] of orbs) {
      const p = want.get(id);
      if (!p || o.star !== isDisplay(p) || (o.star && o.name !== p.d.n)) {
        o.marker.remove();
        orbs.delete(id);
      }
    }
    const now = Date.now();
    for (const [id, p] of want) {
      let o = orbs.get(id);
      if (!o) {
        const star = isDisplay(p);
        const el = star ? makeStar(p) : makeOrb(p);
        el.dataset.id = id;
        if (p.born) el.classList.add("born");
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          // A house that's still saving has nothing to show yet.
          if (modeRef.current === "idle" && !isPending(el.dataset.id)) openPopupRef.current(el.dataset.id);
        });
        const marker = new lib.Marker({ element: el, anchor: star ? "top" : "center", offset: star ? [0, -17] : [0, 0] })
          .setLngLat([p.lng, p.lat])
          .addTo(map);
        o = { marker, el, lng: p.lng, lat: p.lat, star, name: star ? p.d.n : "" };
        orbs.set(id, o);
      } else if (o.lng !== p.lng || o.lat !== p.lat) {
        o.marker.setLngLat([p.lng, p.lat]);
        o.lng = p.lng;
        o.lat = p.lat;
      }
      // Houses are always lit, brighter with every vote. A display with dates is lit through its
      // season, and looks lighter before and after it.
      const phase = o.star ? displayPhase(p.d, now) : "";
      if (!o.star) o.el.style.setProperty("--b", glowFor(p).toFixed(2));
      o.el.classList.toggle("stale", o.star && !phase && !isFresh(p, now));
      o.el.classList.toggle("soon", phase === "soon" || phase === "over");
      o.el.classList.toggle("show", isShowstopper(p));
    }
  }, []);

  // Redraws everything from the downloaded cells and the national summary.
  const setPins = useCallback(
    (pins) => {
      pinsRef.current = pins;
      // National totals: downloaded cells count exactly, the rest come from the summary.
      let total = pins.length;
      let stars = pins.filter(isShowstopper).length;
      let named = pins.filter(isDisplay).length;
      const summary = summaryRef.current || {};
      for (const [cell, v] of Object.entries(summary)) {
        if (cellsRef.current.has(cell)) continue;
        total += v.n;
        stars += v.s;
        named += v.d || 0;
      }
      if (summaryRef.current || pins.length) setCount(total);
      setShows(stars);
      setDisplays(named);
      const filter = filterRef.current;
      const map = mapRef.current;
      const src = map && map.getSource("pins");
      if (src) src.setData(toGeoJSON(pins, filter));
      const bsrc = map && map.getSource("blocks");
      const bulbSrc = map && map.getSource("block-bulbs");
      if (bsrc && bulbSrc) {
        const g = blocksGeoJSON(flatBlocks(), filter);
        bsrc.setData(g.lines);
        bulbSrc.setData(g.bulbs);
      }
      const sum = map && map.getSource("summary");
      if (sum) {
        const n = (v) => (filter === "show" ? v.s : filter === "disp" ? v.d || 0 : v.n);
        const cells = Object.entries(summary)
          .filter(([, v]) => n(v) > 0)
          .map(([cell, v]) => ({ cell, n: n(v), s: v.s, d: v.d || 0, lat: v.lat, lng: v.lng }));
        sum.setData({
          type: "FeatureCollection",
          features: groupAreas(cells).map((a) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [a.lng, a.lat] },
            properties: {
              cell: a.cell,
              n: a.n,
              s: a.s,
              d: a.d,
              nameLat: a.name.lat,
              nameLng: a.name.lng,
              w: a.box[0],
              so: a.box[1],
              e: a.box[2],
              no: a.box[3],
            },
          })),
        });
      }
      syncOrbs();
    },
    [syncOrbs]
  );

  // Everything on the map: the downloaded cells, plus houses you just tapped that are still saving.
  const flatPins = () => [...[...cellsRef.current.values()].flatMap((c) => c.pins), ...pendingRef.current.values()];
  const flatBlocks = () => [...[...blocksRef.current.values()].flat(), ...pendingBlocksRef.current.values()];

  // Takes cells from the server and redraws. A save's reply (saved) is the truth for its cells.
  // A download may come from a short-lived cache, so your own recent houses are laid over it.
  // blocks: the lit blocks of the same cells, when the server sent them.
  const applyCells = useCallback(
    (cells, { saved = true, blocks } = {}) => {
      if (!cells) return;
      if (saved) reconcileMine(cells);
      else cells = withMine(cells);
      if (blocks) {
        if (saved) reconcileMyBlocks(blocks);
        else blocks = withMyBlocks(blocks);
        for (const [cell, list] of Object.entries(blocks)) blocksRef.current.set(cell, list);
      }
      const now = Date.now();
      const summary = (summaryRef.current ||= {});
      for (const [cell, pins] of Object.entries(cells)) {
        cellsRef.current.set(cell, { pins, at: now });
        // A cell with only lit blocks stays in the summary, so it keeps being downloaded.
        const nb = (blocksRef.current.get(cell) || []).length;
        if (pins.length) summary[cell] = { ...summarize(pins), b: nb };
        else if (nb) {
          const m = midpoint(blocksRef.current.get(cell)[0].g);
          summary[cell] = { n: 0, s: 0, d: 0, b: nb, lat: m.lat, lng: m.lng };
        } else delete summary[cell];
      }
      setPins(flatPins());
    },
    [setPins]
  );

  // Changes one house locally right away; returns an undo for when the save fails.
  const patchPin = useCallback(
    (id, change) => {
      const before = new Map(cellsRef.current);
      for (const [cell, v] of cellsRef.current) {
        if (v.pins.some((p) => p.id === id)) {
          cellsRef.current.set(cell, { ...v, pins: v.pins.map((p) => (p.id === id ? change(p) : p)) });
        }
      }
      setPins(flatPins());
      return () => {
        cellsRef.current = before;
        setPins(flatPins());
      };
    },
    [setPins]
  );

  const pinCell = (id) => {
    const pin = pinsRef.current.find((p) => p.id === id);
    return pin ? cellOf(pin.lat, pin.lng) : "";
  };

  // Takes a house you just tapped off the map, fading its light out first.
  const dropPending = useCallback(
    (id, fade) => {
      const o = orbsRef.current.get(id);
      const gone = () => {
        pendingRef.current.delete(id);
        setPins(flatPins());
      };
      if (fade && o) {
        o.el.classList.add("fading");
        setTimeout(gone, 450);
      } else gone();
    },
    [setPins]
  );

  // A saved house takes over the light of the one you tapped, so it doesn't blink.
  const handOff = (fromId, toId) => {
    const orbs = orbsRef.current;
    const o = orbs.get(fromId);
    if (!o) return;
    orbs.delete(fromId);
    if (orbs.has(toId)) {
      o.marker.remove(); // an existing house already has its own light
      return;
    }
    o.el.dataset.id = toId;
    orbs.set(toId, o);
  };

  // Takes one house off the map right away (an undo). Returns a way to put it back.
  const hideLocally = (id) => {
    const before = new Map(cellsRef.current);
    for (const [cell, v] of cellsRef.current) {
      if (v.pins.some((p) => p.id === id)) {
        cellsRef.current.set(cell, { ...v, pins: v.pins.filter((p) => p.id !== id) });
      }
    }
    setPins(flatPins());
    return () => {
      for (const [cell, v] of before) {
        const now = cellsRef.current.get(cell);
        if (now && v.pins.some((p) => p.id === id) && !now.pins.some((p) => p.id === id)) {
          cellsRef.current.set(cell, { ...now, pins: [...now.pins, v.pins.find((p) => p.id === id)] });
        }
      }
      setPins(flatPins());
    };
  };

  // Downloads the houses of the cells in view (only cells the summary says have any).
  const loadingRef = useRef(false);
  const loadCells = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !summaryRef.current || loadingRef.current || map.getZoom() < LOAD_ZOOM) return;
    const b = map.getBounds();
    const c = map.getCenter();
    const now = Date.now();
    const need = cellsInBounds(b.getSouth() - 0.25, b.getWest() - 0.25, b.getNorth() + 0.25, b.getEast() + 0.25)
      .filter((cell) => summaryRef.current[cell])
      .filter((cell) => {
        const have = cellsRef.current.get(cell);
        return !have || now - have.at > CELL_STALE_MS;
      })
      .map((cell) => {
        const [lat, lng] = cell.split("_").map(Number);
        return [(lat + 0.5 - c.lat) ** 2 + (lng + 0.5 - c.lng) ** 2, cell];
      })
      .sort((x, y) => x[0] - y[0])
      .slice(0, MAX_LOAD_CELLS)
      .map((x) => x[1])
      .sort();
    if (!need.length) return;
    loadingRef.current = true;
    try {
      const data = await (await fetch(`/api/pins?cells=${need.join(",")}`)).json();
      applyCells(data.cells, { saved: false, blocks: data.blocks });
    } catch {
    } finally {
      loadingRef.current = false;
    }
  }, [applyCells]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await (await fetch("/api/summary")).json();
      if (!data.cells) throw new Error();
      // Keep what this visitor just saved: their cells are newer than the cached summary.
      const fresh = {};
      for (const [cell, v] of Object.entries(data.cells)) fresh[cell] = v;
      const recent = Date.now() - lastWriteRef.current < 2 * 60 * 1000;
      if (recent && summaryRef.current) {
        for (const [cell, v] of cellsRef.current) {
          if (Date.now() - v.at < 2 * 60 * 1000) {
            if (summaryRef.current[cell]) fresh[cell] = summaryRef.current[cell];
            else delete fresh[cell];
          }
        }
      }
      // Your own recent houses, even if the cached summary doesn't have them yet.
      for (const [cell, pins] of Object.entries(myCells())) {
        if (!fresh[cell]) fresh[cell] = summarize(pins);
      }
      for (const [cell, list] of Object.entries(myBlockCells())) {
        if (!fresh[cell]) {
          const m = midpoint(list[0].g);
          fresh[cell] = { n: 0, s: 0, d: 0, b: list.length, lat: m.lat, lng: m.lng };
        }
      }
      summaryRef.current = fresh;
      setPins(flatPins());
      loadCells();
    } catch {
      if (!summaryRef.current) setCount(0);
    }
  }, [setPins, loadCells]);

  const confirmLit = useCallback(
    async (id) => {
      haptic(20);
      if (!mutedRef.current) chime(false);
      const cell = pinCell(id);
      const now = Date.now();
      const revert = patchPin(id, (p) => ({ ...p, l: now }));
      try {
        const data = await api("POST", `/api/pins/${id}/lit?cell=${cell}`);
        lastWriteRef.current = Date.now();
        rememberConfirmed(id);
        applyCells(data.cells, { blocks: data.blocks });
        scoutLit(id);
        track("lit_tonight");
      } catch (err) {
        revert();
        say(err.message);
        throw err;
      }
    },
    [patchPin, applyCells, say]
  );

  const voteWow = useCallback(
    async (id) => {
      haptic(25);
      if (!mutedRef.current) chime(false);
      const cell = pinCell(id);
      const revert = patchPin(id, (p) => ({ ...p, w: (p.w || 0) + 1 }));
      try {
        const data = await api("POST", `/api/pins/${id}/wow?cell=${cell}`);
        lastWriteRef.current = Date.now();
        rememberVoted(id);
        applyCells(data.cells, { blocks: data.blocks });
        scoutWow(id);
        track("worth_the_drive");
      } catch (err) {
        revert();
        say(err.message);
        throw err;
      }
    },
    [patchPin, applyCells, say]
  );

  const seeDisplay = useCallback(
    async (id) => {
      haptic(25);
      if (!mutedRef.current) chime(false);
      try {
        const data = await api("POST", `/api/pins/${id}/display?cell=${pinCell(id)}`);
        lastWriteRef.current = Date.now();
        applyCells(data.cells, { blocks: data.blocks });
        if (popupRef.current) popupRef.current.remove();
        if (data.display === "confirmed") {
          say(`⭐ Confirmed! ${data.pin.d.n} is on the map now`, 4500);
          const map = mapRef.current;
          if (map) lightUp(libRef.current, map, { lng: data.pin.lng, lat: data.pin.lat });
        } else say("Thanks! ⭐");
      } catch (err) {
        say(err.message);
        throw err;
      }
    },
    [applyCells, say]
  );

  // Owner moderation. Visit /?admin=<ADMIN_KEY> once to turn it on in this browser, /?admin=off to turn it off.
  const adminKeyRef = useRef("");

  const removeHouse = useCallback(
    async (id) => {
      try {
        const res = await fetch(`/api/pins/${id}?cell=${pinCell(id)}`, {
          method: "DELETE",
          headers: { "x-admin-key": adminKeyRef.current },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not remove that, try again.");
        lastWriteRef.current = Date.now();
        if (popupRef.current) popupRef.current.remove();
        applyCells(data.cells, { blocks: data.blocks });
        say("House removed");
      } catch (err) {
        say(err.message);
        throw err;
      }
    },
    [applyCells, say]
  );

  const openPopup = useCallback(
    (id) => {
      const map = mapRef.current;
      const lib = libRef.current;
      const pin = pinsRef.current.find((p) => p.id === id);
      if (!map || !lib || !pin) return;
      if (popupRef.current) popupRef.current.remove();
      popupRef.current = new lib.Popup({ offset: 16, maxWidth: "280px" })
        .setLngLat([pin.lng, pin.lat])
        .setDOMContent(
          popupNode(pin, {
            onLit: confirmLit,
            onWow: voteWow,
            onSeeDisplay: seeDisplay,
            onRemove: adminKeyRef.current ? removeHouse : null,
          })
        )
        .addTo(map);
      // Keep the whole card clear of the header: measure both and pan just enough.
      const y = map.project([pin.lng, pin.lat]).y;
      const card = popupRef.current.getElement().getBoundingClientRect().height;
      const top = document.querySelector(".top");
      const headerBottom = top ? top.getBoundingClientRect().bottom : 0;
      const minY = headerBottom + card + 24;
      // And clear of the screen's sides, for a light near the edge.
      const rect = popupRef.current.getElement().getBoundingClientRect();
      const w = map.getContainer().clientWidth;
      const dx = rect.left < 10 ? rect.left - 10 : rect.right > w - 10 ? rect.right - (w - 10) : 0;
      if (y < minY || dx) map.panBy([dx, Math.min(0, y - minY)], { duration: 350 });
    },
    [confirmLit, voteWow, seeDisplay, removeHouse]
  );
  openPopupRef.current = openPopup;

  useEffect(() => {
    const url = new URL(window.location.href);
    const param = url.searchParams.get("admin");
    try {
      adminKeyRef.current = localStorage.getItem("hh:admin") || "";
    } catch {}
    if (param === null) return;
    // Take the key out of the address bar so it doesn't end up in history or screenshots.
    url.searchParams.delete("admin");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    const forget = () => {
      adminKeyRef.current = "";
      try {
        localStorage.removeItem("hh:admin");
      } catch {}
    };
    if (param === "off" || !param) {
      forget();
      say("Admin mode off");
      return;
    }
    fetch("/api/admin", { method: "POST", headers: { "x-admin-key": param } })
      .then((r) => {
        if (!r.ok) throw new Error();
        adminKeyRef.current = param;
        try {
          localStorage.setItem("hh:admin", param);
        } catch {}
        say("Admin mode on: tap a house to remove it", 5000);
      })
      .catch(() => {
        forget();
        say("That admin key didn't work.");
      });
  }, [say]);

  // Fly into a Hot Zone until its houses split into individual lights.
  // If the zone is too spread out to show at street level, go to its densest pocket.
  const zoomIntoZone = useCallback(async (clusterId, coords) => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const pad = Math.min(140, map.getContainer().clientHeight * 0.2);
    const fit = (points) => {
      const b = new lib.LngLatBounds();
      for (const c of points) b.extend(c);
      return map.cameraForBounds(b, { padding: { top: pad, bottom: pad, left: 40, right: 40 }, maxZoom: 17 });
    };
    let center = coords;
    let zoom = ORB_ZOOM + 0.6;
    try {
      let points = (await map.getSource("pins").getClusterLeaves(clusterId, 1000, 0)).map((f) => f.geometry.coordinates);
      let cam = points.length ? fit(points) : null;
      if (cam && cam.zoom < ORB_ZOOM + 0.3) {
        let best = [];
        for (const a of points) {
          const near = points.filter((b) => metersBetween({ lng: a[0], lat: a[1] }, { lng: b[0], lat: b[1] }) < 600);
          if (near.length > best.length) best = near;
        }
        points = best;
        cam = fit(points);
      }
      if (cam) {
        center = cam.center;
        zoom = Math.max(zoom, cam.zoom);
      }
    } catch {}
    map.flyTo({ center, zoom, speed: 1.1, curve: 1.5, essential: true });
  }, []);

  // Tapping a national glow flies into that area: close enough to see its houses, wide enough
  // to take in all of them when it spans a few cells.
  const flyToRegionRef = useRef(() => {});
  flyToRegionRef.current = (f) => {
    const map = mapRef.current;
    if (!map) return;
    const { w, so, e, no } = f.properties;
    let center = f.geometry.coordinates;
    let zoom = 10.5;
    if ([w, so, e, no].every(Number.isFinite) && (e - w > 0.05 || no - so > 0.05)) {
      const pad = 60;
      const cam = map.cameraForBounds(
        [
          [w, so],
          [e, no],
        ],
        { padding: { top: pad, bottom: pad + 120, left: pad, right: pad }, maxZoom: 10.5 }
      );
      if (cam) {
        center = cam.center;
        zoom = Math.max(LOAD_ZOOM + 0.5, cam.zoom);
      }
    }
    map.flyTo({ center, zoom, speed: 1.4, essential: true });
  };

  // Floating "San Marco • 14 houses" labels on the Hot Zones in view.
  const syncZones = useCallback(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const labels = zonesRef.current;
    const want = new Map();
    const national = map.getZoom() < LOAD_ZOOM;
    if (national && map.getLayer("region-halo")) {
      const feats = map
        .queryRenderedFeatures({ layers: ["region-halo"] })
        .sort((a, b) => b.properties.n - a.properties.n);
      for (const f of feats) {
        const p = f.properties;
        const key = `r:${p.cell}:${p.n}:${p.s}:${p.d}:${f.geometry.coordinates.join(",")}`;
        if (!want.has(key) && want.size < MAX_ZONE_LABELS) want.set(key, f);
      }
    } else if (map.getZoom() < ORB_ZOOM && map.getLayer("zone-halo")) {
      const feats = map
        .queryRenderedFeatures({ layers: ["zone-halo"] })
        .sort((a, b) => b.properties.point_count - a.properties.point_count);
      for (const f of feats) {
        const key = `${f.properties.cluster_id}`;
        if (!want.has(key) && want.size < MAX_ZONE_LABELS) want.set(key, f);
      }
    }
    // Biggest zones get labels first. A label that would sit on top of another tries just above,
    // then just below, its glow (zoomed far out, Houston and Jacksonville share a row), and is
    // skipped if neither is free.
    // Near a screen edge a label hangs inward so it isn't cut off; overlap checks use where it really sits.
    const placed = [];
    const anchors = new Map();
    const shifts = new Map();
    const w = map.getContainer().clientWidth;
    const LIFT = 34;
    for (const [key, f] of [...want]) {
      const pt = map.project(f.geometry.coordinates);
      const anchor = pt.x < 90 ? "left" : pt.x > w - 90 ? "right" : "center";
      const cx = pt.x + (anchor === "left" ? 75 : anchor === "right" ? -75 : 0);
      const free = (dy) => !placed.some((q) => Math.abs(q.x - cx) < 160 && Math.abs(q.y - (pt.y + dy)) < 34);
      const dy = [0, -LIFT, LIFT].find(free);
      if (dy === undefined) want.delete(key);
      else {
        placed.push({ x: cx, y: pt.y + dy });
        anchors.set(key, anchor);
        shifts.set(key, dy);
      }
    }
    for (const [key, z] of labels) {
      if (!want.has(key)) {
        z.marker.remove();
        labels.delete(key);
      }
    }
    const precision = national ? 1 : map.getZoom() < 11 ? 2 : 3;
    for (const [key, f] of want) {
      const dy = shifts.get(key) || 0;
      if (labels.has(key)) {
        const z = labels.get(key);
        if (z.anchor !== anchors.get(key) || z.dy !== dy) {
          z.marker.remove();
          labels.delete(key);
        } else continue;
      }
      const n = national ? f.properties.n : f.properties.point_count;
      const [lng, lat] = f.geometry.coordinates;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "zone-label";
      const name = document.createElement("b");
      const meta = document.createElement("span");
      const stars = (national ? f.properties.s : f.properties.shows) || 0;
      const named = national ? f.properties.d || 0 : 0;
      meta.textContent =
        filterRef.current === "show"
          ? `${n} ${n === 1 ? "showstopper" : "showstoppers"} 🤩`
          : filterRef.current === "disp"
            ? `${n} public ${n === 1 ? "display" : "displays"} ⭐`
            : `${n} houses${stars ? ` • ${stars} 🤩` : ""}${named ? ` • ${named} ⭐` : ""}`;
      el.append(name, meta);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (modeRef.current !== "idle") return;
        if (national) flyToRegionRef.current(f);
        else zoomIntoZone(f.properties.cluster_id, [lng, lat]);
      });
      const marker = new lib.Marker({ element: el, anchor: anchors.get(key) || "center", offset: [0, dy] })
        .setLngLat([lng, lat])
        .addTo(map);
      labels.set(key, { marker, anchor: anchors.get(key), dy });
      // An area is named after its busiest cell, so a metro that spans two cells keeps its city's name.
      const nameAt = national
        ? placeName(f.properties.nameLng ?? lng, f.properties.nameLat ?? lat, precision, "city")
        : placeName(lng, lat, precision, "hood");
      nameAt
        .then((place) => {
          if (place && el.isConnected) {
            name.textContent = place;
            el.classList.add("named");
          }
        })
        .catch(() => {});
    }
  }, [zoomIntoZone]);

  // Map setup
  useEffect(() => {
    let cancelled = false;
    let map;
    // The national summary loads on its own, so the count shows even if the map can't draw.
    loadSummary();

    (async () => {
      let maplibregl;
      try {
        maplibregl = (await import("maplibre-gl")).default;
      } catch (err) {
        console.error(err);
        if (!cancelled) setMapError("The map didn't load. Check your connection and refresh.");
        return;
      }
      if (cancelled) return;
      libRef.current = maplibregl;
      // A shared link (?near=…) opens on that area instead of the visitor's location.
      const params = new URLSearchParams(window.location.search);
      const shared = parseNear(params.get("near"));
      const sharedZoom = parseZoom(params.get("z")) + 0.3;
      try {
        map = new maplibregl.Map({
          container: mapEl.current,
          style: STYLE,
          // Fit the lower 48 to whatever screen this is, unless the link points at an area.
          ...(shared
            ? { center: [shared.lng, shared.lat], zoom: sharedZoom }
            : { bounds: LOWER_48, fitBoundsOptions: { padding: { top: 150, bottom: 140, left: 16, right: 16 } } }),
          minZoom: 1.5,
          maxZoom: 19,
          // Credits live in our own (i) toggle above the dock, so nothing overlaps.
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) setMapError("This browser can't draw the map. Try Safari or Chrome on your phone.");
        return;
      }
      map.touchZoomRotate.disableRotation();

      // Open on the whole country rather than guessing a city, which can land on an empty patch
      // of map. A hint offers "near me" (the only thing that asks for location) or pinch to explore,
      // and goes away the moment they move the map themselves.
      if (!shared) setHint(true);
      const unhint = (e) => e.originalEvent && setHint(false);
      map.on("dragstart", unhint);
      map.on("zoomstart", unhint);
      map.on("click", () => setHint(false));
      mapRef.current = map;
      map.on("error", (e) => console.error("map error", e && e.error));

      map.on("load", () => {
        // A deep-navy night look so the lights pop.
        const tint = [
          ["background", "background-color", "#0b1020"],
          ["water", "fill-color", "#0f1a33"],
          ["waterway", "line-color", "#0f1a33"],
          ["landuse_park", "fill-color", "#0f1d1a"],
          ["building", "fill-color", "#141a2c"],
          ["highway_minor", "line-color", "#262d44"],
          ["highway_major_inner", "line-color", "#323a57"],
          ["highway_major_subtle", "line-color", "#323a57"],
          ["highway_motorway_inner", "line-color", "#3d466a"],
          ["highway_name_other", "text-color", "#7d86a3"],
          ["place_suburb", "text-color", "#9aa3c0"],
          ["place_other", "text-color", "#8a93b0"],
          ["place_city", "text-color", "#b5bdd6"],
          ["place_city_large", "text-color", "#b5bdd6"],
          ["place_town", "text-color", "#9aa3c0"],
          ["place_village", "text-color", "#9aa3c0"],
        ];
        for (const [layer, prop, value] of tint) {
          try {
            if (map.getLayer(layer)) map.setPaintProperty(layer, prop, value);
          } catch {}
        }

        // The national view: one glow per area with houses (see groupAreas). Areas are grouped by
        // distance on the ground, never merged by screen distance, so each keeps its own count and
        // place even with the whole country in view.
        map.addSource("summary", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        const regionSize = ["interpolate", ["linear"], ["get", "n"], 1, 12, 10, 20, 100, 34, 1000, 54];
        map.addLayer({
          id: "region-halo",
          type: "circle",
          source: "summary",
          maxzoom: LOAD_ZOOM,
          paint: { "circle-radius": regionSize, "circle-color": "#ffb23f", "circle-blur": 1, "circle-opacity": 0.55 },
        });
        map.addLayer({
          id: "region-core",
          type: "circle",
          source: "summary",
          maxzoom: LOAD_ZOOM,
          paint: {
            "circle-radius": ["*", 0.4, regionSize],
            "circle-color": "#ffe7a8",
            "circle-blur": 0.9,
            "circle-opacity": 0.7,
          },
        });
        map.on("click", "region-halo", (e) => {
          if (modeRef.current !== "idle") return;
          const f = e.features && e.features[0];
          if (f) flyToRegionRef.current(f);
        });

        // Lit blocks: a warm band along the street, brighter with every tap, with a string of
        // colored bulbs chasing along it. Under the houses and their zones.
        const blockData = blocksGeoJSON(flatBlocks(), filterRef.current);
        map.addSource("blocks", { type: "geojson", data: blockData.lines });
        map.addSource("block-bulbs", { type: "geojson", data: blockData.bulbs });
        const bandGrow = ["+", 1, ["*", 0.7, ["get", "b"]]];
        map.addLayer({
          id: "block-halo",
          type: "line",
          source: "blocks",
          minzoom: BLOCK_MIN_ZOOM,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffb23f",
            "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, ["*", 7, bandGrow], 14, ["*", 20, bandGrow], 18, ["*", 64, bandGrow]],
            "line-blur": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 5, 14, 14, 18, 40],
            "line-opacity": ["+", 0.4, ["*", 0.35, ["get", "b"]]],
          },
        });
        map.addLayer({
          id: "block-core",
          type: "line",
          source: "blocks",
          minzoom: BLOCK_MIN_ZOOM,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffe7a8",
            "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 1.5, 14, 4, 18, 10],
            "line-blur": ["interpolate", ["linear"], ["zoom"], 10, 1, 18, 4],
            "line-opacity": ["+", 0.55, ["*", 0.4, ["get", "b"]]],
          },
        });
        const bulbColor = ["match", ["get", "h"], ...SPARK_COLORS.slice(1).flatMap((c, i) => [i + 1, c]), SPARK_COLORS[0]];
        map.addLayer({
          id: "block-bulbs",
          type: "circle",
          source: "block-bulbs",
          minzoom: 14,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 1.6, 16, 2.6, 18, 4.5],
            "circle-color": bulbColor,
            "circle-blur": 0.35,
            "circle-opacity": 0.95,
          },
        });
        const openBlockAt = (e) => {
          if (modeRef.current !== "idle") return;
          // A neighborhood glow on top takes the tap (it zooms in); the block opens once you're close.
          const over = ["zone-halo", "spark-glow", "region-halo"].filter((l) => map.getLayer(l));
          if (over.length && map.queryRenderedFeatures(e.point, { layers: over }).length) return;
          const f = e.features && e.features[0];
          if (f) openBlockRef.current(f.properties.id, e.lngLat);
        };
        // The halo is wider than the bulbs on it, so it alone takes the tap (one card per tap).
        map.on("click", "block-halo", openBlockAt);
        map.on("mouseenter", "block-halo", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "block-halo", () => (map.getCanvas().style.cursor = ""));
        // The bulbs chase along the street, a beat at a time, like a marquee. Still for Reduce Motion.
        const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!still) {
          let beat = 0;
          blockChaseRef.current = setInterval(() => {
            if (document.hidden || map.getZoom() < 14 || !flatBlocks().length) return;
            beat = (beat + 1) % 3;
            try {
              map.setPaintProperty("block-bulbs", "circle-opacity", ["match", ["%", ["+", ["get", "ph"], beat], 3], 0, 1, 1, 0.55, 0.2]);
              map.setPaintProperty("block-halo", "line-opacity", ["+", beat === 0 ? 0.46 : 0.4, ["*", 0.35, ["get", "b"]]]);
            } catch {}
          }, 420);
        }

        map.addSource("pins", {
          type: "geojson",
          data: toGeoJSON(pinsRef.current, filterRef.current),
          cluster: true,
          clusterMaxZoom: CLUSTER_MAX_ZOOM,
          clusterRadius: 44,
          clusterProperties: { b: ["+", ["get", "b"]], shows: ["+", ["get", "s"]] },
        });

        const clustered = ["has", "point_count"];
        const single = ["!", ["has", "point_count"]];
        // Every zone is lit; the more its houses have been voted up, the brighter it glows.
        const liveliness = ["/", ["get", "b"], ["get", "point_count"]];
        const zoneSize = ["interpolate", ["linear"], ["get", "point_count"], 2, 26, 10, 40, 50, 60, 250, 84];

        map.addLayer({
          id: "zone-halo",
          type: "circle",
          source: "pins",
          filter: clustered,
          minzoom: LOAD_ZOOM,
          maxzoom: ORB_ZOOM,
          paint: {
            "circle-radius": zoneSize,
            "circle-color": "#ffb23f",
            "circle-blur": 1,
            "circle-opacity": ["+", 0.5, ["*", 0.4, liveliness]],
          },
        });
        map.addLayer({
          id: "zone-core",
          type: "circle",
          source: "pins",
          filter: clustered,
          minzoom: LOAD_ZOOM,
          maxzoom: ORB_ZOOM,
          paint: {
            "circle-radius": ["*", 0.42, zoneSize],
            "circle-color": "#ffe7a8",
            "circle-blur": 0.9,
            "circle-opacity": ["+", 0.6, ["*", 0.35, liveliness]],
          },
        });
        // A single house's glow grows with its votes (b runs 0 to 1).
        const grow = (k) => ["+", 1, ["*", k, ["get", "b"]]];
        const sparkColor = ["match", ["get", "h"], ...SPARK_COLORS.slice(1).flatMap((c, i) => [i + 1, c]), SPARK_COLORS[0]];
        map.addLayer({
          id: "spark-glow",
          type: "circle",
          source: "pins",
          filter: single,
          minzoom: LOAD_ZOOM,
          maxzoom: ORB_ZOOM,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, ["*", 6, grow(0.6)], 13, ["*", 12, grow(0.6)]],
            "circle-color": sparkColor,
            "circle-blur": 1,
            "circle-opacity": ["+", 0.45, ["*", 0.4, ["get", "b"]]],
          },
        });
        map.addLayer({
          id: "spark",
          type: "circle",
          source: "pins",
          filter: single,
          minzoom: LOAD_ZOOM,
          maxzoom: ORB_ZOOM,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, ["*", 1.6, grow(0.4)], 13, ["*", 3, grow(0.4)]],
            "circle-color": "#fff8e6",
            "circle-opacity": ["+", 0.85, ["*", 0.15, ["get", "b"]]],
          },
        });

        map.on("click", "zone-halo", (e) => {
          if (modeRef.current !== "idle") return;
          const f = e.features && e.features[0];
          if (f) zoomIntoZone(f.properties.cluster_id, f.geometry.coordinates);
        });
        map.on("click", "spark-glow", (e) => {
          if (modeRef.current !== "idle") return;
          const f = e.features && e.features[0];
          if (f) map.flyTo({ center: f.geometry.coordinates, zoom: 16.5, speed: 1.2, essential: true });
        });
        for (const layer of ["zone-halo", "spark-glow", "region-halo"]) {
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }
        setPins(flatPins());
        loadCells();
      });

      let pending = false;
      map.on("move", () => {
        if (pending) return;
        pending = true;
        setTimeout(() => {
          pending = false;
          syncOrbs();
        }, 200);
      });
      map.on("moveend", () => {
        syncOrbs();
        loadCells();
      });
      map.on("idle", syncZones);

      map.on("click", (e) => {
        const target = e.originalEvent && e.originalEvent.target;
        if (target && target.closest && target.closest(".orb, .zone-label")) return;
        if (modeRef.current === "picking") dropAtRef.current(e.lngLat);
        else if (modeRef.current === "adjusting" && adjustRef.current) adjustRef.current.setLngLat(e.lngLat);
      });
    })();
    return () => {
      cancelled = true;
      clearInterval(blockChaseRef.current);
      orbsRef.current.clear();
      zonesRef.current.clear();
      if (map) map.remove();
      mapRef.current = null;
    };
  }, [setPins, syncOrbs, syncZones, zoomIntoZone, loadSummary, loadCells]);

  // Keep displays' seasons current, and pick up other people's houses and votes now and then.
  useEffect(() => {
    const tick = setInterval(() => setPins(pinsRef.current), 60 * 1000);
    const refresh = setInterval(() => {
      if (document.hidden || sessionRef.current || Date.now() - lastWriteRef.current < 90 * 1000) return;
      loadSummary(); // then re-downloads cells in view that are more than 2 minutes old
    }, 3 * 60 * 1000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [setPins, loadSummary]);

  // --- Dropping a pin -------------------------------------------------------

  const pushVibes = useCallback(
    async (s) => {
      if (!s.token) return; // sent once the pin is saved
      const want = JSON.stringify(s.vibes);
      if (want === s.sent) return;
      s.sent = want;
      try {
        const data = await api("PATCH", "/api/pins", { token: s.token, action: "vibes", vibes: s.vibes });
        lastWriteRef.current = Date.now();
        scoutTagged(s.pinId, s.vibes.includes(WOW));
        applyCells(data.cells, { blocks: data.blocks });
      } catch (err) {
        s.sent = null;
        say(err.message);
      }
    },
    [applyCells, say]
  );

  const endSession = useCallback(() => {
    const s = sessionRef.current;
    clearTimeout(vibeTimerRef.current);
    if (s) pushVibes(s);
    sessionRef.current = null;
    setDrop(null);
    setTrayOpen(false);
  }, [pushVibes]);

  const moveSession = useCallback(
    async (s, lngLat, auto) => {
      const ok = await s.promise;
      if (!ok || !s.token) return;
      try {
        const data = await api("PATCH", "/api/pins", { token: s.token, action: "move", lat: lngLat.lat, lng: lngLat.lng });
        lastWriteRef.current = Date.now();
        scoutMoved(s.pinId, data.pin.id);
        if (s.sentName && data.pin.id !== s.pinId) {
          forgetMyDisplay(s.pinId);
          if (data.display === "pending") rememberMyDisplay(data.pin.id, s.sentName);
        }
        s.pinId = data.pin.id;
        s.token = data.token || s.token; // moving into another cell issues a new token
        s.lngLat = { lng: data.pin.lng, lat: data.pin.lat };
        applyCells(data.cells, { blocks: data.blocks });
        rememberMine(data.pin);
        if (sessionRef.current === s) {
          setDrop((d) => d && { ...d, merged: data.merged, snapped: Boolean(auto), adjusted: !auto, rough: false });
        }
      } catch (err) {
        say(err.message);
      }
    },
    [applyCells, say]
  );

  // After the camera settles and house footprints are loaded, nudge a GPS pin onto the nearest house.
  const autoSnap = useCallback(
    async (s) => {
      const map = mapRef.current;
      if (!map || sessionRef.current !== s || s.adjusted || modeRef.current === "adjusting") return;
      const spot = snapToBuilding(map, s.gps);
      if (!spot) return;
      const ok = await s.promise;
      if (!ok || s.merged || s.adjusted || sessionRef.current !== s) return;
      if (metersBetween(spot, s.lngLat) < 3) return;
      await moveSession(s, spot, true);
    },
    [moveSession]
  );

  const dropAt = useCallback(
    (lngLat, { snap = false, rough = false } = {}) => {
      const map = mapRef.current;
      if (sessionRef.current) endSession();
      if (popupRef.current) popupRef.current.remove();
      let spot = { lng: lngLat.lng, lat: lngLat.lat };
      let snapped = false;
      if (snap && map && map.getZoom() >= 15.5) {
        const s = snapToBuilding(map, spot);
        if (s) {
          snapped = metersBetween(s, spot) > 2;
          spot = s;
        }
      }
      const s = { gps: lngLat, lngLat: spot, vibes: [], token: null, pinId: null, sent: "[]", merged: false, kind: "home", sentName: "", sentWhen: "{}" };
      sessionRef.current = s;
      nameRef.current = "";
      whenRef.current = { from: "", to: "", hours: "" };
      setMode("idle");

      // Put the house on the map now; the save catches up in the background. Within 20 m of a
      // house that's already here, the tap counts toward that one instead (as the server will).
      const now = Date.now();
      let near = null;
      let best = DEDUPE_METERS;
      for (const p of pinsRef.current) {
        if (isPending(p.id)) continue;
        const d = metersBetween(spot, p);
        if (d < best) {
          best = d;
          near = p;
        }
      }
      if (near) {
        s.bumped = near.id;
        patchPin(near.id, (p) => ({ ...p, c: (p.c || 1) + 1, u: now, l: now }));
      } else {
        const id = `${PENDING}${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        s.temp = id;
        pendingRef.current.set(id, { id, lat: spot.lat, lng: spot.lng, c: 1, v: {}, t: now, u: now, l: now, born: 1 });
        setPins(flatPins());
      }
      setDrop({ status: "saving", merged: Boolean(near), snapped, rough, vibes: [], kind: "home", name: "", from: "", to: "", hours: "", dstatus: "" });
      setTrayOpen(true);

      haptic(30);
      if (!mutedRef.current) chime(true);
      lightUp(libRef.current, map, spot);

      if (map) {
        if (snap && !snapped) map.once("moveend", () => map.once("idle", () => autoSnap(s)));
        // Keep the house above the vibe tray.
        map.flyTo({ center: spot, zoom: Math.max(map.getZoom(), 17.5), speed: 1.6, offset: [0, -90], essential: true });
      }

      // Pinned from a lit block's card: this house takes over from that block.
      const fromBlock = fromBlockRef.current;
      fromBlockRef.current = null;
      s.promise = api("POST", "/api/pins", { lat: spot.lat, lng: spot.lng, fromBlock: fromBlock || undefined })
        .then((data) => {
          lastWriteRef.current = Date.now();
          s.token = data.token;
          s.pinId = data.pin.id;
          s.merged = data.merged;
          s.lngLat = { lng: data.pin.lng, lat: data.pin.lat };
          if (s.temp) {
            if (!s.undone) handOff(s.temp, data.pin.id);
            pendingRef.current.delete(s.temp);
          }
          if (s.undone) {
            s.saved = data; // taken back while saving: the undo tidies up
            return true;
          }
          applyCells(data.cells, { blocks: data.blocks });
          // Keep it on this device for a few minutes, in case a refresh brings back an older list.
          rememberMine(data.pin);
          scoutAdded(s.pinId);
          track("add_house", { merged: data.merged ? "yes" : "no", from: fromBlock ? "block" : "map" });
          if (sessionRef.current === s) setDrop((d) => d && { ...d, status: "saved", merged: data.merged });
          pushVibes(s);
          return true;
        })
        .catch((err) => {
          // It didn't save: let the light fade out, and say so.
          if (s.temp) dropPending(s.temp, true);
          if (s.bumped && !s.undone) patchPin(s.bumped, (p) => ({ ...p, c: Math.max(1, (p.c || 1) - 1) }));
          if (sessionRef.current === s) {
            sessionRef.current = null;
            setDrop(null);
            setTrayOpen(false);
          }
          if (!s.undone) say(err.message, 4500);
          return false;
        });
    },
    [endSession, autoSnap, applyCells, pushVibes, patchPin, dropPending, say]
  );
  dropAtRef.current = dropAt;

  const undo = useCallback(async () => {
    const s = sessionRef.current;
    if (!s) return;
    clearTimeout(vibeTimerRef.current);
    sessionRef.current = null;
    setDrop(null);
    setTrayOpen(false);
    haptic(15);
    // Take it off the map right away, and put it back if the undo doesn't go through.
    let restore = null;
    if (!s.token) {
      s.undone = true;
      if (s.temp) dropPending(s.temp, true);
      if (s.bumped) {
        const id = s.bumped;
        patchPin(id, (p) => ({ ...p, c: Math.max(1, (p.c || 1) - 1) }));
        restore = () => patchPin(id, (p) => ({ ...p, c: (p.c || 1) + 1 }));
      }
    } else if (s.merged) {
      const id = s.pinId;
      patchPin(id, (p) => ({ ...p, c: Math.max(1, (p.c || 1) - 1) }));
      restore = () => patchPin(id, (p) => ({ ...p, c: (p.c || 1) + 1 }));
    } else restore = hideLocally(s.pinId);
    const ok = await s.promise;
    if (!ok) return;
    if (s.sentName) forgetMyDisplay(s.pinId);
    try {
      const data = await api("PATCH", "/api/pins", { token: s.token, action: "undo" });
      lastWriteRef.current = Date.now();
      scoutUndone(s.pinId);
      applyCells(data.cells, { blocks: data.blocks });
      dropMine(s.pinId); // if it was someone else's house too, it stays, just not as yours
      say("Pin removed");
    } catch (err) {
      if (restore) restore();
      else if (s.saved) {
        // It saved, but the undo didn't: show the house after all.
        applyCells(s.saved.cells, { blocks: s.saved.blocks });
        rememberMine(s.saved.pin);
      }
      say(err.message);
    }
  }, [applyCells, patchPin, dropPending, say]);

  const toggleVibe = useCallback(
    (id) => {
      const s = sessionRef.current;
      if (!s) return;
      s.vibes = s.vibes.includes(id) ? s.vibes.filter((v) => v !== id) : [...s.vibes, id];
      setDrop((d) => d && { ...d, vibes: s.vibes });
      haptic(10);
      clearTimeout(vibeTimerRef.current);
      vibeTimerRef.current = setTimeout(() => pushVibes(s), 450);
    },
    [pushVibes]
  );

  // "Home or public display?" A home stays anonymous. A display gets a name, which shows on the
  // map once a second person confirms it.


  const sendDisplay = useCallback(
    async (s, name, when = {}) => {
      const whenKey = JSON.stringify(name ? when : {});
      if (name === s.sentName && whenKey === s.sentWhen) return true;
      const ok = await s.promise;
      if (!ok || !s.token) return false;
      if (sessionRef.current === s) setDrop((d) => d && { ...d, dstatus: "saving" });
      try {
        const data = await api("PATCH", "/api/pins", { token: s.token, action: "display", name, when: name ? when : undefined });
        lastWriteRef.current = Date.now();
        if (data.pin && data.pin.id !== s.pinId) {
          // Joined a display that was already there.
          scoutMoved(s.pinId, data.pin.id);
          forgetMyDisplay(s.pinId);
          s.pinId = data.pin.id;
          s.lngLat = { lng: data.pin.lng, lat: data.pin.lat };
        }
        s.merged = data.merged;
        s.sentName = name;
        s.sentWhen = whenKey;
        if (data.display === "pending") rememberMyDisplay(s.pinId, name);
        else forgetMyDisplay(s.pinId);
        applyCells(data.cells, { blocks: data.blocks });
        if (data.pin) rememberMine(data.pin);
        if (data.display === "confirmed") {
          haptic([20, 40, 20]);
          if (!mutedRef.current) chime(true);
          lightUp(libRef.current, mapRef.current, s.lngLat);
        }
        if (sessionRef.current === s) setDrop((d) => d && { ...d, dstatus: name ? data.display : "", merged: data.merged });
        return true;
      } catch (err) {
        if (sessionRef.current === s) setDrop((d) => d && { ...d, dstatus: "" });
        say(err.message, 4000);
        return false;
      }
    },
    [applyCells, say]
  );

  const setKind = useCallback(
    (kind) => {
      const s = sessionRef.current;
      if (!s || s.kind === kind) return;
      s.kind = kind;
      haptic(10);
      setDrop((d) => d && { ...d, kind, dstatus: kind === "home" ? "" : d.dstatus });
      if (kind === "home" && s.sentName) sendDisplay(s, "");
    },
    [sendDisplay]
  );

  const saveDisplay = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || s.kind !== "display") return true;
    const checked = checkName(nameRef.current);
    if (checked.error || !checked.name) {
      say(checked.error || "Give it a name, like Sunny Acres Farm.", 4000);
      return false;
    }
    const w = whenRef.current;
    const when = checkWhen(w);
    if (when.error) {
      say(when.error, 4000);
      return false;
    }
    document.activeElement && document.activeElement.blur();
    return sendDisplay(s, checked.name, { from: w.from, to: w.to, hours: w.hours.trim() });
  }, [sendDisplay, say]);

  const trayDone = useCallback(async () => {
    const s = sessionRef.current;
    if (s && s.kind === "display" && nameRef.current.trim() && !(await saveDisplay())) return;
    setTrayOpen(false);
  }, [saveDisplay]);

  const clearAdjust = useCallback(() => {
    if (adjustRef.current) adjustRef.current.remove();
    adjustRef.current = null;
    hiddenIdRef.current = null;
    setMode("idle");
    syncOrbs();
  }, [syncOrbs]);

  const startAdjust = useCallback(() => {
    const s = sessionRef.current;
    const map = mapRef.current;
    const lib = libRef.current;
    if (!s || !map || !lib) return;
    setTrayOpen(false);
    setMode("adjusting");
    // Hide the saved light while you drag its stand-in, unless it's someone else's house too.
    if (!s.merged) hiddenIdRef.current = s.pinId;
    syncOrbs();
    const el = document.createElement("div");
    el.className = "placing";
    adjustRef.current = new lib.Marker({ element: el, draggable: true }).setLngLat(s.lngLat).addTo(map);
    map.flyTo({ center: s.lngLat, zoom: Math.max(map.getZoom(), 18), speed: 1.4, offset: [0, -40], essential: true });
  }, [syncOrbs]);

  const finishAdjust = useCallback(() => {
    const s = sessionRef.current;
    const spot = adjustRef.current && adjustRef.current.getLngLat();
    clearAdjust();
    if (!s || !spot) return;
    s.adjusted = true;
    haptic(20);
    lightUp(libRef.current, mapRef.current, spot);
    if (metersBetween(spot, s.lngLat) > 1) moveSession(s, { lng: spot.lng, lat: spot.lat }, false);
  }, [clearAdjust, moveSession]);

  // Once a house is placed, the location help has done its job.
  useEffect(() => {
    if (drop) setLocHelp(null);
  }, [drop]);

  // The toast lingers while you use it, then tidies itself away.
  useEffect(() => {
    if (!drop || mode === "adjusting") return;
    // Naming a display takes typing; don't pull the tray away mid-word.
    if (trayOpen && drop.kind === "display" && !drop.dstatus) return;
    const t = setTimeout(endSession, trayOpen ? 20000 : 6000);
    return () => clearTimeout(t);
  }, [drop, trayOpen, mode, endSession]);

  // --- Other controls -------------------------------------------------------

  const cancelPicking = useCallback(() => {
    fromBlockRef.current = null;
    setMode("idle");
  }, []);

  const startPicking = useCallback(
    (msg) => {
      if (!mapRef.current) {
        setMode("idle");
        say("Type the address in the box above to add it.", 4500);
        return;
      }
      setMode("picking");
      if (msg) say(msg, 4500);
    },
    [say]
  );

  // --- Lighting up a block --------------------------------------------------
  //
  // "I see lights here" from a moving car: one tap saves the stretch of street you're on, with no
  // address and no question. The map's own street lines say which street; a nearby address gives
  // the hundred block when it can. If GPS is off or fuzzy, or no street is near, it falls back to
  // the house flow (tap the house, or a pin at your spot).

  const endBlockSession = useCallback(() => {
    blockSessionRef.current = null;
    setBlockDrop(null);
  }, []);

  const lightBlock = useCallback(
    async (gps, accuracy) => {
      const map = mapRef.current;
      if (!map) return dropAt(gps, { snap: true, rough: accuracy > 60 });
      if (sessionRef.current) endSession();
      if (popupRef.current) popupRef.current.remove();
      setFinding("street");
      // Start on the nearest address now; the street comes from the tiles once the camera is there.
      const addresses = nearbyAddresses(gps);
      map.flyTo({ center: [gps.lng, gps.lat], zoom: Math.max(map.getZoom(), 16.5), speed: 2.2, essential: true });
      const settled = () =>
        new Promise((resolve) => {
          const done = setTimeout(resolve, 6000);
          map.once("moveend", () => {
            const t = setTimeout(() => {
              clearTimeout(done);
              resolve();
            }, 2500);
            map.once("idle", () => {
              clearTimeout(t);
              clearTimeout(done);
              resolve();
            });
          });
        });
      await settled();
      let found = findStreet(map, gps, 40 + Math.min(accuracy || 0, 35));
      if (!found) {
        // Tiles can land a moment after the camera stops.
        await new Promise((r) => setTimeout(r, 700));
        found = findStreet(map, gps, 40 + Math.min(accuracy || 0, 35));
      }
      setFinding("");
      if (!found) {
        // No named street near you: drop a house at your spot, as before.
        track("light_block_fallback", { why: "no_street" });
        return dropAt(gps, { snap: true, rough: accuracy > 60 });
      }

      endBlockSession();
      const s = { token: null, temp: null, bumped: null };
      blockSessionRef.current = s;
      const mid = midpoint(found.line);
      const now = Date.now();
      // Show it right away. A tap on a block that's already lit adds to it (the server decides).
      const near = flatBlocks().find(
        (b) => sameStreet(b.s, found.street) && Math.min(metersToLine(gps, b.g), metersToLine(mid, b.g)) <= MERGE_METERS
      );
      if (near && !String(near.id).startsWith(PENDING)) {
        s.bumped = { id: near.id, before: near };
        for (const [cell, list] of blocksRef.current) {
          if (list.some((b) => b.id === near.id)) {
            blocksRef.current.set(cell, list.map((b) => (b.id === near.id ? { ...b, c: (b.c || 1) + 1, u: now } : b)));
          }
        }
      } else {
        const id = `${PENDING}b${now.toString(36)}`;
        s.temp = id;
        pendingBlocksRef.current.set(id, { id, s: found.street, g: found.line, c: 1, t: now, u: now });
      }
      setPins(flatPins());
      setBlockDrop({ status: "saving", title: blockTitle(near || { s: found.street }), merged: Boolean(near), counted: true });
      haptic([20, 30, 20]);
      if (!mutedRef.current) chime(true);
      lightUp(libRef.current, map, mid);

      const hundred = hundredFrom(await addresses, found.street);
      try {
        const data = await api("POST", "/api/blocks", { lat: gps.lat, lng: gps.lng, street: found.street, hundred, line: found.line });
        lastWriteRef.current = Date.now();
        if (s.temp) pendingBlocksRef.current.delete(s.temp);
        s.token = data.token;
        s.id = data.block.id;
        s.cell = Object.keys(data.blocks || {})[0];
        applyCells(data.cells, { blocks: data.blocks });
        if (s.cell) rememberMyBlock(s.cell, data.block);
        track("light_block", { merged: data.merged ? "yes" : "no", hundred: data.block.r !== undefined ? "yes" : "no" });
        if (blockSessionRef.current === s) {
          setBlockDrop({ status: "saved", title: blockTitle(data.block), merged: data.merged, counted: data.counted });
        }
      } catch (err) {
        if (s.temp) pendingBlocksRef.current.delete(s.temp);
        if (s.bumped) {
          for (const [cell, list] of blocksRef.current) {
            if (list.some((b) => b.id === s.bumped.id)) blocksRef.current.set(cell, list.map((b) => (b.id === s.bumped.id ? s.bumped.before : b)));
          }
        }
        setPins(flatPins());
        if (blockSessionRef.current === s) endBlockSession();
        say(err.message, 4500);
      }
    },
    [dropAt, endSession, endBlockSession, applyCells, setPins, say]
  );

  const undoBlock = useCallback(async () => {
    const s = blockSessionRef.current;
    endBlockSession();
    if (!s || !s.token) return;
    haptic(15);
    try {
      const data = await api("PATCH", "/api/blocks", { token: s.token, action: "undo" });
      lastWriteRef.current = Date.now();
      if (!data.block) dropMyBlock(s.id);
      applyCells(data.cells, { blocks: data.blocks });
      say("Block taken back");
    } catch (err) {
      say(err.message);
    }
  }, [endBlockSession, applyCells, say]);

  // The "Block lit" toast tidies itself away; you're driving.
  useEffect(() => {
    if (!blockDrop || blockDrop.status !== "saved") return;
    const t = setTimeout(endBlockSession, 7000);
    return () => clearTimeout(t);
  }, [blockDrop, endBlockSession]);

  const iSeeLights = useCallback(() => {
    primeAudio();
    setLocHelp(null);
    if (!navigator.geolocation) return startPicking("Tap the map where the lights are.");
    setMode("locating");
    setFinding("you");
    locate(
      // A car moves fast, so only a fresh fix will do.
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 },
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setMode("idle");
        setFinding("");
        if (!inUSA(lat, lng)) return startPicking("HoHoHomes covers the US for now. Tap the map where the lights are.");
        if (accuracy > BLOCK_MAX_ACCURACY_M) {
          // Too fuzzy to tell one street from the next: tap the house instead.
          track("light_block_fallback", { why: "fuzzy_gps" });
          const map = mapRef.current;
          if (map) map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16.5), speed: 2, essential: true });
          return startPicking("GPS is fuzzy here. Tap the lit house on the map.");
        }
        lightBlock({ lng, lat }, accuracy);
      },
      (err) => {
        // You can still add the house by tapping it on the map.
        setFinding("");
        startPicking();
        explainLocate(err, "add");
      }
    );
  }, [lightBlock, startPicking, explainLocate]);

  // A lit block's card.
  const removeBlock = useCallback(
    async (block) => {
      const cell = [...blocksRef.current].find(([, list]) => list.some((b) => b.id === block.id));
      try {
        const res = await fetch(`/api/blocks/${block.id}?cell=${cell ? cell[0] : ""}`, {
          method: "DELETE",
          headers: { "x-admin-key": adminKeyRef.current },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not remove that, try again.");
        lastWriteRef.current = Date.now();
        if (popupRef.current) popupRef.current.remove();
        applyCells(data.cells, { blocks: data.blocks });
        say("Block removed");
      } catch (err) {
        say(err.message);
        throw err;
      }
    },
    [applyCells, say]
  );

  const pinFromBlock = useCallback(
    (block) => {
      const map = mapRef.current;
      if (popupRef.current) popupRef.current.remove();
      if (!map) return;
      fromBlockRef.current = block.id;
      const mid = midpoint(block.g);
      map.flyTo({ center: [mid.lng, mid.lat], zoom: Math.max(map.getZoom(), 18), speed: 1.4, essential: true });
      track("block_pin_house");
      startPicking("Tap the lit house on the map. It takes over from the block.");
    },
    [startPicking]
  );

  const openBlock = useCallback(
    (id, at) => {
      const map = mapRef.current;
      const lib = libRef.current;
      const block = flatBlocks().find((b) => b.id === id);
      if (!map || !lib || !block || String(id).startsWith(PENDING)) return;
      if (popupRef.current) popupRef.current.remove();
      const where = at || midpoint(block.g);
      popupRef.current = new lib.Popup({ offset: 14, maxWidth: "280px" })
        .setLngLat([where.lng, where.lat])
        .setDOMContent(blockNode(block, { onPin: pinFromBlock, onRemove: adminKeyRef.current ? removeBlock : null }))
        .addTo(map);
      const y = map.project([where.lng, where.lat]).y;
      const card = popupRef.current.getElement().getBoundingClientRect().height;
      const top = document.querySelector(".top");
      const minY = (top ? top.getBoundingClientRect().bottom : 0) + card + 24;
      if (y < minY) map.panBy([0, y - minY], { duration: 350 });
    },
    [pinFromBlock, removeBlock]
  );
  openBlockRef.current = openBlock;

  const nearMe = useCallback(() => {
    setHint(false);
    setLocHelp(null);
    locate(
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current && mapRef.current.flyTo({ center: [lng, lat], zoom: 14.5, speed: 1.6 });
      },
      (err) => explainLocate(err, "near")
    );
  }, [explainLocate]);

  const search = useCallback(
    async (e) => {
      e.preventDefault();
      primeAudio();
      setHint(false);
      const q = query.trim();
      if (!q) return;
      const c = mapRef.current ? mapRef.current.getCenter() : { lng: USA_CENTER[0], lat: USA_CENTER[1] };
      const near = { lat: c.lat.toFixed(3), lng: c.lng.toFixed(3) };
      try {
        const url =
          `https://photon.komoot.io/api/?limit=5&lat=${near.lat}&lon=${near.lng}` +
          `&bbox=-180,17,-64,72` +
          `&q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        const data = await res.json();
        // Nearest US match to where the map is looking.
        const f = (data.features || []).find((x) => inUSA(x.geometry.coordinates[1], x.geometry.coordinates[0]));
        if (!f) return say("Couldn't find that address in the US.");
        const [lng, lat] = f.geometry.coordinates;
        document.activeElement && document.activeElement.blur();
        setQuery("");
        dropAt({ lng, lat });
      } catch {
        say("Address search isn't working right now. Tap the map instead.");
      }
    },
    [query, dropAt, say]
  );

  // The 🤩 and ⭐ buttons: tap one to filter, tap it again to see everything.
  const toggleFilter = useCallback(
    (which) => {
      const next = filterRef.current === which ? "all" : which;
      const summary = Object.values(summaryRef.current || {});
      if (next === "show" && !pinsRef.current.some(isShowstopper) && !summary.some((v) => v.s > 0)) {
        say("No Showstoppers yet. Know one worth the drive? Tap 🤩 on its card.", 4500);
        return;
      }
      if (next === "disp" && !pinsRef.current.some(isDisplay) && !summary.some((v) => v.d > 0)) {
        say("No public displays yet. Spot a farm or park show? Add it and pick ⭐ Public display.", 5000);
        return;
      }
      filterRef.current = next;
      setFilter(next);
      haptic(10);
      // Labels carry the filter in their text, so rebuild them.
      for (const z of zonesRef.current.values()) z.marker.remove();
      zonesRef.current.clear();
      setPins(pinsRef.current);
      if (next === "show") say("Showing Showstoppers only 🤩");
      if (next === "disp") say("Showing public displays only ⭐");
    },
    [setPins, say]
  );

  // Share the map, or the ~1 km area in view. Links never point at a single house.
  const share = useCallback(async () => {
    const map = mapRef.current;
    let url = `${window.location.origin}/`;
    // The link's own preview carries "Let's go Christmas light hunting", so the message reads like a person's.
    let text = "Found a map of Christmas lights near you. Add any you spot!";
    if (map && map.getZoom() >= 10) {
      const c = map.getCenter();
      if (inUSA(c.lat, c.lng)) {
        // Keep the sender's zoom (10–15) so the link shows what they were looking at.
        const z = Math.max(10, Math.min(15, Math.floor(map.getZoom())));
        url += `?near=${snapNear(c.lat, c.lng)}${z !== 14 ? `&z=${z}` : ""}`;
        text = "Found a map of Christmas lights near us. Add any you spot!";
      }
    }
    haptic(10);
    try {
      if (navigator.share) {
        await navigator.share({ title: "HoHoHomes", text, url });
        track("share", { how: "share_sheet" });
        return;
      }
      await navigator.clipboard.writeText(url);
      track("share", { how: "copy_link" });
      say("Link copied. Paste it anywhere 🎄");
    } catch (err) {
      if (err && err.name === "AbortError") return; // closed the share sheet
      say("Couldn't share right now.");
    }
  }, [say]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    try {
      localStorage.setItem("hh:muted", next ? "1" : "0");
    } catch {}
    if (!next) {
      primeAudio();
      setTimeout(() => chime(false), 30);
    }
  }, []);

  useEffect(() => {
    if (!creditsOpen) return;
    const t = setTimeout(() => setCreditsOpen(false), 8000);
    return () => clearTimeout(t);
  }, [creditsOpen]);

  let dropMsg = "";
  if (drop) {
    // The house is already on the map while it saves, so the message doesn't wait for the server.
    if (drop.dstatus === "pending" || drop.dstatus === "same") dropMsg = "⭐ Display added";
    else if (drop.dstatus === "confirmed") dropMsg = "⭐ Display confirmed!";
    else if (drop.dstatus === "seen" || drop.dstatus === "already") dropMsg = "⭐ Added your vote";
    else if (drop.merged) dropMsg = "Added your vote 🎄";
    else if (drop.adjusted) dropMsg = "Moved ✨";
    else if (drop.snapped) dropMsg = "Snapped to the house ✨";
    else if (drop.rough) dropMsg = "Added · GPS is fuzzy";
    else dropMsg = "Lights added ✨";
  }
  const banner = mode === "picking" || mode === "adjusting";
  const showTray = drop && trayOpen && mode !== "adjusting";
  const showDock = !showTray && !banner;

  return (
    <main className={`app mode-${mode}`}>
      <div ref={mapEl} className="map" inert={welcome || undefined} />
      {mapError && <div className="maperror">{mapError}</div>}

      <div className="top" inert={welcome || undefined}>
        <div className="brand glass">
          <div className="snow" aria-hidden="true">
            {SNOW.map((f, i) => (
              <i
                key={i}
                style={{ left: f.left, "--s": f.size, "--dur": f.dur, "--delay": f.delay, "--dx": f.dx }}
              />
            ))}
          </div>
          <div className="brand-title">
            <h1>
              HoHo<span>Homes</span>
            </h1>
            <p className="count" aria-live="polite">
              <b>{count === null ? "…" : filter === "show" ? shows : filter === "disp" ? displays : count}</b>{" "}
              {filter === "show"
                ? shows === 1
                  ? "showstopper"
                  : "showstoppers"
                : filter === "disp"
                  ? displays === 1
                    ? "public display"
                    : "public displays"
                  : count === 1
                    ? "house lit"
                    : "houses lit"}
            </p>
          </div>
          <div className="bar-icons">
            <button
              type="button"
              className="icon-btn wow-toggle"
              onClick={() => toggleFilter("show")}
              aria-pressed={filter === "show"}
              aria-label="Showstoppers only"
              title={filter === "show" ? "Showing Showstoppers only" : "Showstoppers only"}
            >
              <span aria-hidden="true">🤩</span>
            </button>
            <button
              type="button"
              className="icon-btn wow-toggle disp-toggle"
              onClick={() => toggleFilter("disp")}
              aria-pressed={filter === "disp"}
              aria-label="Public displays only"
              title={filter === "disp" ? "Showing public displays only" : "Public displays: farms, parks, businesses"}
            >
              <StarIcon />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label="Mute sounds"
              title={muted ? "Sound off" : "Sound on"}
            >
              <JingleBell muted={muted} />
            </button>
            <button type="button" className="icon-btn share" onClick={share} aria-label="Share this map" title="Share">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v12" />
                <path d="M7 8l5-5 5 5" />
                <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
              </svg>
            </button>
            <ScoutBadges />
          </div>
        </div>
      </div>

      {toast && !locHelp && (
        <div className="toast glass" role="status">
          {toast}
        </div>
      )}

      {locHelp && (
        <div className="loc-help glass" role="alert">
          <span className="loc-pin" aria-hidden="true">📍</span>
          <div className="loc-words">
            <b>{locHelp.title}</b>
            <span>{locHelp.fix}</span>
          </div>
          <div className="loc-btns">
            {locHelp.action === "reload" && (
              <button type="button" onClick={() => window.location.reload()}>
                Reload
              </button>
            )}
            {locHelp.action === "retry" && (
              <button type="button" onClick={locHelp.again === "add" ? iSeeLights : nearMe}>
                Try again
              </button>
            )}
            <button type="button" className="soft" onClick={() => setLocHelp(null)}>
              OK
            </button>
          </div>
        </div>
      )}

      <div className="stack" inert={welcome || undefined}>
        <div className="credits">
          {creditsOpen && (
            <div id="credits-panel" className="credits-text glass">
              <a className="byline" href="https://ant.cat/writing/2026-11-21-hohohomes" target="_blank" rel="noopener">
                Created by <b>Ant.Cat</b>
              </a>
              <span className="credits-links">
                <a href="/about">How it works</a> · <a href="/lights">Lights by city</a>
              </span>
              <span className="credits-map">
                Map:{" "}
                <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">
                  OpenFreeMap
                </a>{" "}
                <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">
                  © OpenMapTiles
                </a>{" "}
                Data from{" "}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                  OpenStreetMap
                </a>
              </span>
            </div>
          )}
          <button
            type="button"
            className="credits-btn"
            onClick={() => setCreditsOpen((o) => !o)}
            aria-expanded={creditsOpen}
            aria-controls="credits-panel"
            aria-label="About HoHoHomes"
            title="About"
          >
            <svg width="26" height="26" viewBox="3.5 4.5 26 23" aria-hidden="true">
              <path d="M6 22C7 12 12 6 17 6c5 0 8.5 3 9.5 8L24 15c-1-3-3-4.5-5-4 2 3 3 7 3.5 11z" fill="#9c4a52" />
              <rect x="4.5" y="20.5" width="20" height="5.5" rx="2.75" fill="#e6dccb" />
              <circle cx="25.6" cy="16" r="3" fill="#e6dccb" />
            </svg>
          </button>
        </div>

        {hint && !welcome && !banner && !drop && mode === "idle" && (
          <div className="hint glass" role="status">
            <span>{touch ? "Pinch to explore, or" : "Zoom in to explore, or"}</span>
            <button type="button" onClick={nearMe}>
              <span aria-hidden="true">📍</span> Lights near me
            </button>
          </div>
        )}

        {banner && (
          <div className="banner glass" role="status">
            {mode === "adjusting" ? "Drag the pin or tap the house" : "Tap the house on the map"}
            {mode === "adjusting" ? (
              <>
                <button className="soft" onClick={clearAdjust}>
                  Cancel
                </button>
                <button onClick={finishAdjust}>Save</button>
              </>
            ) : (
              <button onClick={cancelPicking}>Cancel</button>
            )}
          </div>
        )}

        {blockDrop && !drop && mode === "idle" && (
          <div className={`drop-toast block-toast glass${blockDrop.status === "saved" ? " saved" : ""}`} role="status">
            <span className="drop-msg block-msg">
              <b>
                {!blockDrop.counted
                  ? "You already lit this block ✨"
                  : blockDrop.merged
                    ? "Added your vote 🎄"
                    : "Block lit ✨"}
              </b>
              <span className="block-where">
                {blockDrop.title}
                {" · "}
                {blockDrop.status === "saved" ? "Saved. Keep driving" : "Saving…"}
              </span>
            </span>
            {blockDrop.counted && (
              <button className="tbtn" onClick={undoBlock} disabled={blockDrop.status !== "saved"}>
                Undo
              </button>
            )}
            <button className="tx" onClick={endBlockSession} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}

        {drop && mode !== "adjusting" && (
          <div className="drop-toast glass" role="status">
            <span className="drop-msg">{dropMsg}</span>
            <button className="tbtn" onClick={undo}>
              Undo
            </button>
            {!mapError && (
              <button className="tbtn" onClick={startAdjust}>
                Adjust Location
              </button>
            )}
            <button className="tx" onClick={endSession} aria-label="Dismiss">
              ✕
            </button>
          </div>
        )}

        {showTray && (
          <div className="tray glass" role="group" aria-label="Tell us about it">
            <div className="tray-head">
              <span>What did you spot?</span>
              <button onClick={trayDone}>Done</button>
            </div>
            <div className="kind" role="radiogroup" aria-label="Home or public display?">
              <button
                type="button"
                role="radio"
                aria-checked={drop.kind !== "display"}
                className="kind-opt"
                onClick={() => setKind("home")}
              >
                <span className="e" aria-hidden="true">
                  🏠
                </span>
                Home
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={drop.kind === "display"}
                className="kind-opt kind-display"
                onClick={() => setKind("display")}
              >
                <span className="e kind-star" aria-hidden="true">
                  ⭐
                </span>
                Public display
              </button>
            </div>
            {drop.kind === "display" && (
              <form
                className="name-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveDisplay();
                }}
              >
                <input
                  type="text"
                  value={drop.name}
                  onChange={(e) => {
                    nameRef.current = e.target.value;
                    const name = e.target.value;
                    setDrop((d) => d && { ...d, name, dstatus: "" });
                  }}
                  maxLength={NAME_MAX}
                  placeholder="Its name, like Sunny Acres Farm"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCapitalize="words"
                  aria-label="Name of the public display"
                />
                <button type="submit" disabled={Boolean(drop.dstatus) || !drop.name.trim()}>
                  {drop.dstatus === "saving" ? "…" : drop.dstatus ? "Saved" : "Save"}
                </button>
              </form>
            )}
            {drop.kind === "display" && !drop.showWhen && (
              <button type="button" className="when-toggle" onClick={() => setDrop((d) => d && { ...d, showWhen: true })}>
                🗓️ Add dates and hours <span>(optional)</span>
              </button>
            )}
            {drop.kind === "display" && drop.showWhen && (
              <div className="when-row" role="group" aria-label="When it runs, optional">
                {[
                  ["from", "First night"],
                  ["to", "Last night"],
                ].map(([key, label]) => (
                  <label key={key} className="when-day">
                    <span>{label}</span>
                    <input
                      type="date"
                      value={drop[key]}
                      onChange={(e) => {
                        const v = e.target.value;
                        whenRef.current = { ...whenRef.current, [key]: v };
                        setDrop((d) => d && { ...d, [key]: v, dstatus: "" });
                      }}
                    />
                  </label>
                ))}
                <label className="when-hours">
                  <span>Hours</span>
                  <input
                    type="text"
                    value={drop.hours}
                    onChange={(e) => {
                      const v = e.target.value;
                      whenRef.current = { ...whenRef.current, hours: v };
                      setDrop((d) => d && { ...d, hours: v, dstatus: "" });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        saveDisplay();
                      }
                    }}
                    maxLength={HOURS_MAX}
                    placeholder="6-10 PM"
                    enterKeyHint="done"
                    autoComplete="off"
                  />
                </label>
              </div>
            )}
            {drop.kind === "display" && (
              <p className="name-note" aria-live="polite">
                {DISPLAY_SAID[drop.dstatus] || "Farms, parks, businesses, churches, drive-throughs. Homes stay unnamed."}
              </p>
            )}
            <p className="vibe-label">The vibe? Tap any</p>
            <div className="chips">
              <button
                className="chip chip-wow"
                aria-pressed={drop.vibes.includes(WOW)}
                onClick={() => toggleVibe(WOW)}
              >
                <span className="e" aria-hidden="true">
                  🤩
                </span>
                Worth the Drive
              </button>
              {VIBES.map((v) => {
                const on = drop.vibes.includes(v.id);
                return (
                  <button key={v.id} className="chip" aria-pressed={on} onClick={() => toggleVibe(v.id)}>
                    <span className="e" aria-hidden="true">
                      {v.emoji}
                    </span>
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showDock && (
          <div className="dock glass">
            <div className="dock-lights" aria-hidden="true">
              {DOCK_LIGHTS.map((d, i) => (
                <i key={i} style={{ "--d": d }} />
              ))}
            </div>
            <form className="search" role="search" onSubmit={search}>
              <svg className="search-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
              <input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="street-address"
                placeholder="Add by address"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Add a house by address"
              />
              <button
                type="button"
                className="pin-btn"
                onClick={() => {
                  primeAudio();
                  startPicking();
                }}
                aria-label="Pick a house on the map"
                title="Pick on the map"
              >
                <span aria-hidden="true">📍</span>
              </button>
            </form>
            <div className="dock-row">
              <button type="button" className="locate" onClick={nearMe} aria-label="Show lights near me" title="Near me">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="6.5" />
                  <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
                  <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
                </svg>
              </button>
              <button type="button" className="primary" onClick={iSeeLights} disabled={Boolean(finding) || mode === "locating"}>
                {finding === "street" ? (
                  "Finding the street…"
                ) : finding || mode === "locating" ? (
                  "Finding you…"
                ) : (
                  <>
                    <span className="tree" aria-hidden="true">
                      🎄
                    </span>
                    I see lights here
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {welcome && <Welcome onClose={closeWelcome} />}
    </main>
  );
}
