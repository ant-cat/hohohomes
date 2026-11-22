"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BADGES, SCOUT_EVENT, loadScout, progress, seasonNow } from "./scout";
import { chime, haptic } from "./fx";
import "./scout.css";

function soundOn() {
  try {
    return localStorage.getItem("hh:muted") !== "1";
  } catch {
    return true;
  }
}

// The 🏅 button, the "Badge earned!" toast, and the badge shelf. Everything is counted on this phone.
export default function ScoutBadges() {
  const [list, setList] = useState(() => BADGES.map((b) => ({ ...b, have: 0, earned: false })));
  const [queue, setQueue] = useState([]); // badges waiting to be celebrated
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);

  const refresh = useCallback(() => setList(progress(loadScout())), []);

  useEffect(() => {
    setMounted(true);
    refresh();
    const onScout = (e) => {
      refresh();
      const earned = (e.detail && e.detail.earned) || [];
      if (earned.length) setQueue((q) => [...q, ...earned]);
    };
    // Another tab on the same phone earned something.
    const onStorage = (e) => {
      if (!e.key || e.key.startsWith("hh:scout:")) refresh();
    };
    window.addEventListener(SCOUT_EVENT, onScout);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SCOUT_EVENT, onScout);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const current = queue[0];

  // Celebrate one badge at a time.
  useEffect(() => {
    if (!current) return;
    haptic([30, 60, 40]);
    // Let the "lights added" chime finish first.
    const ring = setTimeout(() => soundOn() && chime(true), 450);
    const next = setTimeout(() => setQueue((q) => q.slice(1)), 4800);
    return () => {
      clearTimeout(ring);
      clearTimeout(next);
    };
  }, [current]);

  const open = useCallback(() => {
    const d = dialogRef.current;
    if (!d) return;
    refresh();
    setQueue([]);
    haptic(10);
    try {
      if (!d.open) d.showModal();
    } catch {
      d.setAttribute("open", "");
    }
  }, [refresh]);

  const close = useCallback(() => {
    const d = dialogRef.current;
    if (!d) return;
    try {
      d.close();
    } catch {
      d.removeAttribute("open");
    }
  }, []);

  const earnedCount = list.filter((b) => b.earned).length;

  return (
    <>
      <button
        type="button"
        className="scout-btn glass"
        onClick={open}
        aria-haspopup="dialog"
        aria-label={`Your scout badges, ${earnedCount} of ${BADGES.length} earned`}
        title="Scout badges"
      >
        <span aria-hidden="true">🏅</span>
        {earnedCount > 0 && (
          <span className="scout-count" aria-hidden="true">
            {earnedCount}
          </span>
        )}
      </button>

      {mounted &&
        current &&
        createPortal(
          <button key={current.id} type="button" className="scout-toast glass" onClick={open} aria-live="polite">
            <span className="scout-toast-emoji" aria-hidden="true">
              {current.emoji}
            </span>
            <span className="scout-toast-text">
              <small>Badge earned!</small>
              <b>{current.name}</b>
            </span>
            <span className="scout-sparks" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </button>,
          document.body
        )}

      {mounted &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="scout-sheet"
            aria-labelledby="scout-title"
            onClick={(e) => {
              // A tap on the dimmed backdrop lands on the dialog itself.
              if (e.target === dialogRef.current) close();
            }}
          >
            <div className="scout-inner">
              <div className="scout-head">
                <div>
                  <h2 id="scout-title">
                    🏅 Scout <span>badges</span>
                  </h2>
                  <small>
                    {earnedCount} of {BADGES.length} earned · {seasonNow()} season
                  </small>
                </div>
                <button type="button" className="scout-close" onClick={close} aria-label="Close badges" autoFocus>
                  ✕
                </button>
              </div>
              <ul className="scout-grid">
                {list.map((b) => (
                  <li key={b.id} className={`scout-badge${b.earned ? " earned" : ""}`}>
                    <span className="scout-emoji" aria-hidden="true">
                      {b.emoji}
                    </span>
                    <b>{b.name}</b>
                    <small>{b.hint}</small>
                    {b.earned ? (
                      <span className="scout-done">Earned ✨</span>
                    ) : (
                      <span
                        className="scout-bar"
                        role="progressbar"
                        aria-label={`${b.name} progress`}
                        aria-valuemin={0}
                        aria-valuemax={b.need}
                        aria-valuenow={b.have}
                        aria-valuetext={`${b.have} of ${b.need}`}
                      >
                        <i style={{ width: `${(b.have / b.need) * 100}%` }} />
                        <em>
                          {b.have} / {b.need}
                        </em>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="scout-foot">Saved on this phone only. No sign-up, and nothing about you is shared.</p>
            </div>
          </dialog>,
          document.body
        )}
    </>
  );
}
