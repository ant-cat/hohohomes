"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VIBES, WOW, isShowstopper } from "../lib/vibes";
import ScoutBadges from "./ScoutBadges";
import { scoutAdded, scoutUndone, scoutMoved, scoutLit, scoutWow, scoutTagged } from "./scout";
import { inUSA, cellOf, cellsInBounds, USA_CENTER, LOWER_48, snapNear, parseNear, parseZoom } from "../lib/region";
import { snapToBuilding, metersBetween, placeName } from "./geo";
import { primeAudio, chime, haptic, lightUp } from "./fx";
import { popupNode, isFresh, rememberConfirmed, rememberVoted } from "./popup";
import Welcome, { shouldWelcome, rememberWelcomed } from "./Welcome";

const STYLE = "https://tiles.openfreemap.org/styles/dark";
// Below LOAD_ZOOM the map shows one glow per 1° cell from the national summary; from there in,
// it downloads the houses of the cells in view.
const LOAD_ZOOM = 7.5;
const MAX_LOAD_CELLS = 40;
const CELL_STALE_MS = 2 * 60 * 1000;

// Zoomed out, houses gather into glowing Hot Zones; from ORB_ZOOM in, each house is a twinkling light.
const CLUSTER_MAX_ZOOM = 13;
const ORB_ZOOM = 14;
const MAX_ORBS = 300;
const MAX_ZONE_LABELS = 24;
const HUES = ["warm", "warm", "warm", "red", "gold", "green", "blue", "warm", "pink", "gold"];
const SPARK_COLORS = ["#fff1c9", "#ff5a5f", "#ffc94d", "#5fe39a", "#7cc4ff", "#ff8fc7"];

// Fixed snowflake positions (the same on server and client).
const SNOW = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  size: `${1.5 + ((i * 7) % 5) / 2}px`,
  dur: `${5 + ((i * 13) % 7)}s`,
  delay: `${-((i * 29) % 11)}s`,
  dx: `${((i * 17) % 21) - 10}px`,
}));
// A string of fairy lights along the top of the bottom dock, each with its own twinkle.
const DOCK_LIGHTS = Array.from({ length: 11 }, (_, i) => `${-((i * 0.73) % 2.6).toFixed(2)}s`);


