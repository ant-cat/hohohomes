// Scout badges: progress kept on this phone only. No account, nothing sent to the server.
//
// Stored in localStorage under one key per season (the map starts fresh every January 15):
//   hh:scout:2026  { h: { pinId: n }, l: [pinId], w: [pinId], d: ["2026-12-03"], seen: [badgeId] }
//   h  houses you reported (n = how many of your reports point at it, so an undo only takes back one)
//   l  houses you confirmed "Lit Tonight"   w  houses you voted "Worth the Drive"
//   d  nights you were out spotting (your local date)   seen  badges already celebrated
// If storage is blocked (private mode, a full disk) everything still works for this visit.

export const BADGES = [
  { id: "first", emoji: "🕯️", name: "First Light", need: 1, of: "houses", hint: "Add your first house" },
  { id: "scout", emoji: "🔦", name: "Light Scout", need: 5, of: "houses", hint: "Add 5 houses" },
  { id: "tinsel", emoji: "🎄", name: "Tinsel Tracker", need: 10, of: "houses", hint: "Add 10 houses" },
  { id: "star", emoji: "⭐", name: "North Star", need: 25, of: "houses", hint: "Add 25 houses" },
  { id: "lamp", emoji: "💡", name: "Lamplighter", need: 5, of: "lit", hint: "Tap Lit Tonight on 5 houses" },
  { id: "spotter", emoji: "🤩", name: "Showstopper Spotter", need: 3, of: "wows", hint: "Say 3 houses are Worth the Drive" },
  { id: "owl", emoji: "🦉", name: "Night Owl", need: 3, of: "nights", hint: "Go spotting on 3 different nights" },
  { id: "twelve", emoji: "🎁", name: "Twelve Nights of Lights", need: 12, of: "nights", hint: "Go spotting on 12 different nights" },
];

export const SCOUT_EVENT = "hh:scout";

// Same rule as the server (lib/pins.js): a season runs until January 15, New York time.
export function seasonNow(ms = Date.now()) {
  try {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "numeric", day: "numeric" })
        .formatToParts(new Date(ms))
        .map((x) => [x.type, Number(x.value)])
    );
    return p.month === 1 && p.day < 15 ? p.year - 1 : p.year;
  } catch {
    const d = new Date(ms);
    return d.getMonth() === 0 && d.getDate() < 15 ? d.getFullYear() - 1 : d.getFullYear();
  }
}

const key = () => `hh:scout:${seasonNow()}`;
const blank = () => ({ h: {}, l: [], w: [], d: [], seen: [] });
let memory = null; // used when localStorage is unavailable

export function loadScout() {
  try {
    const raw = JSON.parse(localStorage.getItem(key()) || "null");
    if (raw && typeof raw === "object") {
      return {
        h: raw.h && typeof raw.h === "object" ? raw.h : {},
        l: Array.isArray(raw.l) ? raw.l : [],
        w: Array.isArray(raw.w) ? raw.w : [],
        d: Array.isArray(raw.d) ? raw.d : [],
        seen: Array.isArray(raw.seen) ? raw.seen : [],
      };
    }
  } catch {}
  return memory ? structuredClone(memory) : blank();
}

function save(s) {
  memory = structuredClone(s);
  try {
    localStorage.setItem(key(), JSON.stringify(s));
  } catch {}
}

export function statsOf(s) {
  return {
    houses: Object.keys(s.h).length,
    lit: s.l.length,
    wows: s.w.length,
    nights: s.d.length,
  };
}

export function progress(s) {
  const stats = statsOf(s);
  return BADGES.map((b) => ({ ...b, have: Math.min(stats[b.of], b.need), earned: stats[b.of] >= b.need }));
}

function today() {
  const d = new Date();
  // Count anything before 5 AM as the night before, so a late drive is still one night.
  if (d.getHours() < 5) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Applies a change, saves it, and tells the badge UI which badges were just earned.
function update(change, { spotted = true } = {}) {
  if (typeof window === "undefined") return;
  const s = loadScout();
  change(s);
  if (spotted) {
    const night = today();
    if (!s.d.includes(night)) s.d.push(night);
  }
  const fresh = progress(s).filter((b) => b.earned && !s.seen.includes(b.id));
  for (const b of fresh) s.seen.push(b.id);
  save(s);
  try {
    window.dispatchEvent(new CustomEvent(SCOUT_EVENT, { detail: { earned: fresh } }));
  } catch {}
}

const addOnce = (list, id) => {
  if (id && !list.includes(id)) list.push(id);
};

// Call these only after the server confirms the save.
export function scoutAdded(pinId) {
  if (!pinId) return;
  update((s) => {
    s.h[pinId] = (s.h[pinId] || 0) + 1;
  });
}

export function scoutUndone(pinId) {
  if (!pinId) return;
  update(
    (s) => {
      if (!s.h[pinId]) return;
      if (s.h[pinId] > 1) s.h[pinId] -= 1;
      else {
        delete s.h[pinId];
        s.w = s.w.filter((id) => id !== pinId); // the server takes back your 🤩 with the pin
      }
    },
    { spotted: false }
  );
}

// Moving a pin can merge it into another house or give it a new id.
export function scoutMoved(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  update(
    (s) => {
      if (!s.h[fromId]) return;
      if (s.h[fromId] > 1) s.h[fromId] -= 1;
      else delete s.h[fromId];
      s.h[toId] = (s.h[toId] || 0) + 1;
    },
    { spotted: false }
  );
}

export function scoutLit(pinId) {
  update((s) => addOnce(s.l, pinId));
}

export function scoutWow(pinId) {
  update((s) => addOnce(s.w, pinId));
}

// The 🤩 chip in the vibe tray is a "Worth the Drive" vote too, and can be tapped off again.
export function scoutTagged(pinId, wow) {
  if (!pinId) return;
  if (wow) return scoutWow(pinId);
  update(
    (s) => {
      s.w = s.w.filter((id) => id !== pinId);
    },
    { spotted: false }
  );
}
