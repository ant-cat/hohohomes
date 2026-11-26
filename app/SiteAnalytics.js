"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { GoogleTagManager } from "@next/third-parties/google";

// Google Tag Manager container; Google Analytics is set up inside it.
const GTM_ID = "GTM-KJBJTGHR";

// An admin link carries the admin key in its address (?admin=…). Read once, when this module first
// runs in the browser and before any effect can tidy the address, so analytics never sees that key.
const ADMIN_LOAD = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("admin");

function dropAdmin(event) {
  const url = new URL(event.url);
  if (!url.searchParams.has("admin")) return event;
  url.searchParams.delete("admin");
  return { ...event, url: url.toString() };
}

export default function SiteAnalytics() {
  const [on, setOn] = useState(false);
  // The owner's admin page is never counted either.
  const adminPage = (usePathname() || "").startsWith("/admin");
  useEffect(() => setOn(!ADMIN_LOAD), []);
  if (!on || adminPage) return null;
  return (
    <>
      <GoogleTagManager gtmId={GTM_ID} />
      <Analytics beforeSend={dropAdmin} />
    </>
  );
}
