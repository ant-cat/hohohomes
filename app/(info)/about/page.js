import JsonLd from "../../JsonLd";
import { SITE_URL, SHORT_DESCRIPTION, webAppJsonLd, breadcrumbs } from "../../../lib/seo";

const title = "How HoHoHomes works · A free map of Christmas lights near you";
const description =
  "HoHoHomes is a free, crowd-sourced map of houses with Christmas lights across the US. Here's how to find lights near you tonight, add a house, and what we keep private.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "/about" },
  twitter: { title, description },
};

const FAQ = [
  [
    "How do I find Christmas lights near me?",
    "Open hohohomes.app on your phone. It starts on the whole country with glowing Hot Zones where houses with lights are clustered. Pinch in, or tap Lights near me. Tap a Hot Zone to fly in, then tap any light to see that house. Tap 🤩 to see only Showstoppers.",
  ],
  [
    "Is HoHoHomes free? Do I need an account?",
    "It's free, with no account, no sign-up and nothing to install. On an iPhone or Android phone you can add it to your home screen and open it like an app.",
  ],
  [
    "How do I add a house with Christmas lights?",
    "Tap \"I see lights here\" while you're standing near it. The pin drops at your spot and snaps to the nearest house, and you can undo or adjust it for 30 minutes. You can also search an address or tap the map.",
  ],
  [
    "How do I know the lights are on tonight?",
    "Anyone passing by can tap \"Lit Tonight\" on a house. Houses nobody has confirmed in the last 72 hours dim on the map, so the brightest lights are the freshest.",
  ],
  [
    "What is a Showstopper?",
    "A house that three or more people have voted \"Worth the Drive\". Showstoppers get a bigger starburst on the map. Nothing ever ranks a house down.",
  ],
  [
    "Can I add a farm, park or business light show?",
    "Yes. After you add it, pick \"Public display\" and give it a name, like Sunny Acres Farm. Public displays get a gold star on the map and their own ⭐ filter. Homes never get a name. A display's name stays hidden until a second person confirms it, by tapping \"I see this display too\" or adding it themselves, so nobody can put a name on a neighbor's house.",
  ],
  [
    "Where does HoHoHomes work?",
    "Across the United States: the lower 48, Alaska, Hawaii and Puerto Rico. It started in Jacksonville, Florida in 2026.",
  ],
  [
    "What does HoHoHomes know about me?",
    "Nothing that identifies you. There are no accounts and no IP addresses are stored. A house is just a spot on the map with tags and timestamps. A public display also keeps a scrambled, one-way code for each person who named or confirmed it, so it can tell the second person from the first; the code can't be turned back into an address. Shared links and previews point at an area about 1 km across and never show a count under 3 houses. To see how many people visit and which features get used, the site runs Vercel Web Analytics, which uses no cookies, and Google Analytics, which does use cookies. Neither gets your exact location or anything you type.",
  ],
  [
    "When does the map reset?",
    "Each season starts fresh on January 15, so the map only shows this year's displays.",
  ],
];

export default function About() {
  const faqLd = {
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            ...webAppJsonLd()["@graph"],
            { "@type": "AboutPage", "@id": `${SITE_URL}/about`, name: title, url: `${SITE_URL}/about`, about: { "@id": `${SITE_URL}/#app` } },
            faqLd,
            breadcrumbs([
              ["HoHoHomes", "/"],
              ["How it works", "/about"],
            ]),
          ],
        }}
      />
      <h1>How HoHoHomes works</h1>
      <p className="info-lead">{SHORT_DESCRIPTION}</p>
      <a className="info-button" href="/">
        Find lights near me
      </a>

      <h2>Find lights tonight</h2>
      <ul>
        <li>The map opens on the whole country. Pinch in, or tap Lights near me. Zoomed out, houses gather into glowing neighborhood Hot Zones.</li>
        <li>Zoom in and every house is a twinkling light. Tap one for its vibe tags and when it was last seen lit.</li>
        <li>Tap 🤩 for Showstoppers only, the displays people say are worth the drive.</li>
        <li>Tap ⭐ for public displays only: farms, parks, businesses and churches putting on a show.</li>
        <li>Share the map, or the area you're looking at, with the Share button.</li>
      </ul>

      <h2>Add the lights you spot</h2>
      <ul>
        <li>Tap &quot;I see lights here&quot;. One tap, no sign-up.</li>
        <li>Tag the vibe: 🎶 Music Sync, 🎈 Inflatable Jungle, ✨ Clark Griswold, 🕯️ Classic &amp; Cozy.</li>
        <li>Passing a house that's already on the map? Tap &quot;Lit Tonight&quot; or &quot;Worth the Drive&quot;.</li>
      </ul>

      <h2>Questions</h2>
      <dl className="info-faq">
        {FAQ.map(([q, a]) => (
          <div key={q}>
            <dt>{q}</dt>
            <dd>{a}</dd>
          </div>
        ))}
      </dl>

      <h2>Looking for a city?</h2>
      <p>
        See <a href="/lights">Christmas lights by city</a>, or just <a href="/">open the map</a>.
      </p>
    </>
  );
}
