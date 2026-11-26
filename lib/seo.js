import { unstable_cache } from "next/cache";
import { readCells, readSummary } from "./pins";
import { cellsInBounds, snapNear } from "./region";
import { isShowstopper } from "./vibes";
import { isDisplay } from "./displays";
import { meters, MIN_HOUSES } from "./area";
import { METROS, STATE_NAMES, metroLabel } from "./metros";

// Everything search engines and AI assistants read about HoHoHomes, in one place.

export const SITE_URL = "https://hohohomes.app";
export const SITE_NAME = "HoHoHomes";
export const TAGLINE = "Find Christmas lights near you";
export const SHORT_DESCRIPTION =
  "A free, crowd-sourced map of houses with Christmas lights across the United States. See which streets near you are glowing tonight, and add any lights you spot with one tap. No sign-up.";

// A city page asks to be indexed only once this many houses are on the map there, so search
// engines never see a page of nothing. Counts below MIN_HOUSES are never shown at all.
export const INDEX_MIN = 5;

// How often city pages, the sitemap and llms.txt refresh their counts (seconds).
export const REFRESH_SECONDS = 1800;

// Houses and Showstoppers within each city's radius this season. Only totals leave this
// function, and a city under MIN_HOUSES reports 0, so one home can never be singled out.
async function computeMetroCounts() {
  const { season, cells } = await readSummary();
  const total = Object.values(cells).reduce((t, c) => t + c.n, 0);
  const cellsFor = {};
  const wanted = new Set();
  for (const m of METROS) {
    const dLat = m.r / 111 + 0.01;
    const dLng = dLat / Math.cos((m.lat * Math.PI) / 180);
    const list = cellsInBounds(m.lat - dLat, m.lng - dLng, m.lat + dLat, m.lng + dLng).filter((c) => cells[c]?.n > 0);
    cellsFor[m.slug] = list;
    list.forEach((c) => wanted.add(c));
  }
  // Only cells that actually have houses near a listed city are downloaded.
  const data = wanted.size ? (await readCells([...wanted])).cells : {};
  const metros = {};
  const displays = {};
  for (const m of METROS) {
    const near = cellsFor[m.slug].flatMap((c) => data[c] || []).filter((p) => meters(m, p) <= m.r * 1000);
    if (near.length >= MIN_HOUSES) metros[m.slug] = { n: near.length, s: near.filter(isShowstopper).length };
    // Public displays are businesses and public places, confirmed by two people, so they're
    // listed by name. The link opens the map on the ~1 km area around one, never a pin.
    const named = near
      .filter(isDisplay)
      .sort((a, b) => (b.w || 0) - (a.w || 0) || (b.c || 1) - (a.c || 1) || a.d.n.localeCompare(b.d.n))
      .slice(0, 30)
      .map((p) => ({ name: p.d.n, near: snapNear(p.lat, p.lng), show: isShowstopper(p) }));
    if (named.length) displays[m.slug] = named;
  }
  return { season, total, metros, displays };
}

const cachedMetroCounts = unstable_cache(computeMetroCounts, ["hohohomes-metro-counts-v2"], {
  revalidate: REFRESH_SECONDS,
});

// Never throws: if the store can't be read, pages still render, just without counts.
export async function metroCounts() {
  try {
    return await cachedMetroCounts();
  } catch (err) {
    console.error("metro counts failed", err);
    return { season: null, total: 0, metros: {}, displays: {}, failed: true };
  }
}

export const isIndexable = (counts, slug) => (counts.metros[slug]?.n || 0) >= INDEX_MIN;

// A city page asks search engines to skip it only when the counts were read and the city is
// still under INDEX_MIN. If the store couldn't be read, the page says nothing about indexing:
// a 30-minute store hiccup must never tell Google to drop every city page while the sitemap
// (refreshed on its own clock) still lists them.
export const shouldNoindex = (counts, slug) => !counts.failed && !isIndexable(counts, slug);

// A link that opens the map over a city, at city zoom. Snapped to the same ~1 km grid as Share.
export function mapLink(m, zoom = 11) {
  return `/?near=${snapNear(m.lat, m.lng)}&z=${zoom}`;
}

export const cityUrl = (m) => `/lights/${m.slug}`;

export function stateName(code) {
  return STATE_NAMES[code] || code;
}

// The closest other listed cities, for "nearby" links.
export function nearbyMetros(m, n = 5) {
  return METROS.filter((o) => o.slug !== m.slug)
    .map((o) => ({ o, d: meters(m, o) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map(({ o }) => o);
}

export function countLine(c, where) {
  if (!c || !c.n) return null;
  const stars = c.s ? `, including ${c.s} ${c.s === 1 ? "Showstopper" : "Showstoppers"} people say are worth the drive` : "";
  return `${c.n} houses with Christmas lights are on the map ${where} this season${stars}.`;
}

// Structured data -----------------------------------------------------------

export const creator = { "@type": "Organization", name: "Ant.Cat", url: "https://ant.cat" };

export function webAppJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SHORT_DESCRIPTION,
        inLanguage: "en-US",
        publisher: creator,
      },
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        url: SITE_URL,
        description: SHORT_DESCRIPTION,
        applicationCategory: "LifestyleApplication",
        applicationSubCategory: "Christmas lights map",
        operatingSystem: "Any (web browser on phone or computer)",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        areaServed: { "@type": "Country", name: "United States" },
        featureList: [
          "Map of houses with Christmas lights, added by visitors",
          "Neighborhood Hot Zones showing where lights are clustered",
          "Lit Tonight confirmations so you know which displays are on",
          "Showstoppers: displays people say are worth the drive",
          "Public displays: farms, parks, businesses and churches with light shows, marked with a gold star",
          "Add a house with one tap, no account needed",
        ],
        creator,
      },
    ],
  };
}

export function breadcrumbs(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE_URL}${path}`,
    })),
  };
}

export { METROS, metroLabel };
