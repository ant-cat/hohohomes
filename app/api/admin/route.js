import { isAdmin, adminKeyFrom } from "../../../lib/admin";
import { json, clientIp, rateLimiter } from "../../../lib/http";

export const dynamic = "force-dynamic";

// Slows down anyone guessing keys.
const limited = rateLimiter(10, 60 * 60 * 1000);

// Lets the page check a key before turning on admin mode.
export async function POST(req) {
  if (limited(clientIp(req))) return json({ error: "Too many tries. Wait a bit." }, 429);
  return isAdmin(adminKeyFrom(req)) ? json({ ok: true }) : json({ error: "That admin key didn't work." }, 403);
}
