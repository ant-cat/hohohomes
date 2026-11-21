import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s) => createHash("sha256").update(String(s)).digest();

// True only when ADMIN_KEY is set and the given key matches it.
export function isAdmin(key) {
  const real = process.env.ADMIN_KEY;
  if (!real || typeof key !== "string" || !key) return false;
  return timingSafeEqual(digest(key), digest(real));
}

export function adminKeyFrom(req) {
  return req.headers.get("x-admin-key") || "";
}
