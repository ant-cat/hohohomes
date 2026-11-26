// Every known list of public displays the owner can load, from the admin page (/admin) or with
// POST /api/admin/seed?set=<name>.
import { SEEDS as JACKSONVILLE } from "./jacksonville-2026";
import { SEEDS as FLORIDA } from "./florida-2026";
import { SEEDS as US_METROS } from "./us-metros-2026";

export const SEEDS = { ...JACKSONVILLE, ...FLORIDA, ...US_METROS };

// Plain names for the admin page. A set without one shows its key.
export const SEED_LABELS = {
  "jacksonville-2026": "Jacksonville",
  "florida-2026": "Florida",
  "us-metros-2026": "Big US metros",
};
