import { removePin } from "../../../../lib/pins";
import { isAdmin, adminKeyFrom } from "../../../../lib/admin";
import { json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

// Owner only: remove a house from the map. Send the key in the x-admin-key header.
export async function DELETE(req, { params }) {
  if (!isAdmin(adminKeyFrom(req))) return json({ error: "Not allowed." }, 403);
  const { id } = await params;
  if (typeof id !== "string" || !/^[a-z0-9]{4,24}$/.test(id)) return json({ error: "Bad request." }, 400);
  try {
    return json(await removePin(id));
  } catch (err) {
    if (!err.status) console.error(err);
    return json({ error: err.status ? err.message : "Could not remove that, try again." }, err.status || 500);
  }
}
