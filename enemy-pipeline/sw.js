// Enemy Pipeline PWA service worker
const CACHE = "enemy-pipeline-pwa-v12";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./assets/7544.jpg",
  "./js/cards.js",
  "./js/relics.js",
  "./js/enemies.js",
  "./js/rewards.js",
  "./js/events.js",
  "./js/battle.js",
  "./js/map.js",
  "./js/audio.js",
  "./js/main.js",
  "./assets/room_server.jpg",
  "./assets/room_corridor.jpg",
  "./assets/room_hangar.jpg",
  "./assets/room_gate.jpg",
  "./assets/cctv_enemy_sentry.png",
  "./assets/cctv_enemy_elite.png",
  "./assets/cctv_enemy_mech.png",
  "./assets/cctv_enemy_ghost.png",
  "./assets/cctv_enemy_gatekeeper.png",
  "./assets/cctv_vessel_cover.png",
  "./assets/cctv_vessel_expose.png",
  "./assets/audio/amb_fan.wav",
  "./assets/audio/bgm_battle.wav",
  "./assets/audio/bgm_gameover.wav",
  "./assets/audio/bgm_map.wav",
  "./assets/audio/bgm_reward.wav",
  "./assets/audio/bgm_title.wav",
  "./assets/audio/se_alarm.wav",
  "./assets/audio/se_card_drag.wav",
  "./assets/audio/se_card_hover.wav",
  "./assets/audio/se_crt_on.wav",
  "./assets/audio/se_glitch.wav",
  "./assets/audio/se_heavy_glitch.wav",
  "./assets/audio/se_hit_analog.wav",
  "./assets/audio/se_machine_insert.wav",
  "./assets/audio/se_printer_type.wav",
  "./assets/audio/se_radio_noise.wav",
  "./assets/audio/se_switch.wav",
  "./assets/audio/se_zippo_click.wav"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && !url.pathname.endsWith(".mp4")) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        // Large videos: cache the full file in the background on first play
        if (url.pathname.endsWith(".mp4")) {
          event.waitUntil(
            caches.open(CACHE).then((cache) =>
              cache.match(url.pathname).then((already) => {
                if (!already) return cache.add(url.pathname);
              })
            ).catch(() => {})
          );
        }
        return res;
      }).catch(() => {
        if (req.mode === "navigate") return caches.match("./index.html");
        throw new Error("offline and not cached");
      });
    })
  );
});
