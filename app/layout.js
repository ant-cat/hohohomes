import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const title = "HoHoHomes · Find Christmas lights near you";
const description = "See which streets near you are glowing tonight, and add any lights you spot with one tap. No sign-up.";
const images = [{ url: "/api/og", width: 1200, height: 630, alt: "HoHoHomes: Christmas lights near you" }];

export const metadata = {
  metadataBase: new URL("https://hohohomes.app"),
  title,
  description,
  applicationName: "HoHoHomes",
  // Opened from the home screen it runs full screen; the header already leaves room for the status bar.
  appleWebApp: { capable: true, title: "HoHoHomes", statusBarStyle: "black-translucent" },
  openGraph: { type: "website", siteName: "HoHoHomes", title, description, images, url: "/" },
  twitter: { card: "summary_large_image", title, description, images },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1020",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
