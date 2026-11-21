import { voteWorthTheDrive } from "../../../../../lib/pins";
import { json, clientIp, rateLimiter } from "../../../../../lib/http";

export const dynamic = "force-dynamic";

const limited = rateLimiter(60, 60 * 60 * 1000);
// One "Worth the Drive" per visitor per house every 12 hours; repeats are a no-op.
const repeat = rateLimiter(1, 12 * 60 * 60 * 1000);

export async function POST(req, { params }) {
  const { id } = await params;
  if (typeof id !== "string" || !/^[a-z0-9]{4,24}$/.test(id)) return json({ error: "Bad request." }, 400);
  const ip = clientIp(req);
  if (limited(ip)) return json({ error: "Slow down a little and try again." }, 429);
  if (repeat(`${ip}:${id}`)) return json({ ok: true, repeat: true });
  try {
    return json(await voteWorthTheDrive(id));
  } catch (err) {
    if (!err.status) console.error(err);
    return json({ error: err.status ? err.message : "Could not save that, try again." }, err.status || 500);
  }
}
