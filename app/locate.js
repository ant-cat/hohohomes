// Finding where you are, and saying plainly why it didn't work when it doesn't.

// Ask once, and if the phone is just slow, ask once more with looser settings before giving up.
export function locate(opts, onFix, onFail) {
  if (!navigator.geolocation) return onFail({ code: 0 });
  navigator.geolocation.getCurrentPosition(onFix, (err) => {
    if (err && err.code === 3) {
      navigator.geolocation.getCurrentPosition(onFix, onFail, {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 5 * 60 * 1000,
      });
    } else onFail(err || { code: 2 });
  }, opts);
}

function device() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) || "";
  // Facebook, Instagram and other apps open links in their own browser, which often can't share location.
  const inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|musical_ly|TikTok|LinkedInApp|Twitter/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const browser = /CriOS/i.test(ua) ? "Chrome" : /FxiOS/i.test(ua) ? "Firefox" : /EdgiOS/i.test(ua) ? "Edge" : "Safari";
  return { inApp, ios, android, browser };
}

function turnItOn() {
  const d = device();
  if (d.inApp) return `This app's browser can't share your location. Open hohohomes.app in ${d.ios ? "Safari" : "Chrome"} instead.`;
  if (d.ios) {
    if (d.browser === "Safari") return "On your iPhone: Settings › Privacy & Security › Location Services › Safari Websites › While Using. Then reload.";
    return `On your iPhone: Settings › ${d.browser} › Location › While Using. Then reload.`;
  }
  if (d.android) return "Tap the icon left of the web address › Permissions › Location › Allow. Then reload.";
  return "Click the icon left of the web address and allow Location. Then reload.";
}

// What went wrong, how to fix it, and what the button does: try again, reload (a new setting
// only takes after a reload), or nothing.
export function locateTrouble(err) {
  const code = err && err.code;
  if (code === 0) return { title: "This browser can't share your location", fix: "Search for a town or address instead.", action: null };
  if (code === 1) return { title: "Location is off for HoHoHomes", fix: turnItOn(), action: device().inApp ? null : "reload" };
  if (code === 3) return { title: "Finding you took too long", fix: "A window or open sky helps. Give it another go.", action: "retry" };
  return {
    title: "Couldn't find where you are",
    fix: device().ios
      ? "Check that Location Services is on in Settings › Privacy & Security, then try again."
      : "Check that location is turned on for this device, then try again.",
    action: "retry",
  };
}
