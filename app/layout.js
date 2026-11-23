import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

import { SHORT_DESCRIPTION } from "../lib/seo";
import { SHARE_TITLE, SHARE_DESCRIPTION } from "../lib/area";
import SiteAnalytics from "./SiteAnalytics";

const title = "HoHoHomes · Find Christmas lights near you";
const description = SHORT_DESCRIPTION;
const images = [{ url: "/api/og", width: 1200, height: 630, alt: "HoHoHomes: Christmas lights near you" }];

export const metadata = {
  metadataBase: new URL("https://hohohomes.app"),
  title,
  description,
  applicationName: "HoHoHomes",
  creator: "Ant.Cat",
  category: "lifestyle",
  // Opened from the home screen it runs full screen; the header already leaves room for the status bar.
  appleWebApp: { capable: true, title: "HoHoHomes", statusBarStyle: "black-translucent" },
  // A shared link leads with the tagline; search results keep the plain title above.
  openGraph: { type: "website", siteName: "HoHoHomes", title: SHARE_TITLE, description: SHARE_DESCRIPTION, images, url: "/" },
  twitter: { card: "summary_large_image", title: SHARE_TITLE, description: SHARE_DESCRIPTION, images },
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
      <body>
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
