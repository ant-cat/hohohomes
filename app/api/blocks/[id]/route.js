import { removeBlock } from "../../../../lib/pins";
import { isAdmin, adminKeyFrom } from "../../../../lib/admin";
import { cellParam } from "../../../../lib/cellParam";
import { json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

// Owner only: remove a lit block from the map. Send the key in the x-admin-key header.
export async function DELETE(req, { params }) {
  if (!isAdmin(adminKeyFrom(req))) return json({ error: "Not allowed." }, 403);
  const { id } = await params;
  const cell = cellParam(req);
  if (!cell || typeof id !== "string" || !/^b[a-z0-9]{4,24}$/.test(id)) return json({ error: "Bad request." }, 400);
  try {
    return json(await removeBlock(cell, id));
  } catch (err) {
    if (!err.status) console.error(err);
    return json({ error: err.status ? err.message : "Could not remove that, try again." }, err.status || 500);
  }
}
