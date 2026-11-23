import { ImageResponse } from "next/og";
import { parseNear, parseZoom } from "../../../lib/region";
import { areaSummary, areaPill, nationalTotal, SHOW_COUNT_MIN, SHARE_HEADLINE, SHARE_SUBLINE } from "../../../lib/area";

export const dynamic = "force-dynamic";

// Fixed "fairy lights" scattered over the card (the same every time).
const LIGHTS = Array.from({ length: 46 }, (_, i) => ({
  x: (i * 263 + 71) % 1200,
  y: 390 + ((i * 137 + 29) % 230),
  r: 5 + ((i * 7) % 6),
  c: ["#fff1c9", "#fff1c9", "#ff6b6f", "#ffcf5c", "#6ff0a6", "#8ccfff", "#ff9bd0"][i % 7],
}));
const GLOWS = [
  { x: 260, y: 500, r: 150 },
  { x: 720, y: 470, r: 180 },
  { x: 1030, y: 540, r: 120 },
];

// A four-point golden sparkle, drawn rather than an emoji so the card never depends on an emoji CDN.
function Sparkle({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ marginLeft: 12 }}>
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="#ffd36b" />
    </svg>
  );
}

// The picture shown when someone texts a HoHoHomes link. It leads with what HoHoHomes is;
// the place (and, once there are enough, the count) sits in a small pill. No emoji.
export async function GET(req) {
  const params = new URL(req.url).searchParams;
  const near = parseNear(params.get("near"));
  let pill = "";
  try {
    if (near) {
      pill = areaPill(await areaSummary(near, parseZoom(params.get("z"))));
    } else {
      const total = await nationalTotal();
      if (total >= SHOW_COUNT_MIN) pill = `${total.toLocaleString("en-US")} homes lit across the USA`;
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          background: "linear-gradient(180deg, #0b1020 0%, #121a3a 100%)",
          color: "#f6f1e7",
          padding: "64px 72px",
        }}
      >
        {GLOWS.map((g, i) => (
          <div
            key={`g${i}`}
            style={{
              position: "absolute",
              left: g.x - g.r,
              top: g.y - g.r,
              width: g.r * 2,
              height: g.r * 2,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,214,120,0.55) 0%, rgba(255,178,63,0.18) 45%, rgba(255,178,63,0) 70%)",
            }}
          />
        ))}
        {LIGHTS.map((l, i) => (
          <div
            key={`l${i}`}
            style={{
              position: "absolute",
              left: l.x,
              top: l.y,
              width: l.r * 2,
              height: l.r * 2,
              borderRadius: "50%",
              background: l.c,
              boxShadow: `0 0 ${l.r * 3}px ${l.r}px ${l.c}`,
            }}
          />
        ))}
        <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 800, letterSpacing: -0.5 }}>
          HoHo<span style={{ color: "#ffc94d" }}>Homes</span>
          <Sparkle size={34} />
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 800,
            marginTop: 22,
            maxWidth: 1000,
            lineHeight: 1.04,
            letterSpacing: -1.5,
            textShadow: "0 2px 18px rgba(11,16,32,0.9)",
          }}
        >
          {SHARE_HEADLINE}
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "#c9cfe0", marginTop: 18, textShadow: "0 2px 12px rgba(11,16,32,0.95)" }}>
          {SHARE_SUBLINE}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
          <div
            style={{
              display: "flex",
              fontSize: 32,
              fontWeight: 600,
              color: "#ffc94d",
              padding: "10px 24px",
              borderRadius: 999,
              background: "rgba(11,16,32,0.82)",
              border: "1px solid rgba(255,201,77,0.4)",
            }}
          >
            {pill || "hohohomes.app"}
          </div>
          {pill ? (
            <div style={{ display: "flex", fontSize: 26, color: "#a9b0c6", textShadow: "0 2px 10px rgba(11,16,32,0.95)" }}>
              hohohomes.app
            </div>
          ) : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400" } }
  );
}
