"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VIBES } from "../lib/vibes";
import { snapToBuilding, metersBetween, placeName } from "./geo";
import { primeAudio, chime, haptic, lightUp } from "./fx";
import { popupNode, isFresh, rememberConfirmed } from "./popup";

const JAX = [-81.6557, 30.3322];
const STYLE = "https://tiles.openfreemap.org/styles/dark";
const BOUNDS = { minLat: 29.6, maxLat: 31.0, minLng: -82.3, maxLng: -81.0 };

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

function inBounds(lat, lng) {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

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
      properties: { id: p.id, fresh: isFresh(p, now) ? 1 : 0, h: hash(p.id) % SPARK_COLORS.length },
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
  if (!res.ok) throw new Error(data.error || "Could not save that, try again.");
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
  const dropAtRef = useRef(() => {});

  const [count, setCount] = useState(null);
  const [mode, setMode] = useState("idle"); // idle | locating | picking | adjusting
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [mapError, setMapError] = useState("");
  const [drop, setDrop] = useState(null); // { status, merged, snapped, rough, vibes }
  const [trayOpen, setTrayOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const m = loadMuted();
    mutedRef.current = m;
    setMuted(m);
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
    }
  }, []);

  const setPins = useCallback(
    (pins) => {
      pinsRef.current = pins;
      setCount(pins.length);
      const src = mapRef.current && mapRef.current.getSource("pins");
      if (src) src.setData(toGeoJSON(pins));
      syncOrbs();
    },
    [syncOrbs]
  );

  const confirmLit = useCallback(
    async (id) => {
      haptic(20);
      if (!mutedRef.current) chime(false);
      const before = pinsRef.current;
      const now = Date.now();
      setPins(before.map((p) => (p.id === id ? { ...p, l: now } : p)));
      try {
        const data = await api("POST", `/api/pins/${id}/lit`);
        lastWriteRef.current = Date.now();
        rememberConfirmed(id);
        if (data.pins) setPins(data.pins);
      } catch (err) {
        setPins(before);
        say(err.message);
        throw err;
      }
    },
    [setPins, say]
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
        .setDOMContent(popupNode(pin, { onLit: confirmLit }))
        .addTo(map);
      // Keep the card clear of the header.
      const y = map.project([pin.lng, pin.lat]).y;
      const minY = 330;
      if (y < minY) map.panBy([0, y - minY], { duration: 350 });
    },
    [confirmLit]
  );
  openPopupRef.current = openPopup;

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

  // Floating "San Marco • 14 houses" labels on the Hot Zones in view.
  const syncZones = useCallback(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!map || !lib) return;
    const labels = zonesRef.current;
    const want = new Map();
    if (map.getZoom() < ORB_ZOOM && map.getLayer("zone-halo")) {
      const feats = map
        .queryRenderedFeatures({ layers: ["zone-halo"] })
        .sort((a, b) => b.properties.point_count - a.properties.point_count);
      for (const f of feats) {
        const key = `${f.properties.cluster_id}`;
        if (!want.has(key) && want.size < MAX_ZONE_LABELS) want.set(key, f);
      }
    }
    // Biggest zones get labels first; skip any that would sit on top of another.
    const placed = [];
    for (const [key, f] of [...want]) {
      const pt = map.project(f.geometry.coordinates);
      if (placed.some((q) => Math.abs(q.x - pt.x) < 150 && Math.abs(q.y - pt.y) < 34)) want.delete(key);
      else placed.push(pt);
    }
    for (const [key, z] of labels) {
      if (!want.has(key)) {
        z.marker.remove();
        labels.delete(key);
      }
    }
    const precision = map.getZoom() < 11 ? 2 : 3;
    for (const [key, f] of want) {
      if (labels.has(key)) continue;
      const n = f.properties.point_count;
      const [lng, lat] = f.geometry.coordinates;
      const el = document.createElement("button");
      el.type = "button";
      el.className = "zone-label";
      const name = document.createElement("b");
      const meta = document.createElement("span");
      meta.textContent = `${n} houses`;
      el.append(name, meta);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (modeRef.current === "idle") zoomIntoZone(f.properties.cluster_id, [lng, lat]);
      });
      const marker = new lib.Marker({ element: el, anchor: "center" }).setLngLat([lng, lat]).addTo(map);
      labels.set(key, { marker });
      placeName(lng, lat, precision)
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
    // Load the houses on their own, so the count shows even if the map can't draw.
    fetch("/api/pins")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.pins)) setPins(data.pins);
      })
      .catch(() => !cancelled && setCount(0));

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
      try {
        map = new maplibregl.Map({
          container: mapEl.current,
          style: STYLE,
          center: JAX,
          zoom: 10.3,
          minZoom: 8,
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

        map.addSource("pins", {
          type: "geojson",
          data: toGeoJSON(pinsRef.current),
          cluster: true,
          clusterMaxZoom: CLUSTER_MAX_ZOOM,
          clusterRadius: 44,
          clusterProperties: { fresh: ["+", ["get", "fresh"]] },
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
        for (const layer of ["zone-halo", "spark-glow"]) {
          map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
          map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
        }
        syncOrbs();
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
      map.on("moveend", syncOrbs);
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
  }, [setPins, syncOrbs, syncZones, zoomIntoZone]);

  // Dim houses as they go stale, and pick up other people's houses now and then.
  useEffect(() => {
    const tick = setInterval(() => setPins(pinsRef.current), 60 * 1000);
    const refresh = setInterval(() => {
      if (document.hidden || sessionRef.current || Date.now() - lastWriteRef.current < 90 * 1000) return;
      fetch("/api/pins")
        .then((r) => r.json())
        .then((data) => Array.isArray(data.pins) && setPins(data.pins))
        .catch(() => {});
    }, 3 * 60 * 1000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [setPins]);

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
        setPins(data.pins);
      } catch (err) {
        s.sent = null;
        say(err.message);
      }
    },
    [setPins, say]
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
        s.pinId = data.pin.id;
        s.lngLat = { lng: data.pin.lng, lat: data.pin.lat };
        setPins(data.pins);
        if (sessionRef.current === s) {
          setDrop((d) => d && { ...d, merged: data.merged, snapped: Boolean(auto), adjusted: !auto, rough: false });
        }
      } catch (err) {
        say(err.message);
      }
    },
    [setPins, say]
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
          setPins(data.pins);
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
    [endSession, autoSnap, setPins, pushVibes, say]
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
      setPins(data.pins);
      say("Pin removed");
    } catch (err) {
      say(err.message);
    }
  }, [setPins, say]);

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
        if (!inBounds(lat, lng)) return startPicking("You look outside Jacksonville. Tap the map where the lights are.");
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
      try {
        const url =
          `https://photon.komoot.io/api/?limit=1&lat=${JAX[1]}&lon=${JAX[0]}` +
          `&bbox=${BOUNDS.minLng},${BOUNDS.minLat},${BOUNDS.maxLng},${BOUNDS.maxLat}` +
          `&q=${encodeURIComponent(q)}`;
        const res = await fetch(url);
        const data = await res.json();
        const f = data.features && data.features[0];
        if (!f) return say("Couldn't find that address near Jacksonville.");
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
      <div ref={mapEl} className="map" />
      {mapError && <div className="maperror">{mapError}</div>}

      <div className="top">
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
              HoHo<span>Homes</span> ✨
            </h1>
            <small>Christmas lights around Jacksonville</small>
          </div>
          <div className="count">
            <b>{count === null ? "…" : count}</b>
            {count === 1 ? "house lit" : "houses lit"}
          </div>
          <button
            className="mute"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? "Turn sounds on" : "Mute sounds"}
            title={muted ? "Sounds off" : "Sounds on"}
          >
            {muted ? "🔕" : "🔔"}
          </button>
        </div>
        <form className="search" onSubmit={search}>
          <input
            className="glass"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Add by address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for an address to add"
          />
        </form>
      </div>

      {toast && (
        <div className="toast glass" role="status">
          {toast}
        </div>
      )}

      <div className="stack">
        <div className="credits">
          {!creditsOpen && (
            <a className="byline" href="https://ant.cat/writing/2026-11-21-hohohomes" target="_blank" rel="noopener">
              Created by <b>Ant.Cat</b>
            </a>
          )}
          {creditsOpen && (
            <div className="credits-text glass">
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
            </div>
          )}
          <button
            className="credits-btn glass"
            onClick={() => setCreditsOpen((o) => !o)}
            aria-expanded={creditsOpen}
            aria-label="Map credits"
          >
            i
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
          <div className="dock">
            <button className="round glass" onClick={nearMe} aria-label="Show lights near me">
              ◎
            </button>
            <button className="primary" onClick={iSeeLights} disabled={mode === "locating"}>
              {mode === "locating" ? "Finding you…" : "🎄 I see lights here"}
            </button>
            <button
              className="round glass"
              onClick={() => {
                primeAudio();
                startPicking();
              }}
              aria-label="Pick a house on the map"
            >
              📍
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
