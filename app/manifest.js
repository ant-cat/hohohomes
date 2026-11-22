// Lets people add HoHoHomes to their home screen and open it full screen, like an app.
export default function manifest() {
  return {
    name: "HoHoHomes",
    short_name: "HoHoHomes",
    description: "Find Christmas lights near you, and add any you spot with one tap. No sign-up.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1020",
    theme_color: "#0b1020",
    categories: ["entertainment", "lifestyle", "navigation"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
