// Every known list of public displays the owner can load with POST /api/admin/seed?set=<name>.
import { SEEDS as JACKSONVILLE } from "./jacksonville-2026";
import { SEEDS as FLORIDA } from "./florida-2026";
import { SEEDS as US_METROS } from "./us-metros-2026";

export const SEEDS = { ...JACKSONVILLE, ...FLORIDA, ...US_METROS };
