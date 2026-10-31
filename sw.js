/*
  Офлайн-режим приложения BROLLER BRO.

  Сначала берём свежую версию из интернета, без интернета — сохранённую копию.
  После каждой публикации увеличьте номер в VERSION ("v2", "v3"…), чтобы старые копии удалились.
*/
const VERSION = "v3";
const CACHE = "broller-" + VERSION;

// Всё, что нужно сайту для работы без интернета.
const FILES = [
  "./",
  "index.html", "feeding.html", "growth.html", "calculator.html", "area.html", "diary.html",
  "css/style.css",
  "js/main.js", "js/home.js", "js/feeding.js", "js/growth.js", "js/calculator.js", "js/area.js", "js/diary.js",
  "lang/ru.js", "lang/uz.js", "lang/uz-latn.js",
  "data/breeds.js", "data/phases.js", "data/defaults.js", "data/area.js", "data/site.js",
  "img/favicon-32.png", "img/logo-128.png", "img/icon-192.png", "img/icon-512.png", "manifest.webmanifest",
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // По одному: если какой-то файл не загрузился, остальные всё равно сохранятся.
      Promise.all(FILES.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("broller-") && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  const chart = url.hostname === "cdnjs.cloudflare.com";
  if (!own && !chart) return; // Метрику и прочее не трогаем

  if (chart) {
    // Библиотека графиков с номером версии не меняется — берём из копии.
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html"))
      )
  );
});
