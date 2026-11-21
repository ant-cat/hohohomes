import { json } from "../../../lib/http";

export const dynamic = "force-dynamic";

// Rough, city-level location from the visitor's IP, which Vercel adds to every request.
// Used only to pick where the map opens. Nothing is stored.
export async function GET(req) {
  const lat = Number(req.headers.get("x-vercel-ip-latitude"));
  const lng = Number(req.headers.get("x-vercel-ip-longitude"));
  const known = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  return json(known ? { lat, lng } : {}, 200, "private, no-store");
}
