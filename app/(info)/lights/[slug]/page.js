import { notFound } from "next/navigation";
import JsonLd from "../../../JsonLd";
import { metroBySlug } from "../../../../lib/metros";
import {
  SITE_URL,
  METROS,
  metroCounts,
  isIndexable,
  mapLink,
  cityUrl,
  stateName,
  nearbyMetros,
  countLine,
  breadcrumbs,
  metroLabel,
} from "../../../../lib/seo";

export const revalidate = 1800;
export const dynamicParams = false;

export function generateStaticParams() {
  return METROS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }) {
  const m = metroBySlug((await params).slug);
  if (!m) return {};
  const counts = await metroCounts();
  const c = counts.metros[m.slug];
  const title = `Christmas lights in ${metroLabel(m)} · Map of houses near you · HoHoHomes`;
  const description = c
    ? `${c.n} houses with Christmas lights in and around ${m.city}${c.s ? `, ${c.s} of them Showstoppers` : ""}. See which ones are lit tonight on a free map, and add any you spot. No sign-up.`
    : `Find houses with Christmas lights in ${m.city}, ${stateName(m.state)} on a free, crowd-sourced map. See which are lit tonight, and add any you spot. No sign-up.`;
  const ogTitle = `Christmas lights in ${metroLabel(m)}`;
  const near = mapLink(m).slice(2); // "near=…&z=11"
  const images = [{ url: `/api/og?${near}`, width: 1200, height: 630, alt: ogTitle }];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: cityUrl(m) },
    // A city with only a handful of houses stays out of search results until it fills in.
    robots: isIndexable(counts, m.slug) ? undefined : { index: false, follow: true },
    openGraph: { title: ogTitle, description, url: cityUrl(m), images },
    twitter: { card: "summary_large_image", title: ogTitle, description, images },
  };
}

export default async function City({ params }) {
  const m = metroBySlug((await params).slug);
  if (!m) notFound();
  const counts = await metroCounts();
  const c = counts.metros[m.slug];
  const shows = (counts.displays || {})[m.slug] || [];
  const where = `in and around ${m.city}`;
  const nearby = nearbyMetros(m);
  const url = `${SITE_URL}${cityUrl(m)}`;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": url,
              name: `Christmas lights in ${metroLabel(m)}`,
              url,
              isPartOf: { "@id": `${SITE_URL}/#website` },
              about: {
                "@type": "City",
                name: m.city,
                containedInPlace: { "@type": "State", name: stateName(m.state) },
                geo: { "@type": "GeoCoordinates", latitude: m.lat, longitude: m.lng },
              },
              potentialAction: { "@type": "ViewAction", target: `${SITE_URL}${mapLink(m)}`, name: "Open the map" },
              ...(shows.length
                ? {
                    mainEntity: {
                      "@type": "ItemList",
                      name: `Public Christmas light displays in ${metroLabel(m)}`,
                      numberOfItems: shows.length,
                      itemListElement: shows.map((d, i) => ({
                        "@type": "ListItem",
                        position: i + 1,
                        item: {
                          "@type": "TouristAttraction",
                          name: d.name,
                          description: "Public Christmas light display",
                          containedInPlace: { "@type": "City", name: m.city },
                          url: `${SITE_URL}/?near=${d.near}&z=15`,
                        },
                      })),
                    },
                  }
                : {}),
            },
            breadcrumbs([
              ["HoHoHomes", "/"],
              ["Lights by city", "/lights"],
              [metroLabel(m), cityUrl(m)],
            ]),
          ],
        }}
      />
      <p className="info-crumbs">
        <a href="/lights">Lights by city</a> › {stateName(m.state)}
      </p>
      <h1>Christmas lights in {metroLabel(m)}</h1>
      <p className="info-lead">
        {countLine(c, where) ||
          `HoHoHomes is a free map of houses with Christmas lights, added by people who spot them. ${m.city} is just getting started this season, so be one of the first to add the lights on your street.`}
      </p>

      {c && (
        <div className="info-stat">
          <div>
            <b>{c.n}</b>
            <span>houses on the map</span>
          </div>
          {c.s > 0 && (
            <div>
              <b>{c.s}</b>
              <span>{c.s === 1 ? "Showstopper" : "Showstoppers"}</span>
            </div>
          )}
        </div>
      )}

      <a className="info-button" href={mapLink(m)}>
        Open the {m.city} lights map
      </a>

      {shows.length > 0 && (
        <>
          <h2>Public Christmas light displays in {m.city}</h2>
          <p>Farms, parks, businesses and churches putting on a show, each confirmed by two people who saw it.</p>
          <ul className="info-displays">
            {shows.map((d) => (
              <li key={`${d.name}-${d.near}`}>
                <a href={`/?near=${d.near}&z=15`}>
                  <span aria-hidden="true">⭐</span> {d.name}
                </a>
                {d.show ? <small> 🤩 Showstopper</small> : null}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2>Seeing the lights in {m.city} tonight</h2>
      <ul>
        <li>The map shows glowing Hot Zones where houses with lights are clustered. Tap one to fly in.</li>
        <li>The brightest lights were confirmed lit in the last 72 hours. Houses nobody has checked lately dim.</li>
        <li>Tap 🤩 for Showstoppers only, the displays people say are worth the drive.</li>
        <li>Tap ⭐ for public displays only: farms, parks, businesses and churches, each marked with a gold star.</li>
        <li>Most displays are on from dusk until about 10 PM. Park where it&apos;s allowed and enjoy them from the street.</li>
      </ul>

      <h2>Spotted lights in {m.city}?</h2>
      <p>
        Tap &quot;I see lights here&quot; on the map and the house lights up for everyone. No account, nothing to
        install, and only the spot on the map is kept. <a href="/about">How HoHoHomes works</a>.
      </p>

      <h2>Christmas lights nearby</h2>
      <ul className="info-cities">
        {nearby.map((o) => (
          <li key={o.slug}>
            <a href={cityUrl(o)}>{metroLabel(o)}</a>
            {counts.metros[o.slug] ? <small> {counts.metros[o.slug].n} houses</small> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
