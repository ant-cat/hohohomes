# HoHoHomes

A phone-first, crowd-sourced map of Christmas lights around Jacksonville, FL.
Zoomed out, houses gather into glowing neighborhood "Hot Zones" (e.g. "San Marco • 14 houses"); tap one to fly in.
Zoomed in, each house is a twinkling fairy light. Houses nobody has confirmed in 72 hours dim until someone taps "Lit Tonight ✨".
Anyone can add a house with one tap ("I see lights here"): the pin drops at your GPS spot, snaps to the nearest building
footprint, and offers Undo / Adjust Location plus one-tap vibe tags (🎶 🎈 ✨ 🕯️). You can also tap the map or search by address. No sign-up.

- Next.js 16 on Vercel, MapLibre GL with free OpenFreeMap tiles (OpenStreetMap data), Photon for address search and Hot Zone names
- Pins live in one JSON file in a Vercel Blob store (`pins.json`), written with ETag checks so simultaneous adds don't overwrite each other
- Stores only coordinates, vibe tag counts, timestamps (and, for older pins, a 1-3 rating and short notes). No accounts, no IPs kept.
- Dropping a pin returns a random token, kept on the pin for 30 minutes and never sent to other visitors, that lets the same person undo it, move it or change its vibes (`PATCH /api/pins`)
- `POST /api/pins/:id/lit` confirms a house is lit tonight (once per visitor per house every 20 minutes)
- Without `BLOB_READ_WRITE_TOKEN`, `next dev` keeps pins in memory so you can try it locally
- Abuse guard: reports within 20 m merge into one house, 20 adds per hour per visitor (in memory), Jacksonville-area bounds, 5,000-house cap
- `GET /api/pins` is cached at the edge for 30 s

Live at https://hohohomes.app (hohoho.homes redirects there; hohohomes.vercel.app and the old cheerhere.vercel.app also work).

Env: `BLOB_READ_WRITE_TOKEN` (set by connecting the Blob store to the Vercel project), `HIDDEN_PIN_IDS` (optional, comma-separated pin ids to hide).

Pushes to `main` on GitHub deploy to production automatically.
