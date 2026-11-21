export function json(body, status = 200, cache = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": cache },
  });
}

export function clientIp(req) {
  return (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for") || "anon").split(",")[0].trim();
}

// Basic per-instance rate limit. Kept in memory only, never stored.
export function rateLimiter(max, windowMs) {
  const hits = new Map();
  return function limited(key) {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    }
    const h = hits.get(key);
    if (!h || h.reset < now) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return false;
    }
    h.count += 1;
    return h.count > max;
  };
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