function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function toGeoJSON(pins) {
  const now = Date.now();
  return {
    type: "FeatureCollection",
    features: pins.map((p) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, fresh: isFresh(p, now) ? 1 : 0, s: isShowstopper(p) ? 1 : 0, h: hash(p.id) % SPARK_COLORS.length },
    })),
  };
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

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Our API sends { error: "text" }; Vercel's own errors send { error: { code, message } }.
    const msg = typeof data.error === "string" ? data.error : "";
    throw new Error(msg || (res.status === 429 ? "Slow down a little and try again." : "Could not save that, try again."));
  }
  return data;
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
  const openPopupRef = useRef(() => {});
  const cellsRef = useRef(new Map()); // cell -> { pins, at }: the houses downloaded so far
  const summaryRef = useRef(null); // cell -> { n, s, lat, lng }: houses per cell, nationwide
  const dropAtRef = useRef(() => {});

  const [count, setCount] = useState(null);
  const [shows, setShows] = useState(0); // how many Showstoppers
  const [showOnly, setShowOnly] = useState(false); // "Showstoppers only" filter
  const showOnlyRef = useRef(false);
  const [mode, setMode] = useState("idle"); // idle | locating | picking | adjusting
  const [toast, setToast] = useState("");

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

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const m = loadMuted();
    mutedRef.current = m;
    setMuted(m);
    setWelcome(shouldWelcome());
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

  // Twinkling house lights, as DOM markers, only for the houses in view.
  const syncOrbs = useCallback(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const orbs = orbsRef.current;
    const want = new Map();
    if (map.getZoom() >= ORB_ZOOM) {
      const b = map.getBounds();
      const padLng = (b.getEast() - b.getWest()) * 0.15;
      const padLat = (b.getNorth() - b.getSouth()) * 0.15;
      let list = pinsRef.current.filter(
        (p) =>
          p.id !== hiddenIdRef.current &&
          (!showOnlyRef.current || isShowstopper(p)) &&
          p.lng > b.getWest() - padLng &&
          p.lng < b.getEast() + padLng &&
          p.lat > b.getSouth() - padLat &&
          p.lat < b.getNorth() + padLat
      );
      if (list.length > MAX_ORBS) {
        const c = map.getCenter();
        list = list
          .map((p) => [(p.lng - c.lng) ** 2 + (p.lat - c.lat) ** 2, p])
          .sort((x, y) => x[0] - y[0])
          .slice(0, MAX_ORBS)
          .map((x) => x[1]);
      }
      for (const p of list) want.set(p.id, p);
    }
    for (const [id, o] of orbs) {
      if (!want.has(id)) {
        o.marker.remove();
        orbs.delete(id);
      }
    }
    const now = Date.now();
    for (const [id, p] of want) {
      let o = orbs.get(id);
      if (!o) {
        const el = makeOrb(p);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (modeRef.current === "idle") openPopupRef.current(id);
        });
        const marker = new lib.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
        o = { marker, el, lng: p.lng, lat: p.lat };
        orbs.set(id, o);
      } else if (o.lng !== p.lng || o.lat !== p.lat) {
        o.marker.setLngLat([p.lng, p.lat]);
        o.lng = p.lng;
        o.lat = p.lat;
      }
      o.el.classList.toggle("stale", !isFresh(p, now));
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
      const summary = summaryRef.current || {};
      for (const [cell, v] of Object.entries(summary)) {
        if (cellsRef.current.has(cell)) continue;
        total += v.n;
        stars += v.s;
      }
      if (summaryRef.current || pins.length) setCount(total);
      setShows(stars);
      const map = mapRef.current;
      const src = map && map.getSource("pins");
      if (src) src.setData(toGeoJSON(showOnlyRef.current ? pins.filter(isShowstopper) : pins));
      const sum = map && map.getSource("summary");
      if (sum) {
        sum.setData({
          type: "FeatureCollection",
          features: Object.entries(summary)
            .filter(([, v]) => v.n && (!showOnlyRef.current || v.s))
            .map(([cell, v]) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [v.lng, v.lat] },
              properties: { cell, n: showOnlyRef.current ? v.s : v.n, s: v.s },
            })),
        });
      }
      syncOrbs();
    },
    [syncOrbs]
  );

  const flatPins = () => [...cellsRef.current.values()].flatMap((c) => c.pins);

  // Takes cells fresh from the server (after a load or a save) and redraws.
  const applyCells = useCallback(
    (cells) => {
      if (!cells) return;
      const now = Date.now();
      const summary = (summaryRef.current ||= {});
      for (const [cell, pins] of Object.entries(cells)) {
        cellsRef.current.set(cell, { pins, at: now });
        if (!pins.length) {
          delete summary[cell];
          continue;
        }
        let lat = 0;
        let lng = 0;
        for (const p of pins) {
          lat += p.lat;
          lng += p.lng;
        }
        summary[cell] = { n: pins.length, s: pins.filter(isShowstopper).length, lat: lat / pins.length, lng: lng / pins.length };
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
      applyCells(data.cells);
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
        applyCells(data.cells);
        scoutLit(id);
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
        applyCells(data.cells);
        scoutWow(id);
      } catch (err) {
        revert();
        say(err.message);
        throw err;
      }
    },
    [patchPin, applyCells, say]
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
        applyCells(data.cells);
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
        .setDOMContent(popupNode(pin, { onLit: confirmLit, onWow: voteWow, onRemove: adminKeyRef.current ? removeHouse : null }))
        .addTo(map);
      // Keep the whole card clear of the header: measure both and pan just enough.
      const y = map.project([pin.lng, pin.lat]).y;
      const card = popupRef.current.getElement().getBoundingClientRect().height;
      const top = document.querySelector(".top");
      const headerBottom = top ? top.getBoundingClientRect().bottom : 0;
      const minY = headerBottom + card + 24;
      if (y < minY) map.panBy([0, y - minY], { duration: 350 });
    },
    [confirmLit, voteWow, removeHouse]
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

  // Tapping a national glow: a merged one zooms a step until it splits; a single city flies in.
  const flyToRegionRef = useRef(() => {});
  flyToRegionRef.current = async (f) => {
    const map = mapRef.current;
    if (!map) return;
    const center = f.geometry.coordinates;
    const id = f.properties.cluster_id;
    if (id !== undefined) {
      try {
        const z = await map.getSource("summary").getClusterExpansionZoom(id);
        if (z < LOAD_ZOOM - 1) return map.easeTo({ center, zoom: z + 0.3, duration: 900, essential: true });
      } catch {}
    }
    map.flyTo({ center, zoom: 10.5, speed: 1.4, essential: true });
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
        const id = f.properties.cluster_id;
        const key = id !== undefined ? `rc:${id}:${f.properties.n}` : `r:${f.properties.cell}:${f.properties.n}:${f.properties.s}`;
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
    // Biggest zones get labels first; skip any that would sit on top of another.
    // Near a screen edge a label hangs inward so it isn't cut off; overlap checks use where it really sits.
    const placed = [];
    const anchors = new Map();
    const w = map.getContainer().clientWidth;
    for (const [key, f] of [...want]) {
      const pt = map.project(f.geometry.coordinates);
      const anchor = pt.x < 90 ? "left" : pt.x > w - 90 ? "right" : "center";
      const cx = pt.x + (anchor === "left" ? 75 : anchor === "right" ? -75 : 0);
      if (placed.some((q) => Math.abs(q.x - cx) < 160 && Math.abs(q.y - pt.y) < 34)) want.delete(key);
      else {
        placed.push({ x: cx, y: pt.y });
        anchors.set(key, anchor);
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
      if (labels.has(key)) continue;
      const n = national ? f.properties.n : f.properties.point_count;
      const [lng, lat] = f.geometry.coordinates;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "zone-label";
      const name = document.createElement("b");
      const meta = document.createElement("span");
      const stars = (national ? f.properties.s : f.properties.shows) || 0;
      meta.textContent = showOnlyRef.current
        ? `${n} ${n === 1 ? "showstopper" : "showstoppers"} 🤩`
        : `${n} houses${stars ? ` • ${stars} 🤩` : ""}`;
      el.append(name, meta);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (modeRef.current !== "idle") return;
        if (national) flyToRegionRef.current(f);
        else zoomIntoZone(f.properties.cluster_id, [lng, lat]);
      });
      const marker = new lib.Marker({ element: el, anchor: anchors.get(key) || "center" }).setLngLat([lng, lat]).addTo(map);
      labels.set(key, { marker });
      // A merged glow is named after its biggest city.
      const nameAt =
        national && f.properties.cluster_id !== undefined
          ? map
              .getSource("summary")
              .getClusterLeaves(f.properties.cluster_id, 200, 0)
              .then((leaves) => {
                const top = leaves.reduce((a, b) => (b.properties.n > a.properties.n ? b : a));
                return placeName(top.geometry.coordinates[0], top.geometry.coordinates[1], precision, "city");
              })
          : placeName(lng, lat, precision, national ? "city" : "hood");
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

      // Open where the visitor is, if they're in the US. Never prompts:
      // precise location only if they've already allowed it, otherwise the rough
      // city-level guess from their IP. Gives up the moment they move the map themselves.
      let touched = false;
      map.once("dragstart", () => (touched = true));
      map.on("zoomstart", (e) => e.originalEvent && (touched = true));
      const openOn = (lat, lng, zoom) => {
        if (cancelled || shared || touched || sessionRef.current || modeRef.current !== "idle") return;
        if (!inUSA(lat, lng)) return;
        map.easeTo({ center: [lng, lat], zoom, duration: 1200, essential: true });
      };
      (async () => {
        try {
          const perm = navigator.permissions && (await navigator.permissions.query({ name: "geolocation" }));
          if (perm && perm.state === "granted") {
            navigator.geolocation.getCurrentPosition(
              (pos) => openOn(pos.coords.latitude, pos.coords.longitude, 14.5),
              () => {},
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
            );
            return;
          }
        } catch {}
        try {
          const where = await (await fetch("/api/where")).json();
          if (Number.isFinite(where.lat)) openOn(where.lat, where.lng, 11);
        } catch {}
      })();
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

        // The national view: one glow per cell with houses.
        // Zoomed far out, nearby cells merge into one glow (a city that straddles a cell line, or a
        // region), with their counts added up.
        map.addSource("summary", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterRadius: 45,
          clusterMaxZoom: 6,
          clusterProperties: { n: ["+", ["get", "n"]], s: ["+", ["get", "s"]] },
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

        map.addSource("pins", {
          type: "geojson",
          data: toGeoJSON(pinsRef.current),
          cluster: true,
          clusterMaxZoom: CLUSTER_MAX_ZOOM,
          clusterRadius: 44,
          clusterProperties: { fresh: ["+", ["get", "fresh"]], shows: ["+", ["get", "s"]] },
        });

        const clustered = ["has", "point_count"];
        const single = ["!", ["has", "point_count"]];
        // How much of a zone was confirmed lit lately: brighter zones are livelier.
        const liveliness = ["/", ["get", "fresh"], ["get", "point_count"]];
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
            "circle-opacity": ["+", 0.32, ["*", 0.45, liveliness]],
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
            "circle-opacity": ["+", 0.4, ["*", 0.45, liveliness]],
          },
        });
        const sparkColor = ["match", ["get", "h"], ...SPARK_COLORS.slice(1).flatMap((c, i) => [i + 1, c]), SPARK_COLORS[0]];
        map.addLayer({
          id: "spark-glow",
          type: "circle",
          source: "pins",
          filter: single,
          minzoom: LOAD_ZOOM,
          maxzoom: ORB_ZOOM,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 6, 13, 12],
            "circle-color": sparkColor,
            "circle-blur": 1,
            "circle-opacity": ["case", ["==", ["get", "fresh"], 1], 0.55, 0.15],
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
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.6, 13, 3],
            "circle-color": "#fff8e6",
            "circle-opacity": ["case", ["==", ["get", "fresh"], 1], 0.95, 0.35],
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
      orbsRef.current.clear();
      zonesRef.current.clear();
      if (map) map.remove();
      mapRef.current = null;
    };
  }, [setPins, syncOrbs, syncZones, zoomIntoZone, loadSummary, loadCells]);

  // Dim houses as they go stale, and pick up other people's houses now and then.
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
        applyCells(data.cells);
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
        s.pinId = data.pin.id;
        s.token = data.token || s.token; // moving into another cell issues a new token
        s.lngLat = { lng: data.pin.lng, lat: data.pin.lat };
        applyCells(data.cells);
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
      const s = { gps: lngLat, lngLat: spot, vibes: [], token: null, pinId: null, sent: "[]", merged: false };
      sessionRef.current = s;
      setMode("idle");
      setDrop({ status: "saving", merged: false, snapped, rough, vibes: [] });
      setTrayOpen(true);

      haptic(30);
      if (!mutedRef.current) chime(true);
      lightUp(libRef.current, map, spot);

      if (map) {
        if (snap && !snapped) map.once("moveend", () => map.once("idle", () => autoSnap(s)));
        // Keep the house above the vibe tray.
        map.flyTo({ center: spot, zoom: Math.max(map.getZoom(), 17.5), speed: 1.6, offset: [0, -90], essential: true });
      }

      s.promise = api("POST", "/api/pins", { lat: spot.lat, lng: spot.lng })
        .then((data) => {
          lastWriteRef.current = Date.now();
          s.token = data.token;
          s.pinId = data.pin.id;
          s.merged = data.merged;
          s.lngLat = { lng: data.pin.lng, lat: data.pin.lat };
          applyCells(data.cells);
          scoutAdded(s.pinId);
          if (sessionRef.current === s) setDrop((d) => d && { ...d, status: "saved", merged: data.merged });
          pushVibes(s);
          return true;
        })
        .catch((err) => {
          if (sessionRef.current === s) {
            sessionRef.current = null;
            setDrop(null);
            setTrayOpen(false);
          }
          say(err.message, 4500);
          return false;
        });
    },
    [endSession, autoSnap, applyCells, pushVibes, say]
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
    const ok = await s.promise;
    if (!ok) return;
    try {
      const data = await api("PATCH", "/api/pins", { token: s.token, action: "undo" });
      lastWriteRef.current = Date.now();
      scoutUndone(s.pinId);
      applyCells(data.cells);
      say("Pin removed");
    } catch (err) {
      say(err.message);
    }
  }, [applyCells, say]);

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

  // The toast lingers while you use it, then tidies itself away.
  useEffect(() => {
    if (!drop || mode === "adjusting") return;
    const t = setTimeout(endSession, trayOpen ? 20000 : 6000);
    return () => clearTimeout(t);
  }, [drop, trayOpen, mode, endSession]);

  // --- Other controls -------------------------------------------------------

  const cancelPicking = useCallback(() => setMode("idle"), []);

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

  const iSeeLights = useCallback(() => {
    primeAudio();
    if (!navigator.geolocation) return startPicking("Tap the map where the lights are.");
    setMode("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (!inUSA(lat, lng)) return startPicking("HoHoHomes covers the US for now. Tap the map where the lights are.");
        dropAt({ lng, lat }, { snap: true, rough: accuracy > 60 });
      },
      () => startPicking("Couldn't get your location. Tap the map where the lights are."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  }, [dropAt, startPicking]);

  const nearMe = useCallback(() => {
    if (!navigator.geolocation) return say("Location isn't available on this device.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current && mapRef.current.flyTo({ center: [lng, lat], zoom: 14.5, speed: 1.6 });
      },
      () => say("Couldn't get your location."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [say]);

  const search = useCallback(
    async (e) => {
      e.preventDefault();
      primeAudio();
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

  const toggleShowOnly = useCallback(() => {
    const next = !showOnlyRef.current;
    const anyShowstopper =
      pinsRef.current.some(isShowstopper) || Object.values(summaryRef.current || {}).some((v) => v.s > 0);
    if (next && !anyShowstopper) {
      say("No Showstoppers yet. Know one worth the drive? Tap 🤩 on its card.", 4500);
      return;
    }
    showOnlyRef.current = next;
    setShowOnly(next);
    haptic(10);
    // Labels carry the filter in their text, so rebuild them.
    for (const z of zonesRef.current.values()) z.marker.remove();
    zonesRef.current.clear();
    setPins(pinsRef.current);
    if (next) say("Showing Showstoppers only 🤩");
  }, [setPins, say]);

  // Share the map, or the ~1 km area in view. Links never point at a single house.
  const share = useCallback(async () => {
    const map = mapRef.current;
    let url = `${window.location.origin}/`;
    let text = "🎄 Find Christmas lights near you, and add any you spot.";
    if (map && map.getZoom() >= 10) {
      const c = map.getCenter();
      if (inUSA(c.lat, c.lng)) {
        // Keep the sender's zoom (10–15) so the link shows what they were looking at.
        const z = Math.max(10, Math.min(15, Math.floor(map.getZoom())));
        url += `?near=${snapNear(c.lat, c.lng)}${z !== 14 ? `&z=${z}` : ""}`;
        text = "🎄 Christmas lights near here. Add any you spot!";
      }
    }
    haptic(10);
    try {
      if (navigator.share) {
        await navigator.share({ title: "HoHoHomes", text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
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
    if (drop.status === "saving") dropMsg = "Lighting it up…";
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
              <b>{count === null ? "…" : showOnly ? shows : count}</b>{" "}
              {showOnly ? (shows === 1 ? "showstopper" : "showstoppers") : count === 1 ? "house lit" : "houses lit"}
            </p>
          </div>
          <div className="bar-icons">
            <button
              type="button"
              className="icon-btn wow-toggle"
              onClick={toggleShowOnly}
              aria-pressed={showOnly}
              aria-label="Showstoppers only"
              title={showOnly ? "Showing Showstoppers only" : "Showstoppers only"}
            >
              <span aria-hidden="true">🤩</span>
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleMute}
              aria-pressed={muted}
              aria-label="Mute sounds"
              title={muted ? "Sound off" : "Sound on"}
            >
              <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
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

      {toast && (
        <div className="toast glass" role="status">
          {toast}
        </div>
      )}

      <div className="stack" inert={welcome || undefined}>
        <div className="credits">
          {creditsOpen && (
            <div id="credits-panel" className="credits-text glass">
              <a className="byline" href="https://ant.cat/writing/2026-11-21-hohohomes" target="_blank" rel="noopener">
                Created by <b>Ant.Cat</b>
              </a>
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
          <div className="tray glass" role="group" aria-label="Tag the vibe">
            <div className="tray-head">
              <span>What&apos;s the vibe? Tap any</span>
              <button onClick={() => setTrayOpen(false)}>Done</button>
            </div>
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
              <button type="button" className="primary" onClick={iSeeLights} disabled={mode === "locating"}>
                {mode === "locating" ? (
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
