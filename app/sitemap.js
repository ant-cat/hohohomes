import { SITE_URL, METROS, metroCounts, isIndexable, cityUrl } from "../lib/seo";

export const revalidate = 1800;

// The map, the plain-language pages, and every city page with enough houses to be worth a visit.
export default async function sitemap() {
  const counts = await metroCounts();
  const cities = METROS.filter((m) => isIndexable(counts, m.slug)).map((m) => ({
    url: `${SITE_URL}${cityUrl(m)}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/lights`, changeFrequency: "daily", priority: 0.6 },
    ...cities,
  ];
}
