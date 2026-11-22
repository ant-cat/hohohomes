import LightsMap from "./LightsMap";
import { parseNear, parseZoom } from "../lib/region";
import { areaSummary, areaTitle } from "../lib/area";
import { webAppJsonLd } from "../lib/seo";
import JsonLd from "./JsonLd";

// A shared area link (?near=30.31,-81.66) gets its own preview: totals for the area, never a house.
export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const raw = sp.near;
  const near = parseNear(raw);
  const z = parseZoom(sp.z);
  const query = `near=${raw}${z !== 14 ? `&z=${z}` : ""}`;
  // Every map link, shared area or not, points search engines at the one map page.
  if (!near) return { alternates: { canonical: "/" } };
  let title = "Christmas lights nearby";
  try {
    title = areaTitle(await areaSummary(near, z));
  } catch {}
  const description = "Open the map to see them twinkle, and add any you spot. No sign-up.";
  const images = [{ url: `/api/og?${query}`, width: 1200, height: 630, alt: title }];
  return {
    title: `${title} · HoHoHomes`,
    alternates: { canonical: "/" },
    description,
    openGraph: { title, description, images, url: `/?${query}` },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default function Page() {
  return (
    <>
      <JsonLd data={webAppJsonLd()} />
      <LightsMap />
      {/* For visitors and crawlers without JavaScript: what this is, and where to read more. */}
      <noscript>
        <div className="noscript">
          <h2>HoHoHomes: a map of Christmas lights near you</h2>
          <p>
            A free, crowd-sourced map of houses with Christmas lights across the United States. See which streets near
            you are glowing tonight, and add any lights you spot with one tap. No sign-up. The map needs JavaScript.
          </p>
          <p>
            <a href="/about">How HoHoHomes works</a> · <a href="/lights">Christmas lights by city</a>
          </p>
        </div>
      </noscript>
    </>
  );
}
