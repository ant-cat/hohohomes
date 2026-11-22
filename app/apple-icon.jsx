import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen and link-bubble icon: a glowing light on the night sky.
export default function AppleIcon() {
  const dots = [
    [34, 132, "#ff6b6f"],
    [60, 144, "#6ff0a6"],
    [90, 148, "#fff1c9"],
    [120, 144, "#8ccfff"],
    [146, 132, "#ffcf5c"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0b1020" }}>
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 22,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,214,120,0.7) 0%, rgba(255,178,63,0.2) 50%, rgba(255,178,63,0) 72%)",
          }}
        />
        <div style={{ position: "absolute", left: 66, top: 58, width: 48, height: 48, borderRadius: "50%", background: "#ffd36b", boxShadow: "0 0 30px 10px rgba(255,201,77,0.8)" }} />
        {dots.map(([x, y, c], i) => (
          <div key={i} style={{ position: "absolute", left: x - 7, top: y - 7, width: 14, height: 14, borderRadius: "50%", background: c, boxShadow: `0 0 10px 3px ${c}` }} />
        ))}
      </div>
    ),
    size
  );
}
