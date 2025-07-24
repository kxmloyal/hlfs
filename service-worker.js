const CACHE_NAME = 'force-vector-tool-v1';
const ASSETS_TO_CACHE = [
  './补土辅助.html',
  './tailwindcss.min.js',
  './font-awesome.min.css',
  './chart.umd.min.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

// 安装阶段缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// 激活阶段清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截网络请求，优先使用缓存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 缓存命中则返回缓存，否则请求网络
        return response || fetch(event.request).catch(() => {
          // 网络请求失败时返回备用页面
          if (event.request.mode === 'navigate') {
            return caches.match('./补土辅助.html');
          }
        });
      })
  );
});