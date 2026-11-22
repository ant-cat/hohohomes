import { confirmDisplay } from "../../../../../lib/pins";
import { cellParam } from "../../../../../lib/cellParam";
import { json, clientIp, rateLimiter, deviceKey } from "../../../../../lib/http";

export const dynamic = "force-dynamic";

const limited = rateLimiter(30, 60 * 60 * 1000);

// "I see this display too": a second device makes a named public display show on the map.
export async function POST(req, { params }) {
  const { id } = await params;
  const cell = cellParam(req);
  if (!cell || typeof id !== "string" || !/^[a-z0-9]{4,24}$/.test(id)) return json({ error: "Bad request." }, 400);
  if (limited(clientIp(req))) return json({ error: "Slow down a little and try again." }, 429);
  try {
    return json(await confirmDisplay(cell, id, deviceKey(req)));
  } catch (err) {
    if (!err.status) console.error(err);
    return json({ error: err.status ? err.message : "Could not save that, try again." }, err.status || 500);
  }
}
