import { SEEDS, SEED_LABELS } from "../../../lib/seeds";
import AdminLoad from "./AdminLoad";

// Owner only, and kept out of search. The page itself holds nothing private: the admin key is
// typed here and checked by the server on every call, as with the curl command.
export const metadata = {
  title: "Admin · HoHoHomes",
  robots: { index: false, follow: false },
};

export default function Admin() {
  // Only names and counts go to the browser, never the lists themselves.
  const sets = Object.entries(SEEDS).map(([name, list]) => ({
    name,
    label: SEED_LABELS[name] || name,
    count: list.length,
  }));
  return (
    <>
      <h1>Load display stars</h1>
      <p className="info-lead">Put a known list of public light displays on the map. Loading a list twice refreshes the same stars instead of adding more.</p>
      <AdminLoad sets={sets} />
    </>
  );
}
