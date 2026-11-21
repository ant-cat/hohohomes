import { CELL_RE } from "./region";

// Which cell a house is in, from ?cell= on the request. Null if missing or malformed.
export function cellParam(req) {
  const cell = new URL(req.url).searchParams.get("cell") || "";
  return CELL_RE.test(cell) ? cell : null;
}
