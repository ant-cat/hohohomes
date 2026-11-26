"use client";

import { useEffect, useState } from "react";

// The same place the map keeps the key for admin mode (/?admin=…), so unlocking either one
// unlocks both on this device, and "Forget the key" turns both off.
const STORE = "hh:admin";

const remember = (key) => {
  try {
    if (key) localStorage.setItem(STORE, key);
    else localStorage.removeItem(STORE);
  } catch {}
};

const errorOf = (data, fallback) => (data && typeof data.error === "string" ? data.error : fallback);

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export default function AdminLoad({ sets }) {
  const [key, setKey] = useState("");
  const [typed, setTyped] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) setKey(saved);
    } catch {}
  }, []);

  const forget = (message = "") => {
    remember("");
    setKey("");
    setTyped("");
    setResults({});
    setError(message);
  };

  async function unlock(e) {
    e.preventDefault();
    const k = typed.trim();
    if (!k || checking) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "x-admin-key": k } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(errorOf(data, "That admin key didn't work."));
      remember(k);
      setKey(k);
      setTyped("");
    } catch (err) {
      setError(err.message || "Could not check the key, try again.");
    } finally {
      setChecking(false);
    }
  }

  async function load(set) {
    if (busy) return;
    if (!window.confirm(`Load ${set.label} (${plural(set.count, "display", "displays")}) onto the live map?`)) return;
    setBusy(set.name);
    setResults((r) => ({ ...r, [set.name]: null }));
    try {
      const res = await fetch(`/api/admin/seed?set=${encodeURIComponent(set.name)}`, {
        method: "POST",
        headers: { "x-admin-key": key },
      });
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        forget("That admin key didn't work anymore. Enter it again.");
        return;
      }
      if (!res.ok || !data || !Array.isArray(data.results)) throw new Error(errorOf(data, "Could not load that, try again."));
      const added = data.results.filter((r) => r.added).length;
      const already = data.results.length - added;
      const text =
        added && already
          ? `${plural(added, "new star", "new stars")} added. ${already} were already on the map and got refreshed.`
          : added
            ? `${plural(added, "new star", "new stars")} added.`
            : `All ${already} were already on the map and got refreshed. Nothing new added.`;
      setResults((r) => ({ ...r, [set.name]: { ok: true, text } }));
    } catch (err) {
      setResults((r) => ({ ...r, [set.name]: { ok: false, text: err.message } }));
    } finally {
      setBusy("");
    }
  }

  if (!key) {
    return (
      <form className="admin-card" onSubmit={unlock}>
        {/* Lets a phone's password manager save the key under a name. */}
        <input type="text" name="username" autoComplete="username" value="HoHoHomes admin" readOnly hidden />
        <label htmlFor="admin-key">Admin key</label>
        <input
          id="admin-key"
          className="admin-input"
          type="password"
          name="password"
          autoComplete="current-password"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        {error ? <p className="admin-error" role="alert">{error}</p> : null}
        <button className="info-button admin-go" type="submit" disabled={!typed.trim() || checking}>
          {checking ? "Checking…" : "Unlock"}
        </button>
      </form>
    );
  }

  return (
    <div className="admin-card">
      <ul className="admin-sets">
        {sets.map((set) => {
          const result = results[set.name];
          return (
            <li key={set.name}>
              <div className="admin-set">
                <div>
                  <b>{set.label}</b>
                  <small>
                    {plural(set.count, "display", "displays")} · {set.name}
                  </small>
                </div>
                <button className="info-button" type="button" disabled={!!busy} onClick={() => load(set)}>
                  {busy === set.name ? "Loading…" : "Load"}
                </button>
              </div>
              {result ? (
                <p className={result.ok ? "admin-done" : "admin-error"} role="status">
                  {result.text}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="admin-note">New stars can take up to a minute to show on the map.</p>
      <button className="admin-forget" type="button" onClick={() => forget()}>
        Forget the key on this device
      </button>
    </div>
  );
}
