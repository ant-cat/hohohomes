// Cities that get their own "Christmas lights in …" page at /lights/<slug>.
// Each is a center and a radius (km) wide enough to take in its suburbs. A page only asks
// search engines to index it once enough houses are on the map there (see lib/seo.js).
// To add a city, add a line: the slug is "<city>-<state>" in lowercase with hyphens.

export const METROS = [
  // Florida first: HoHoHomes started in Jacksonville.
  { slug: "jacksonville-fl", city: "Jacksonville", state: "FL", lat: 30.332, lng: -81.656, r: 40 },
  { slug: "jacksonville-beach-fl", city: "Jacksonville Beach", state: "FL", lat: 30.294, lng: -81.393, r: 12 },
  { slug: "st-augustine-fl", city: "St. Augustine", state: "FL", lat: 29.895, lng: -81.315, r: 20 },
  { slug: "orlando-fl", city: "Orlando", state: "FL", lat: 28.538, lng: -81.379, r: 40 },
  { slug: "tampa-fl", city: "Tampa", state: "FL", lat: 27.951, lng: -82.457, r: 40 },
  { slug: "miami-fl", city: "Miami", state: "FL", lat: 25.762, lng: -80.192, r: 40 },
  { slug: "gainesville-fl", city: "Gainesville", state: "FL", lat: 29.652, lng: -82.325, r: 20 },
  { slug: "tallahassee-fl", city: "Tallahassee", state: "FL", lat: 30.438, lng: -84.281, r: 20 },
  // The rest of the country, roughly by size.
  { slug: "new-york-ny", city: "New York", state: "NY", lat: 40.713, lng: -74.006, r: 40 },
  { slug: "los-angeles-ca", city: "Los Angeles", state: "CA", lat: 34.052, lng: -118.244, r: 50 },
  { slug: "chicago-il", city: "Chicago", state: "IL", lat: 41.878, lng: -87.63, r: 45 },
  { slug: "dallas-tx", city: "Dallas", state: "TX", lat: 32.777, lng: -96.797, r: 45 },
  { slug: "houston-tx", city: "Houston", state: "TX", lat: 29.76, lng: -95.37, r: 50 },
  { slug: "washington-dc", city: "Washington", state: "DC", lat: 38.907, lng: -77.037, r: 40 },
  { slug: "philadelphia-pa", city: "Philadelphia", state: "PA", lat: 39.953, lng: -75.165, r: 35 },
  { slug: "atlanta-ga", city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388, r: 45 },
  { slug: "boston-ma", city: "Boston", state: "MA", lat: 42.36, lng: -71.059, r: 35 },
  { slug: "phoenix-az", city: "Phoenix", state: "AZ", lat: 33.448, lng: -112.074, r: 45 },
  { slug: "san-francisco-ca", city: "San Francisco", state: "CA", lat: 37.775, lng: -122.419, r: 30 },
  { slug: "san-jose-ca", city: "San Jose", state: "CA", lat: 37.338, lng: -121.886, r: 25 },
  { slug: "seattle-wa", city: "Seattle", state: "WA", lat: 47.606, lng: -122.332, r: 35 },
  { slug: "detroit-mi", city: "Detroit", state: "MI", lat: 42.331, lng: -83.046, r: 40 },
  { slug: "minneapolis-mn", city: "Minneapolis", state: "MN", lat: 44.978, lng: -93.265, r: 35 },
  { slug: "san-diego-ca", city: "San Diego", state: "CA", lat: 32.716, lng: -117.161, r: 35 },
  { slug: "denver-co", city: "Denver", state: "CO", lat: 39.739, lng: -104.99, r: 35 },
  { slug: "baltimore-md", city: "Baltimore", state: "MD", lat: 39.29, lng: -76.612, r: 30 },
  { slug: "charlotte-nc", city: "Charlotte", state: "NC", lat: 35.227, lng: -80.843, r: 35 },
  { slug: "st-louis-mo", city: "St. Louis", state: "MO", lat: 38.627, lng: -90.199, r: 35 },
  { slug: "san-antonio-tx", city: "San Antonio", state: "TX", lat: 29.424, lng: -98.494, r: 35 },
  { slug: "austin-tx", city: "Austin", state: "TX", lat: 30.267, lng: -97.743, r: 35 },
  { slug: "portland-or", city: "Portland", state: "OR", lat: 45.515, lng: -122.679, r: 30 },
  { slug: "sacramento-ca", city: "Sacramento", state: "CA", lat: 38.582, lng: -121.494, r: 30 },
  { slug: "pittsburgh-pa", city: "Pittsburgh", state: "PA", lat: 40.441, lng: -79.996, r: 30 },
  { slug: "las-vegas-nv", city: "Las Vegas", state: "NV", lat: 36.17, lng: -115.14, r: 30 },
  { slug: "cincinnati-oh", city: "Cincinnati", state: "OH", lat: 39.103, lng: -84.512, r: 30 },
  { slug: "kansas-city-mo", city: "Kansas City", state: "MO", lat: 39.1, lng: -94.579, r: 35 },
  { slug: "columbus-oh", city: "Columbus", state: "OH", lat: 39.961, lng: -82.999, r: 30 },
  { slug: "indianapolis-in", city: "Indianapolis", state: "IN", lat: 39.768, lng: -86.158, r: 30 },
  { slug: "cleveland-oh", city: "Cleveland", state: "OH", lat: 41.499, lng: -81.694, r: 30 },
  { slug: "nashville-tn", city: "Nashville", state: "TN", lat: 36.163, lng: -86.781, r: 35 },
  { slug: "virginia-beach-va", city: "Virginia Beach", state: "VA", lat: 36.853, lng: -75.978, r: 30 },
  { slug: "providence-ri", city: "Providence", state: "RI", lat: 41.824, lng: -71.413, r: 25 },
  { slug: "milwaukee-wi", city: "Milwaukee", state: "WI", lat: 43.039, lng: -87.906, r: 30 },
  { slug: "raleigh-nc", city: "Raleigh", state: "NC", lat: 35.78, lng: -78.639, r: 35 },
  { slug: "oklahoma-city-ok", city: "Oklahoma City", state: "OK", lat: 35.468, lng: -97.516, r: 30 },
  { slug: "memphis-tn", city: "Memphis", state: "TN", lat: 35.149, lng: -90.049, r: 30 },
  { slug: "richmond-va", city: "Richmond", state: "VA", lat: 37.541, lng: -77.436, r: 30 },
  { slug: "louisville-ky", city: "Louisville", state: "KY", lat: 38.253, lng: -85.759, r: 30 },
  { slug: "new-orleans-la", city: "New Orleans", state: "LA", lat: 29.951, lng: -90.072, r: 30 },
  { slug: "salt-lake-city-ut", city: "Salt Lake City", state: "UT", lat: 40.761, lng: -111.891, r: 35 },
  { slug: "hartford-ct", city: "Hartford", state: "CT", lat: 41.764, lng: -72.685, r: 25 },
  { slug: "buffalo-ny", city: "Buffalo", state: "NY", lat: 42.886, lng: -78.878, r: 25 },
  { slug: "birmingham-al", city: "Birmingham", state: "AL", lat: 33.519, lng: -86.81, r: 30 },
  { slug: "charleston-sc", city: "Charleston", state: "SC", lat: 32.776, lng: -79.931, r: 25 },
  { slug: "savannah-ga", city: "Savannah", state: "GA", lat: 32.081, lng: -81.091, r: 25 },
  { slug: "albuquerque-nm", city: "Albuquerque", state: "NM", lat: 35.084, lng: -106.651, r: 25 },
  { slug: "omaha-ne", city: "Omaha", state: "NE", lat: 41.257, lng: -95.935, r: 25 },
  { slug: "boise-id", city: "Boise", state: "ID", lat: 43.615, lng: -116.202, r: 25 },
  { slug: "anchorage-ak", city: "Anchorage", state: "AK", lat: 61.218, lng: -149.9, r: 25 },
  { slug: "honolulu-hi", city: "Honolulu", state: "HI", lat: 21.307, lng: -157.858, r: 25 },
  { slug: "san-juan-pr", city: "San Juan", state: "PR", lat: 18.466, lng: -66.106, r: 25 },
];

export const STATE_NAMES = {
  AK: "Alaska", AL: "Alabama", AZ: "Arizona", CA: "California", CO: "Colorado", CT: "Connecticut",
  DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", KY: "Kentucky", LA: "Louisiana", MA: "Massachusetts", MD: "Maryland", MI: "Michigan",
  MN: "Minnesota", MO: "Missouri", NC: "North Carolina", NE: "Nebraska", NM: "New Mexico", NV: "Nevada",
  NY: "New York", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", PR: "Puerto Rico",
  RI: "Rhode Island", SC: "South Carolina", TN: "Tennessee", TX: "Texas", UT: "Utah", VA: "Virginia",
  WA: "Washington", WI: "Wisconsin",
};

export const metroBySlug = (slug) => METROS.find((m) => m.slug === slug) || null;

export const metroLabel = (m) => `${m.city}, ${m.state}`;
