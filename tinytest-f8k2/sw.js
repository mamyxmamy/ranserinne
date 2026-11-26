/* タイニーファーミング リメイク PWA Service Worker (W6)
 *
 * 戦略:
 * - ナビゲーション（index.html）: ネットワーク優先 + キャッシュフォールバック
 *   → テスト置き場で index.html を差し替えれば次回アクセスで確実に新しい版が表示され、
 *     オフライン時はキャッシュ済みの版で起動できる。
 * - 同一オリジンの静的ファイル（manifest.json / アイコン等）: キャッシュ優先
 * - それ以外の同一オリジン GET もキャッシュ優先（対象はこのフォルダの静的配信のみ）
 * - クロスオリジン（Firebase / gstatic 等）には一切介入しない（同期を壊さない）
 *
 * 版を上げるときは CACHE_VERSION を変更すること。activate で旧キャッシュを掃除する。
 */
var CACHE_VERSION = 'tf-remake-v1';
var CACHE_NAME = 'tf-remake-' + CACHE_VERSION;

// install: アプリシェルを先読みキャッシュする（失敗しても install 自体は成功扱いにし、
// 個別ファイルの取得は fetch 時のランタイムキャッシュに委ねる）
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'])
        .catch(function () { /* 一部失敗しても SW の有効化は妨げない */ });
    }).then(function () { return self.skipWaiting(); })
  );
});

// activate: 旧バージョンのキャッシュを掃除し、開いているクライアントを即時引き継ぐ
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf('tf-remake-') === 0 && key !== CACHE_NAME) {
          return caches.delete(key);
        }
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  // GET 以外は素通し
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  // クロスオリジン（Firebase / gstatic 等）には介入しない
  if (url.origin !== self.location.origin) return;

  // ナビゲーション: ネットワーク優先 + キャッシュフォールバック
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put('./index.html', copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html').then(function (cached) {
          if (cached) return cached;
          return caches.match('./');
        });
      })
    );
    return;
  }

  // 同一オリジンの静的ファイル: キャッシュ優先（無ければ取得してキャッシュ）
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
