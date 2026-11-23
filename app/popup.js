import { VIBES, FRESH_MS, lastLit, isShowstopper } from "../lib/vibes";
import { isDisplay, isPendingDisplay, displayPhase, dateRange, shortDay } from "../lib/displays";

const LIT_KEY = (id) => `hh:lit:${id}`;
const WOW_KEY = (id) => `hh:wow:${id}`;
const WOW_WINDOW = 12 * 60 * 60 * 1000;
const DISP_KEY = (id) => `hh:disp:${id}`;
const DISP_WINDOW = 14 * 24 * 60 * 60 * 1000;
const MINE_WINDOW = 6 * 60 * 60 * 1000;

function short(ms) {
  const m = Math.max(0, Math.round(ms / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function litLabel(ms) {
  if (!ms) return "Not confirmed yet";
  const age = Date.now() - ms;
  if (age < 24 * 60 * 60 * 1000) return `Confirmed ${short(age)}`;
  const d = Math.max(1, Math.round(age / 86400000));
  return `Last lit ${d} day${d === 1 ? "" : "s"} ago`;
}

export function isFresh(p, now = Date.now()) {
  return now - lastLit(p) < FRESH_MS;
}

export function confirmedByMe(id) {
  try {
    return Date.now() - Number(localStorage.getItem(LIT_KEY(id)) || 0) < MINE_WINDOW;
  } catch {
    return false;
  }
}

export function rememberConfirmed(id) {
  try {
    localStorage.setItem(LIT_KEY(id), String(Date.now()));
  } catch {}
}

export function votedByMe(id) {
  try {
    return Date.now() - Number(localStorage.getItem(WOW_KEY(id)) || 0) < WOW_WINDOW;
  } catch {
    return false;
  }
}

export function rememberVoted(id) {
  try {
    localStorage.setItem(WOW_KEY(id), String(Date.now()));
  } catch {}
}

// A display you named on this phone, so its card can say so while it waits for a second look.
export function rememberMyDisplay(id, name) {
  try {
    localStorage.setItem(DISP_KEY(id), JSON.stringify({ n: name, at: Date.now() }));
  } catch {}
}

export function forgetMyDisplay(id) {
  try {
    localStorage.removeItem(DISP_KEY(id));
  } catch {}
}

function myDisplay(id) {
  try {
    const d = JSON.parse(localStorage.getItem(DISP_KEY(id)) || "null");
    return d && Date.now() - d.at < DISP_WINDOW ? d.n : "";
  } catch {
    return "";
  }
}

const wowText = (n) => `🤩 ${n} ${n === 1 ? "person says" : "people say"} it's worth the drive`;

function div(cls, text) {
  const el = document.createElement("div");
  el.className = cls;
  if (text) el.textContent = text;
  return el;
}

// The card shown when someone taps a house.
export function popupNode(pin, { onLit, onWow, onSeeDisplay, onRemove }) {
  const el = div("pop");

  // Only ever celebrate upward: Showstoppers get a badge, every other house is simply "Lights!".
  const show = isShowstopper(pin);
  const c = pin.c || 1;
  const phase = isDisplay(pin) ? displayPhase(pin.d) : "";
  if (isDisplay(pin)) {
    el.classList.add("pop-display");
    if (phase === "soon" || phase === "over") el.classList.add("pop-soon");
    el.appendChild(div("pop-kind", show ? "⭐ Public display · 🤩 Showstopper" : "⭐ Public display"));
    el.appendChild(div("pop-title display", pin.d.n));
    // Its season: "Nov 27 – Jan 3 · 6-10 PM", with a note when it hasn't started or has ended.
    const range = dateRange(pin.d);
    const when = [range, pin.d.h].filter(Boolean).join(" · ");
    if (phase === "soon" && pin.d.f) el.appendChild(div("pop-phase", `Not lit yet · starts ${shortDay(pin.d.f)}`));
    if (phase === "over") el.appendChild(div("pop-phase", "Done for this season"));
    if (when) el.appendChild(div("pop-when", `🗓️ ${when}`));
  } else {
    el.appendChild(div(`pop-title${show ? " show" : ""}`, show ? "🤩 Showstopper" : "✨ Lights!"));
  }
  el.appendChild(div("pop-meta", `Seen by ${c} ${c === 1 ? "person" : "people"}`));

  // A display someone named, waiting for a second pair of eyes. Its name stays hidden until then.
  if (isPendingDisplay(pin)) {
    const mine = myDisplay(pin.id);
    const box = div("pop-pending");
    if (mine) {
      box.appendChild(div("pop-pending-text", `⭐ You named this ${mine}. It shows as a public display once someone else confirms it.`));
    } else {
      box.appendChild(div("pop-pending-text", "⭐ Someone says this is a public display, like a farm, park or business. Is it?"));
      const see = document.createElement("button");
      see.type = "button";
      see.className = "see-btn";
      see.textContent = "I see this display too";
      see.addEventListener("click", () => {
        see.disabled = true;
        see.textContent = "Thanks! ⭐";
        see.classList.add("pulse");
        onSeeDisplay(pin.id).catch(() => {
          see.disabled = false;
          see.textContent = "I see this display too";
          see.classList.remove("pulse");
        });
      });
      box.appendChild(see);
    }
    el.appendChild(box);
  }
  const wowLine = div("pop-wow", pin.w ? wowText(pin.w) : "");
  if (!pin.w) wowLine.hidden = true;
  el.appendChild(wowLine);

  const tags = VIBES.filter((v) => pin.v && pin.v[v.id] > 0);
  if (tags.length) {
    const row = div("pop-vibes");
    for (const v of tags) {
      const n = pin.v[v.id];
      row.appendChild(div("pop-vibe", `${v.emoji} ${v.label}${n > 1 ? ` ×${n}` : ""}`));
    }
    el.appendChild(row);
  }

  for (const n of pin.n || []) el.appendChild(div("pop-note", `“${n}”`));

  const lit = div("pop-lit");
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lit-btn";
  const ago = div("lit-ago", litLabel(lastLit(pin)));
  if (!isFresh(pin)) ago.classList.add("stale");
  const mine = confirmedByMe(pin.id);
  btn.textContent = mine ? "Thanks! ✨" : "Lit Tonight ✨";
  btn.disabled = mine;
  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.textContent = "Thanks! ✨";
    btn.classList.add("pulse");
    ago.textContent = litLabel(Date.now());
    ago.classList.remove("stale");
    onLit(pin.id).catch(() => {
      btn.disabled = false;
      btn.textContent = "Lit Tonight ✨";
      btn.classList.remove("pulse");
      ago.textContent = litLabel(lastLit(pin));
    });
  });
  lit.appendChild(btn);
  lit.appendChild(ago);
  // Nothing to confirm before a display opens or after it closes.
  if (phase !== "soon" && phase !== "over") el.appendChild(lit);

  const wow = document.createElement("button");
  wow.type = "button";
  wow.className = "wow-btn";
  const voted = votedByMe(pin.id);
  wow.textContent = voted ? "🤩 You said it's worth the drive" : "🤩 Worth the Drive";
  wow.disabled = voted;
  wow.addEventListener("click", () => {
    wow.disabled = true;
    wow.textContent = "🤩 You said it's worth the drive";
    wow.classList.add("pulse");
    wowLine.hidden = false;
    wowLine.textContent = wowText((pin.w || 0) + 1);
    onWow(pin.id).catch(() => {
      wow.disabled = false;
      wow.textContent = "🤩 Worth the Drive";
      wow.classList.remove("pulse");
      wowLine.hidden = !pin.w;
      wowLine.textContent = pin.w ? wowText(pin.w) : "";
    });
  });
  el.appendChild(wow);

  const a = document.createElement("a");
  a.className = "pop-dir";
  a.href = `https://www.google.com/maps/dir/?api=1&destination=${pin.lat.toFixed(5)},${pin.lng.toFixed(5)}`;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = "Directions →";
  el.appendChild(a);

  // Only shown to the owner in admin mode.
  if (onRemove) {
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "rm-btn";
    rm.textContent = "Remove house";
    rm.addEventListener("click", () => {
      if (!window.confirm("Remove this house from the map for everyone?")) return;
      rm.disabled = true;
      rm.textContent = "Removing…";
      onRemove(pin.id).catch(() => {
        rm.disabled = false;
        rm.textContent = "Remove house";
      });
    });
    el.appendChild(rm);
  }
  return el;
}
