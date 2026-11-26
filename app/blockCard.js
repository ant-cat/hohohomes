import { blockTitle } from "../lib/blocks";

function div(cls, text) {
  const el = document.createElement("div");
  el.className = cls;
  if (text) el.textContent = text;
  return el;
}

function seen(ms) {
  if (!ms) return "";
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return "Last seen just now";
  if (m < 60) return `Last seen ${m}m ago`;
  if (m < 24 * 60) return `Last seen ${Math.round(m / 60)}h ago`;
  const d = Math.round(m / (24 * 60));
  return `Last seen ${d} day${d === 1 ? "" : "s"} ago`;
}

// The card shown when someone taps a lit block: which stretch, how many saw lights there,
// and a way to pin the exact house (which then takes over from the block).
export function blockNode(block, { onPin, onRemove }) {
  const el = div("pop pop-block");
  el.appendChild(div("pop-kind", "🎄 Lit block"));
  el.appendChild(div("pop-title block", blockTitle(block)));
  const c = block.c || 1;
  el.appendChild(div("pop-meta", `${c} ${c === 1 ? "person" : "people"} saw lights here`));
  el.appendChild(div("lit-ago", seen(block.u || block.t)));

  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "lit-btn block-pin";
  pin.textContent = "📍 Know the house? Pin it";
  pin.addEventListener("click", () => onPin(block));
  el.appendChild(pin);

  if (onRemove) {
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "rm-btn";
    rm.textContent = "Remove block";
    rm.addEventListener("click", () => {
      if (!window.confirm("Remove this lit block from the map for everyone?")) return;
      rm.disabled = true;
      rm.textContent = "Removing…";
      onRemove(block).catch(() => {
        rm.disabled = false;
        rm.textContent = "Remove block";
      });
    });
    el.appendChild(rm);
  }
  return el;
}
