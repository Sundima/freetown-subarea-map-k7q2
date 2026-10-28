// Saves the page, map library and map pictures on the phone so the map opens without signal.
const SHELL = "subarea-shell-v1", TILES = "subarea-tiles-v1", MAX_TILES = 4000;
const LIB = ["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css", "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(["./", "manifest.webmanifest", "icon.svg", ...LIB])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL && k !== TILES).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const isTile = (u) => /arcgisonline\.com|basemaps\.cartocdn\.com/.test(u.hostname);
async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map((k) => cache.delete(k)));
}
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (isTile(url)) {
    e.respondWith(caches.open(TILES).then(async (cache) => {
      const hit = await cache.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok) { cache.put(req, res.clone()); trim(cache); } return res; }
      catch (err) { return Response.error(); }
    }));
  } else if (req.mode === "navigate" || url.origin === location.origin) {
    // newest page when there is signal, saved copy when there is not
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req.mode === "navigate" ? "./" : req, copy)); return res; })
      .catch(() => caches.match(req.mode === "navigate" ? "./" : req, { ignoreSearch: true })));
  } else if (LIB.includes(req.url) || /fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); return res; })));
  }
});
