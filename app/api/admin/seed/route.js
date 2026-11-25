import { isAdmin, adminKeyFrom } from "../../../../lib/admin";
import { seedDisplays, inUSA } from "../../../../lib/pins";
import { checkName } from "../../../../lib/displays";
import { SEEDS } from "../../../../lib/seeds";
import { json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

// Owner only: POST /api/admin/seed?set=<name> (see lib/seeds) with the x-admin-key header puts a known
// list of public displays on the map, already confirmed. Running it again changes nothing new.
export async function POST(req) {
  if (!isAdmin(adminKeyFrom(req))) return json({ error: "Not allowed." }, 403);
  const set = new URL(req.url).searchParams.get("set") || "";
  const list = Object.hasOwn(SEEDS, set) ? SEEDS[set] : null;
  if (!list) return json({ error: `Unknown set. Try one of: ${Object.keys(SEEDS).join(", ")}` }, 400);
  for (const item of list) {
    if (checkName(item.name).name !== item.name || !inUSA(item.lat, item.lng)) {
      return json({ error: `Seed entry "${item.name}" doesn't check out.` }, 500);
    }
  }
  try {
    const { results } = await seedDisplays(list);
    return json({ ok: true, set, results });
  } catch (err) {
    if (!err.status) console.error(err);
    return json({ error: err.status ? err.message : "Could not save that, try again." }, err.status || 500);
  }
}
