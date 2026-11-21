"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const JAX = [-81.6557, 30.3322];
const STYLE = "https://tiles.openfreemap.org/styles/dark";
const BOUNDS = { minLat: 29.6, maxLat: 31.0, minLng: -82.3, maxLng: -81.0 };
const LABELS = ["", "Nice", "Great", "Wow"];

function inBounds(lat, lng) {
  return lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
}

function toGeoJSON(pins) {
  return {
    type: "FeatureCollection",
    features: pins.map((p) => {
      const avg = p.rn ? p.rs / p.rn : 0;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          id: p.id,
          c: p.c || 1,
          avg,
          // More reports and a higher wow rating make a house glow more.
          w: Math.min(6, (p.c || 1) * (1 + avg / 3)),
          notes: JSON.stringify(p.n || []),
          t: p.u || p.t || 0,
        },
      };
    }),
  };
}

function timeAgo(ms) {
  if (!ms) return "";
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function popupNode(props, lngLat) {
  const el = document.createElement("div");
  const avg = Number(props.avg) || 0;
  const stars = document.createElement("div");
  stars.className = "pop-stars";
  const full = Math.round(avg);
  stars.textContent = avg ? "★".repeat(full) + "☆".repeat(3 - full) + "  " + LABELS[full] : "✨ Lights!";
  el.appendChild(stars);

  const meta = document.createElement("div");
  meta.className = "pop-meta";
  const c = Number(props.c) || 1;
  meta.textContent = `Seen by ${c} ${c === 1 ? "person" : "people"} · ${timeAgo(Number(props.t))}`;
  el.appendChild(meta);

  let notes = [];
  try {
    notes = JSON.parse(props.notes || "[]");
  } catch {}
  for (const n of notes) {
    const p = document.createElement("div");
    p.className = "pop-note";
    p.textContent = `“${n}”`;
    el.appendChild(p);
  }

  const a = document.createElement("a");
  a.className = "pop-dir";
  a.href = `https://www.google.com/maps/dir/?api=1&destination=${lngLat.lat.toFixed(5)},${lngLat.lng.toFixed(5)}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "Directions →";
  el.appendChild(a);
  return el;
}

export default function LightsMap() {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const libRef = useRef(null);
  const markerRef = useRef(null);
  const pinsRef = useRef([]);
  const modeRef = useRef("idle");
  const pendingRef = useRef(null); // spot to add when the map can't draw

  const [count, setCount] = useState(null);
  const [mode, setMode] = useState("idle"); // idle | locating | picking | placing | saving
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const say = useCallback((msg, ms = 3200) => {
    setToast(msg);
    if (msg) setTimeout(() => setToast((t) => (t === msg ? "" : t)), ms);
  }, []);

  const setPins = useCallback((pins) => {
    pinsRef.current = pins;
    setCount(pins.length);
    const src = mapRef.current && mapRef.current.getSource("pins");
    if (src) src.setData(toGeoJSON(pins));
  }, []);

  const clearMarker = useCallback(() => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, []);

  const placeMarker = useCallback(
    (lngLat, zoom) => {
      const map = mapRef.current;
      const maplibregl = libRef.current;
      if (!map || !maplibregl) {
        // No map on this device: still let people add the spot.
        pendingRef.current = lngLat;
        setMode("placing");
        return;
      }
      clearMarker();
      const el = document.createElement("div");
      el.className = "placing";
      markerRef.current = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(lngLat).addTo(map);
      map.flyTo({ center: lngLat, zoom: Math.max(map.getZoom(), zoom || 17), speed: 1.6, padding: { bottom: 260 } });
      setMode("placing");
    },
    [clearMarker]
  );

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
        attributionControl: { compact: true },
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

        map.addSource("pins", { type: "geojson", data: toGeoJSON(pinsRef.current) });

        map.addLayer({
          id: "heat",
          type: "heatmap",
          source: "pins",
          maxzoom: 17,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "w"], 0, 0, 6, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 9, 1, 15, 3],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 14, 13, 26, 16, 40],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.9, 16.5, 0],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.15, "rgba(150,20,40,0.55)",
              0.35, "rgb(232,57,74)",
              0.55, "rgb(255,140,50)",
              0.75, "rgb(255,201,77)",
              1, "rgb(255,248,220)",
            ],
          },
        });

        map.addLayer({
          id: "glow",
          type: "circle",
          source: "pins",
          minzoom: 12.5,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 12.5, 6, 17, 22],
            "circle-color": "#ffc94d",
            "circle-blur": 1,
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 14, 0.55],
          },
        });

        map.addLayer({
          id: "dots",
          type: "circle",
          source: "pins",
          minzoom: 12.5,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 12.5, 3, 17, 9],
            "circle-color": [
              "step",
              ["get", "avg"],
              "#ffe6a6",
              1.5, "#ffc94d",
              2.5, "#ff6b5a",
            ],
            "circle-stroke-color": "#fff",
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 15, 1.5],
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 13.5, 1],
            "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 13.5, 1],
          },
        });

        map.on("click", "dots", (e) => {
          if (modeRef.current !== "idle") return;
          const f = e.features && e.features[0];
          if (!f) return;
          const lngLat = { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
          new maplibregl.Popup({ offset: 12, maxWidth: "260px" })
            .setLngLat(lngLat)
            .setDOMContent(popupNode(f.properties, lngLat))
            .addTo(map);
        });
        map.on("mouseenter", "dots", () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", "dots", () => (map.getCanvas().style.cursor = ""));
      });

      map.on("click", (e) => {
        if (modeRef.current !== "picking" && modeRef.current !== "placing") return;
        if (markerRef.current && modeRef.current === "placing") {
          markerRef.current.setLngLat(e.lngLat);
          return;
        }
        placeMarker(e.lngLat, map.getZoom());
      });

    })();
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [placeMarker, setPins]);

  const cancel = useCallback(() => {
    clearMarker();
    pendingRef.current = null;
    setMode("idle");
    setRating(0);
    setNote("");
  }, [clearMarker]);

  const startPicking = useCallback(
    (msg) => {
      if (!mapRef.current) {
        setMode("idle");
        say("Type the address in the box above to add it.", 4500);
        return;
      }
      setMode("picking");
      say(msg, 4500);
    },
    [say]
  );

  const iSeeLights = useCallback(() => {
    if (!navigator.geolocation) return startPicking("Tap the map where the lights are.");
    setMode("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (!inBounds(lat, lng)) return startPicking("You look outside Jacksonville. Tap the map where the lights are.");
        placeMarker({ lng, lat }, 17.5);
      },
      () => startPicking("Couldn't get your location. Tap the map where the lights are."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [placeMarker, startPicking]);

  const nearMe = useCallback(() => {
    if (!navigator.geolocation) return say("Location isn't available on this device.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current && mapRef.current.flyTo({ center: [lng, lat], zoom: 14, speed: 1.6 });
      },
      () => say("Couldn't get your location."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [say]);

  const search = useCallback(
    async (e) => {
      e.preventDefault();
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
        placeMarker({ lng, lat }, 17.5);
      } catch {
        say("Address search isn't working right now. Tap the map instead.");
      }
    },
    [query, placeMarker, say]
  );

  const save = useCallback(async () => {
    const spot = markerRef.current ? markerRef.current.getLngLat() : pendingRef.current;
    if (!spot) return;
    const { lng, lat } = spot;
    setMode("saving");
    try {
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lat, lng, rating, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save that, try again.");
      setPins(data.pins);
      clearMarker();
      pendingRef.current = null;
      setRating(0);
      setNote("");
      setMode("idle");
      say(data.merged ? "Added your vote to this house 🎄" : "Added! Thanks for spreading cheer 🎄");
    } catch (err) {
      setMode("placing");
      say(err.message);
    }
  }, [rating, note, setPins, clearMarker, say]);

  const sheetOpen = mode === "placing" || mode === "saving";

  return (
    <main className="app">
      <div ref={mapEl} className="map" />
      {mapError && <div className="maperror">{mapError}</div>}

      <div className="top">
        <div className="brand">
          <div>
            <h1>
              HoHo<span>Homes</span> ✨
            </h1>
            <small>Christmas lights around Jacksonville</small>
          </div>
          <div className="count">
            <b>{count === null ? "…" : count}</b>
            {count === 1 ? "house lit" : "houses lit"}
          </div>
        </div>
        <form className="search" onSubmit={search}>
          <input
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

      {toast && <div className="toast" role="status">{toast}</div>}

      {mode === "picking" && (
        <div className="banner">
          Tap the house on the map
          <button onClick={cancel}>Cancel</button>
        </div>
      )}

      {!sheetOpen && (
        <div className="bottom">
          <button className="round" onClick={nearMe} aria-label="Show lights near me">
            ◎
          </button>
          <button className="primary" onClick={iSeeLights} disabled={mode === "locating"}>
            {mode === "locating" ? "Finding you…" : "🎄 I see lights here"}
          </button>
          <button
            className="round"
            onClick={() => startPicking("Tap the house on the map.")}
            aria-label="Pick a house on the map"
          >
            📍
          </button>
        </div>
      )}

      {sheetOpen && (
        <div className="sheet" role="dialog" aria-label="Add a house">
          <div className="grab" />
          <h2>Lights here?</h2>
          <p>
            {mapError
              ? "We'll add the lights at the spot you picked."
              : "Drag the gold pin or tap the map to put it on the exact house."}
          </p>
          <div className="label">How wow is it? (optional)</div>
          <div className="stars">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={`star${rating === n ? " on" : ""}`}
                onClick={() => setRating(rating === n ? 0 : n)}
                type="button"
              >
                <b>{"★".repeat(n)}</b>
                {LABELS[n]}
              </button>
            ))}
          </div>
          <input
            className="note"
            maxLength={80}
            placeholder="Add a note (optional), like “synced to music”"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="row">
            <button className="ghost" onClick={cancel} type="button">
              Cancel
            </button>
            <button className="primary" onClick={save} disabled={mode === "saving"} type="button">
              {mode === "saving" ? "Adding…" : "Add it ✨"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
