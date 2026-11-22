import JsonLd from "../../JsonLd";
import { SITE_URL, METROS, metroCounts, isIndexable, cityUrl, stateName, breadcrumbs } from "../../../lib/seo";

export const revalidate = 1800;

const title = "Christmas lights by city · HoHoHomes";
const description =
  "Find houses with Christmas lights in cities across the US, from Jacksonville to Seattle, on a free crowd-sourced map. No sign-up.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/lights" },
  openGraph: { title, description, url: "/lights" },
  twitter: { title, description },
};

export default async function Cities() {
  const counts = await metroCounts();
  const byState = {};
  for (const m of METROS) (byState[stateName(m.state)] ||= []).push(m);
  const states = Object.keys(byState).sort();
  const lit = METROS.filter((m) => isIndexable(counts, m.slug));
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: title,
              url: `${SITE_URL}/lights`,
              isPartOf: { "@id": `${SITE_URL}/#website` },
            },
            breadcrumbs([
              ["HoHoHomes", "/"],
              ["Lights by city", "/lights"],
            ]),
          ],
        }}
      />
      <h1>Christmas lights by city</h1>
      <p className="info-lead">
        HoHoHomes maps houses with Christmas lights all over the United States, added by people who spot them.
        {counts.total >= 3 ? ` ${counts.total} houses are on the map so far this season.` : ""} Pick a city, or{" "}
        <a href="/">open the map</a> to start where you are.
      </p>

      {lit.length > 0 && (
        <>
          <h2>Glowing now</h2>
          <ul className="info-cities">
            {lit.map((m) => (
              <li key={m.slug}>
                <a href={cityUrl(m)}>
                  {m.city}, {m.state}
                </a>{" "}
                <small>{counts.metros[m.slug].n} houses</small>
              </li>
            ))}
          </ul>
        </>
      )}

      {states.map((s) => (
        <section key={s}>
          <h2>{s}</h2>
          <ul className="info-cities">
            {byState[s].map((m) => (
              <li key={m.slug}>
                <a href={cityUrl(m)}>{m.city}</a>
                {counts.metros[m.slug] ? <small> {counts.metros[m.slug].n} houses</small> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p>Don&apos;t see your town? The map covers the whole country. Open it and look around, or add the first house.</p>
    </>
  );
}
