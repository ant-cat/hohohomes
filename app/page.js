import LightsMap from "./LightsMap";
import { parseNear, parseZoom } from "../lib/region";
import { areaSummary, areaTitle } from "../lib/area";

// A shared area link (?near=30.31,-81.66) gets its own preview: totals for the area, never a house.
export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  const raw = sp.near;
  const near = parseNear(raw);
  const z = parseZoom(sp.z);
  const query = `near=${raw}${z !== 14 ? `&z=${z}` : ""}`;
  if (!near) return {};
  let title = "Christmas lights nearby";
  try {
    title = areaTitle(await areaSummary(near, z));
  } catch {}
  const description = "Open the map to see them twinkle, and add any you spot. No sign-up.";
  const images = [{ url: `/api/og?${query}`, width: 1200, height: 630, alt: title }];
  return {
    title: `${title} · HoHoHomes`,
    description,
    openGraph: { title, description, images, url: `/?${query}` },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default function Page() {
  return <LightsMap />;
}
