# HoHoHomes

A phone-first, crowd-sourced map of Christmas lights around Jacksonville, FL.
Zoomed out it shows a heat map of glowing streets; zoomed in, a dot for each house.
Anyone can add a house with one tap ("I see lights here"), by tapping the map, or by address. No sign-up.

- Next.js 16 on Vercel, MapLibre GL with free OpenFreeMap tiles (OpenStreetMap data), Photon for address search
- Pins live in one JSON file in a Vercel Blob store (`pins.json`), written with ETag checks so simultaneous adds don't overwrite each other
- Stores only coordinates, a 1-3 rating, an optional 80-character note and timestamps. No accounts, no IPs kept.
- Abuse guard: reports within 20 m merge into one house, 20 adds per hour per visitor (in memory), Jacksonville-area bounds, 5,000-house cap
- `GET /api/pins` is cached at the edge for 30 s

Live at https://hohohomes.vercel.app (the old cheerhere.vercel.app address still works).

Env: `BLOB_READ_WRITE_TOKEN` (set by connecting the Blob store to the Vercel project), `HIDDEN_PIN_IDS` (optional, comma-separated pin ids to hide).
