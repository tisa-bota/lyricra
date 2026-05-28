// ── Lyrica Service Worker ──
// キャッシュ名（バージョンを変えると古いキャッシュを自動削除）
const CACHE_NAME = 'lyrica-v1';

// オフラインでも動かすためにキャッシュするファイル
const PRECACHE_URLS = [
  './lyrica_v12.html',
  // Google Fonts（ネットワーク優先・失敗時はキャッシュ）
  'https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;700;900&family=Kaisei+Tokumin:wght@400;500;700&family=DM+Serif+Display:ital@0;1&family=Noto+Sans+JP:wght@300;400;500&display=swap',
];

// ── インストール：コアファイルをキャッシュ ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // HTMLだけ確実にキャッシュ（Fontsはネットワーク次第でOK）
      return cache.add('./lyrica_v12.html').catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// ── アクティベート：古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── フェッチ：キャッシュ優先（HTMLとフォント） ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts → ネットワーク優先、失敗時キャッシュ
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // その他（HTML本体など）→ キャッシュ優先、なければネットワーク
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // 完全オフライン時はキャッシュ済みHTMLを返す
      if (event.request.destination === 'document') {
        return caches.match('./lyrica_v12.html');
      }
    })
  );
});
