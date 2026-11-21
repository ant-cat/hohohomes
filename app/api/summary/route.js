import { readSummary } from "../../../lib/pins";
import { json } from "../../../lib/http";

export const dynamic = "force-dynamic";

// Houses per cell for the zoomed-out national map. No houses, just counts and centers.
export async function GET() {
  try {
    return json(await readSummary(), 200, "public, max-age=0, s-maxage=60, stale-while-revalidate=600");
  } catch (err) {
    console.error(err);
    return json({ error: "Could not load the map right now." }, 500);
  }
}
