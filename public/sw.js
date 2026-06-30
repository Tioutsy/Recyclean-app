const CACHE_NAME = "recyclean-sw-v1";
const DATES_URL  = "/collection-dates";

// ── Helpers ───────────────────────────────────────────
function localDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtLong(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

async function getCollectionDates() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const resp  = await cache.match(DATES_URL);
    if (!resp) return [];
    return await resp.json();
  } catch {
    return [];
  }
}

async function checkAndNotify() {
  const dates = await getCollectionDates();
  if (!dates.length) return;

  const today    = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayStr    = localDateStr(today);
  const tomorrowStr = localDateStr(tomorrow);

  // Don't double-fire: track last notified dates
  const cache     = await caches.open(CACHE_NAME);
  const seenResp  = await cache.match("/notified-dates");
  const seen      = seenResp ? await seenResp.json() : {};

  if (dates.includes(tomorrowStr) && seen.tomorrow !== tomorrowStr) {
    await self.registration.showNotification("♻️ Recyclean — Collection Tomorrow!", {
      body   : `Put your recycling bags out tonight. Collection is ${fmtLong(tomorrowStr)}.`,
      icon   : "/favicon.svg",
      badge  : "/favicon.svg",
      tag    : "recyclean-tomorrow",
      renotify: true,
      data   : { url: "/" },
    });
    seen.tomorrow = tomorrowStr;
  }

  if (dates.includes(todayStr) && seen.today !== todayStr) {
    await self.registration.showNotification("🚛 Recyclean — Collection Today!", {
      body   : `It's collection day! Make sure your recycling bags are at the door.`,
      icon   : "/favicon.svg",
      badge  : "/favicon.svg",
      tag    : "recyclean-today",
      renotify: true,
      data   : { url: "/" },
    });
    seen.today = todayStr;
  }

  await cache.put("/notified-dates", new Response(JSON.stringify(seen), {
    headers: { "Content-Type": "application/json" },
  }));
}

// ── Lifecycle ─────────────────────────────────────────
self.addEventListener("install", () => { self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(clients.claim()); });

// ── Periodic background sync (Chrome Android) ─────────
self.addEventListener("periodicsync", event => {
  if (event.tag === "recyclean-check") {
    event.waitUntil(checkAndNotify());
  }
});

// ── On-demand check (triggered by app via postMessage) ─
self.addEventListener("message", event => {
  if (event.data?.type === "CHECK_NOW") {
    checkAndNotify();
  }
  if (event.data?.type === "UPDATE_DATES" && Array.isArray(event.data.dates)) {
    caches.open(CACHE_NAME).then(cache =>
      cache.put(DATES_URL, new Response(JSON.stringify(event.data.dates), {
        headers: { "Content-Type": "application/json" },
      }))
    );
  }
});

// ── Server push → show notification ───────────────────
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "🌱 Recyclean", {
      body   : data.body  || "",
      icon   : "/favicon.svg",
      badge  : "/favicon.svg",
      tag    : data.tag   || "recyclean-push",
      renotify: true,
      data   : { url: data.url || "/" },
    })
  );
});

// ── Notification click → open app ─────────────────────
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow(event.notification.data?.url || "/");
    })
  );
});

