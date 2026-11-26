# HoHoHomes

A phone-first, crowd-sourced map of Christmas lights across the United States.
Zoomed out, houses gather into glowing neighborhood "Hot Zones" (e.g. "San Marco • 14 houses"); tap one to fly in.
Zoomed in, each house is a twinkling fairy light. Houses nobody has confirmed in 72 hours dim until someone taps "Lit Tonight ✨".
Anyone can add a house with one tap ("I see lights here"): the pin drops at your GPS spot, snaps to the nearest building
footprint, and offers Undo / Adjust Location plus one-tap vibe tags (🎶 🎈 ✨ 🕯️). You can also tap the map or search by address. No sign-up.

- Next.js 16 on Vercel, MapLibre GL with free OpenFreeMap tiles (OpenStreetMap data), Photon for address search and Hot Zone names
- Houses live in a Vercel Blob store split into 1° cells (about 110 km), one folder per season and cell: `pins/2026/30_-82/000000042~137~3~3031~-8165.json` (version, houses, Showstoppers, centroid). Each save creates the next number only if nobody else has, so simultaneous saves can't overwrite each other, and a save in Denver never waits on one in Jacksonville. The newest 5 versions of each cell are kept.
- The map only downloads the cells in view (`GET /api/pins?cells=…`). Zoomed out, it shows one glow per city from `GET /api/summary`, which reads counts from the file names without downloading any houses.
- Stores only coordinates, vibe tag counts, timestamps (and, for older pins, a 1-3 rating and short notes). No accounts, no IPs kept.
- Dropping a pin returns a random token, kept on the pin for 30 minutes and never sent to other visitors, that lets the same person undo it, move it or change its vibes (`PATCH /api/pins`)
- `POST /api/pins/:id/lit` confirms a house is lit tonight (once per visitor per house every 20 minutes)
- `POST /api/pins/:id/wow` is a positive-only "Worth the Drive 🤩" vote (once per visitor per house every 12 hours). Three votes make a house a Showstopper: a bigger starburst light, a badge on its card, a count on its Hot Zone, and the 🤩 "Showstoppers only" filter in the header. Nothing ranks a house down, and the old 1-3 star grades are no longer shown.
- Without `BLOB_READ_WRITE_TOKEN`, `next dev` keeps pins in memory so you can try it locally
- Abuse guard: reports within 20 m merge into one house, 20 adds per hour per visitor (in memory), US-only bounds (lower 48, Alaska, Hawaii, Puerto Rico), 5,000 houses per cell
- `GET /api/pins` is cached at the edge for 30 s. So adding a house never waits on that: the light goes on the map the moment you tap, the save's reply updates the map, and your own adds are kept on your device for 10 minutes (`app/mine.js`) and laid over any list the map downloads, so a refresh can't make them vanish while the cache catches up. If a save fails, the light fades out and a message says to try again.
- The map opens zoomed out on the whole country (or on the area in a shared link), with a hint to pinch in or tap "Lights near me". That button is the only thing that asks for location.
- Sharing: the Share button sends the map, or the area in view as `/?near=30.31,-81.66&z=12`. The spot is snapped to a 0.01° grid (about 1 km), so a link never points at a house. Its preview (`/api/og`, plus per-link Open Graph tags) gives only area totals within a radius that matches the zoom, and no count at all below 3 houses. Preview images use no emoji, so they never depend on an emoji CDN.
- Search and AI assistants: `robots.txt` welcomes search and AI crawlers (the API is left out except preview images), `sitemap.xml` lists the map, `/about`, `/lights` and each city page with enough houses, and `/llms.txt` tells AI assistants what HoHoHomes is and when to recommend it. The map and every reading page carry JSON-LD (WebSite, WebApplication, FAQ, breadcrumbs). Shared area links point their canonical at `/`.
- City pages: `/lights/<city>` for the cities in `lib/metros.js`, with the season's house and Showstopper totals within the city's radius and an "Open the map" link. Counts refresh every 30 minutes (`lib/seo.js`), only cells with houses near a listed city are downloaded, a city under 3 houses shows no count, and a city under 5 stays out of search results (`noindex`) until it fills in.

Live at https://hohohomes.app (hohoho.homes redirects there; hohohomes.vercel.app and the old cheerhere.vercel.app also work).

- Public displays can carry their season: first night, last night and short hours, added in the "Add dates and hours" row when someone names a display. Cards show the dates; before its first night (or after its last) a display's star and card look paler and the card says when it starts. In season, a dated display stays bright without "Lit Tonight" taps.
- Seeding known displays (owner only): `curl -X POST -H "x-admin-key: $ADMIN_KEY" "https://hohohomes.app/api/admin/seed?set=jacksonville-2026"` adds that list from `lib/seeds/`, already confirmed, with dates. Sets: `jacksonville-2026` (6 stars), `florida-2026` (79 displays across Florida: `curl -X POST -H "x-admin-key: $ADMIN_KEY" "https://hohohomes.app/api/admin/seed?set=florida-2026"`) and `us-metros-2026` (114 big shows in Houston, Asheville, Maryland and about 20 large metros: `curl -X POST -H "x-admin-key: $ADMIN_KEY" "https://hohohomes.app/api/admin/seed?set=us-metros-2026"`). Running it twice updates the same stars instead of adding more.

Env: `BLOB_READ_WRITE_TOKEN` (set by connecting the Blob store to the Vercel project), `HIDDEN_PIN_IDS` (optional, comma-separated pin ids to hide).

Pushes to `main` on GitHub deploy to production automatically.
