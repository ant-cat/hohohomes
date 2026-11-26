import { addBlockTap, undoBlockTap } from "../../../lib/pins";
import { checkBlock } from "../../../lib/blocks";
import { json, clientIp, rateLimiter, readJson, deviceKey } from "../../../lib/http";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
// A lights tour from a car can pass a lot of lit blocks, so this is roomier than adding houses.
const tapLimited = rateLimiter(40, HOUR);
const undoLimited = rateLimiter(120, HOUR);

function failure(err) {
  if (!err.status) console.error(err);
  return json({ error: err.status ? err.message : "Could not save that, try again." }, err.status || 500);
}

// Light up the block you're on: { lat, lng (your GPS), street, hundred?, line: [[lng, lat], ...] }.
// Returns the block and a short-lived token for Undo.
export async function POST(req) {
  if (tapLimited(clientIp(req))) return json({ error: "That's a lot of lights! Try again in a bit." }, 429);
  const body = await readJson(req);
  if (!body) return json({ error: "Bad request." }, 400);
  const checked = checkBlock(body);
  if (checked.error) return json({ error: checked.error }, 400);
  try {
    return json(await addBlockTap({ ...checked, key: deviceKey(req) }));
  } catch (err) {
    return failure(err);
  }
}

// Take back your own recent tap: { token }.
export async function PATCH(req) {
  if (undoLimited(clientIp(req))) return json({ error: "Slow down a little and try again." }, 429);
  const body = await readJson(req);
  if (!body || typeof body.token !== "string" || body.action !== "undo") return json({ error: "Bad request." }, 400);
  try {
    return json(await undoBlockTap(body.token));
  } catch (err) {
    return failure(err);
  }
}
