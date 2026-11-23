// Analytics: Vercel Web Analytics counts visits (cookie-free); Google Tag Manager loads whatever
// tags are set up in the GTM container, such as Google Analytics.
import { track as vercelTrack } from "@vercel/analytics";
import { sendGTMEvent } from "@next/third-parties/google";

// A few actions worth counting. Never pass a location, pin id or anything typed: only short labels.
export function track(name, props) {
  try {
    vercelTrack(name, props);
  } catch {}
  try {
    sendGTMEvent({ event: name, ...props });
  } catch {}
}
