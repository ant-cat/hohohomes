// Festive feedback: a soft bell chime, a short buzz and a "light turning on" glow.

let ctx = null;

// Call from inside a tap so iOS lets us play sound later, after GPS comes back.
export function primeAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();
  } catch {}
}

function bell(freq, at, gain, length) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at + length + 0.05);
  // A quiet overtone makes it ring like a little bell.
  const o2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  o2.type = "sine";
  o2.frequency.value = freq * 2.76;
  g2.gain.setValueAtTime(0.0001, at);
  g2.gain.exponentialRampToValueAtTime(gain * 0.25, at + 0.01);
  g2.gain.exponentialRampToValueAtTime(0.0001, at + length * 0.45);
  o2.connect(g2).connect(ctx.destination);
  o2.start(at);
  o2.stop(at + length);
}

// "big": a rising arpeggio for a new pin. Otherwise a single twinkle.
export function chime(big = true) {
  if (!ctx || ctx.state !== "running") return;
  try {
    const t = ctx.currentTime + 0.02;
    const notes = big ? [1318.5, 1661.2, 1975.5, 2637.0] : [1975.5, 2637.0];
    notes.forEach((f, i) => bell(f, t + i * 0.085, big ? 0.07 : 0.05, 1.1));
  } catch {}
}

export function haptic(ms = 30) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {}
}

// A warm glow that blooms outward from a spot on the map, like a light switching on.
export function lightUp(maplibregl, map, lngLat) {
  if (!map || !maplibregl) return;
  const el = document.createElement("div");
  el.className = "lightup";
  el.innerHTML = "<i></i><i></i><b></b>";
  const marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
  setTimeout(() => marker.remove(), 1600);
}
