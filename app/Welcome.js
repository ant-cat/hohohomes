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

function ShareIcon() {
  return (
    <svg className="share-ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </svg>
  );
}

const STEPS = [
  {
    e: "🔭",
    t: "Zoom out to find glowing neighborhoods.",
    s: "Zoom in and every house twinkles. Tap one for directions.",
  },
  {
    e: "🎄",
    t: "Spot lights? Tap “I see lights here.”",
    s: "Or tap 📍 and pick the house on the map. One tap, and it's lit.",
  },
  {
    e: "🤩",
    t: "Cheer on the best ones.",
    s: "Tap a house to mark it Lit Tonight, or vote it Worth the Drive.",
  },
];

// A one-time hello before the map. It never asks for location: the map does that only when you tap.
export default function Welcome({ onClose }) {
  const cardRef = useRef(null);
  const btnRef = useRef(null);
  const [how, setHow] = useState("none");

  useEffect(() => {
    const update = () => setHow(installHow());
    update();
    installListeners.add(update);
    return () => installListeners.delete(update);
  }, []);

  useEffect(() => {
    btnRef.current && btnRef.current.focus();
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
        className="welcome-card glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-lead"
      >
        <div className="welcome-lights" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ "--d": `${-(i * 0.37).toFixed(2)}s` }} />
          ))}
        </div>
        <h2 id="welcome-title">
          Welcome to HoHo<span>Homes</span> ✨
        </h2>
        <p id="welcome-lead" className="welcome-lead">
          A map of houses with Christmas lights, added by neighbors like you.
        </p>
        <ol className="welcome-steps">
          {STEPS.map((s) => (
            <li key={s.t}>
              <span className="e" aria-hidden="true">
                {s.e}
              </span>
              <span>
                <b>{s.t}</b>
                {s.s}
              </span>
            </li>
          ))}
        </ol>

        {how === "ios" && (
          <p className="welcome-install">
            <span className="e" aria-hidden="true">📲</span>
            <span>
              Keep it on your Home Screen: tap <b>Share</b> <ShareIcon />, then <b>Add to Home Screen</b>.
            </span>
          </p>
        )}
        {how === "android" && (
          <p className="welcome-install">
            <span className="e" aria-hidden="true">📲</span>
            <span>
              Keep it on your home screen: open your browser&apos;s <b>⋮</b> menu and tap <b>Add to Home screen</b>.
            </span>
          </p>
        )}

        <p className="welcome-free">No sign-up, no account. Just lights.</p>
        <button ref={btnRef} className="primary welcome-go" onClick={onClose}>
          Show me the lights
        </button>
        {how === "prompt" && (
          <button className="welcome-add" onClick={install}>
            📲 Add to Home Screen
          </button>
        )}
      </div>
    </div>
  );
}
