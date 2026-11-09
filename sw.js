// 서비스 워커: 네트워크 우선 + 오프라인 대비 캐시.
// 앱 파일(index.html 등)을 GitHub에 새로 올리면 다음에 앱을 열 때 자동으로 새 버전이 적용돼요.
// (일기 내용은 Firestore에 있어서 앱 코드가 바뀌어도 그대로예요.)
const CACHE = 'diary-v1';
const CORE = ['./', 'index.html', 'firebase-config.js', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const allowed =
    url.origin === location.origin ||
    url.hostname === 'www.gstatic.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com';
  if (!allowed) return; // Firestore/Auth 통신은 건드리지 않음

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
  );
});
