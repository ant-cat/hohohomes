// Jacksonville-area public displays with confirmed 2026 dates, researched Nov 23, 2026.
// Each spot is the street address the display's own listing gives, geocoded with the US Census
// geocoder. Downtown Fernandina Beach's lights are left out: no listing gives a spot for them.
const JACKSONVILLE_2026 = [
  {
    // jacksonvillezoo.org/zoolights: 370 Zoo Parkway. Select nights; closed Thanksgiving and Christmas.
    name: "ZOOLights at Jacksonville Zoo",
    lat: 30.40068,
    lng: -81.64455,
    when: { f: "2026-11-20", e: "2027-01-03", h: "6-10 PM, select nights" },
  },
  {
    // Visit Jacksonville's Glowing Gardens listing: 1445 Millcoe Rd. Hours not posted yet.
    name: "Glowing Gardens",
    lat: 30.34603,
    lng: -81.54376,
    when: { f: "2026-11-27", e: "2027-01-03" },
  },
  {
    // deckthechairs.org and Visit Jacksonville: Seawalk Pavilion, 75 1st St N.
    name: "Deck the Chairs",
    lat: 30.28981,
    lng: -81.3897,
    when: { f: "2026-11-25", e: "2027-01-01" },
  },
  {
    // visitstaugustine.com: 22 King Street, throughout historic downtown, dusk to dawn.
    name: "Nights of Lights",
    lat: 29.89228,
    lng: -81.31331,
    when: { f: "2026-11-21", e: "2027-01-18", h: "Dusk to dawn" },
  },
  {
    // Visit Jacksonville and the 2026 Jax Beach Moms post: 1435 Blackhawk Trail East.
    name: "Blackhawk Bluff Lights",
    lat: 30.34973,
    lng: -81.4597,
    when: { f: "2026-11-27", e: "2027-01-01", h: "6-10 PM, Fri-Sat to 11" },
  },
  {
    // wizlights.com: 2026 show starts Dec 1 at 6 PM and runs 37 nights. Address from local listings.
    name: "Wizlights",
    lat: 30.11983,
    lng: -81.79068,
    when: { f: "2026-12-01", h: "From 6 PM" },
  },
];

export const SEEDS = { "jacksonville-2026": JACKSONVILLE_2026 };
