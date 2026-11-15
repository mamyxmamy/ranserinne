/* 『公道最速は白バンである。』Service Worker（v1.1）
   方針:
   - ページ本体（navigate / .html / ルート）はネットワーク優先＝更新が必ず届く。
     オフライン時のみキャッシュへフォールバックする。
   - 同一オリジンの静的素材（画像・音声・manifest等）はキャッシュファースト気味
     （あれば即返し、裏でネットワークから更新する stale-while-revalidate）。
   - 別オリジン（Firebase / Google Fonts 等）は一切触らない（素通り）。
   キャッシュ名にバージョンを含め、更新時は古いキャッシュを破棄する。 */
const CACHE_NAME = "probox-legend-v1.5.2";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return; // 別オリジンは素通り

  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") ||
                 url.pathname.endsWith(".html");
  if (isPage) {
    // ネットワーク優先（更新を届ける）。失敗時のみキャッシュ。
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        throw err;
      }
    })());
    return;
  }

  // 静的素材: キャッシュファースト気味（stale-while-revalidate）
  e.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) {
      e.waitUntil(network);
      return hit;
    }
    const res = await network;
    return res || Response.error();
  })());
});
