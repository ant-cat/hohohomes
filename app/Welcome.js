"use client";

import { useEffect, useRef, useState } from "react";

const KEY = "hh:welcomed";

// True the first time someone opens the app on this device. Storage can be off (private mode),
// and then we just show the welcome, which is harmless.
export function shouldWelcome() {
  try {
    return localStorage.getItem(KEY) !== "1";
  } catch {
    return true;
  }
}

export function rememberWelcomed() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {}
}

// Chrome and Edge on Android offer their own install prompt. Keep hold of it from page load,
// so the welcome can show an "Add to Home Screen" button that opens it.
let installEvent = null;
const installListeners = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    installEvent = e;
    installListeners.forEach((fn) => fn());
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    installListeners.forEach((fn) => fn());
  });
}

// none: already installed, or a desktop browser | prompt: the browser can install it | ios | android
function installHow() {
  try {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if (standalone) return "none";
    if (installEvent) return "prompt";
    const ua = navigator.userAgent || "";
    const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) return "ios";
    if (/Android/.test(ua)) return "android";
  } catch {}
  return "none";
}

const STEPS = [
  ["🔭", "Zoom out to find the glowing streets."],
  ["🎄", "Tap “I see lights here” to add a house."],
  ["🤩", "Tap any house to cheer it on."],
];

// A few slow flakes drifting through the card. Fixed values, so the server and phone draw the same thing.
const FLAKES = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 41 + 7) % 100}%`,
  size: `${2 + ((i * 5) % 3)}px`,
  dur: `${7 + ((i * 13) % 6)}s`,
  delay: `${-((i * 23) % 12)}s`,
  dx: `${((i * 17) % 25) - 12}px`,
}));

// A one-time hello before the map. It never asks for location: the map does that only when you tap.
export default function Welcome({ onClose }) {
  const cardRef = useRef(null);
  const [how, setHow] = useState("none");

  useEffect(() => {
    const update = () => setHow(installHow());
    update();
    installListeners.add(update);
    return () => installListeners.delete(update);
  }, []);

  useEffect(() => {
    cardRef.current && cardRef.current.focus();
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab" && cardRef.current) {
        // Keep focus inside the welcome while it's open.
        const items = [...cardRef.current.querySelectorAll("button")];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !cardRef.current.contains(document.activeElement))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || !cardRef.current.contains(document.activeElement))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const install = async () => {
    const e = installEvent;
    if (!e) return;
    try {
      await e.prompt();
      const choice = await e.userChoice;
      if (choice && choice.outcome === "accepted") installEvent = null;
    } catch {}
    setHow(installHow());
  };

  return (
    <div className="welcome" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={cardRef}
        tabIndex={-1}
        className="welcome-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-lead"
      >
        <div className="welcome-snow" aria-hidden="true">
          {FLAKES.map((f, i) => (
            <i key={i} style={{ left: f.left, "--s": f.size, "--dur": f.dur, "--delay": f.delay, "--dx": f.dx }} />
          ))}
        </div>
        <div className="welcome-lights" aria-hidden="true">
          {Array.from({ length: 11 }, (_, i) => (
            <i key={i} style={{ "--d": `${(i * 0.18).toFixed(2)}s` }} />
          ))}
        </div>
        <h2 id="welcome-title">Welcome to HoHoHomes</h2>
        <p id="welcome-lead" className="welcome-lead">
          Christmas lights near you, shared by neighbors. No sign-up needed.
        </p>
        <ul className="welcome-steps">
          {STEPS.map(([e, t]) => (
            <li key={t}>
              <span className="e" aria-hidden="true">
                {e}
              </span>
              {t}
            </li>
          ))}
        </ul>
        <button className="welcome-go" onClick={onClose}>
          Show me the lights
        </button>
        {how === "prompt" && (
          <button className="welcome-add" onClick={install}>
            Add to Home Screen
          </button>
        )}
        {how === "ios" && <p className="welcome-tip">Tip: tap Share, then Add to Home Screen.</p>}
        {how === "android" && <p className="welcome-tip">Tip: add it to your home screen from the ⋮ menu.</p>}
      </div>
    </div>
  );
}
