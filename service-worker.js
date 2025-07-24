// 缓存策略优化：区分静态资源和动态内容
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// 预缓存的静态资源列表
const STATIC_ASSETS = [
    '/',
    './补土辅助.html',
    './tailwindcss.min.js',
    './font-awesome.min.css',
    './chart.umd.min.js',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

// 安装阶段：缓存静态资源
self.addEventListener('install', (event) => {
    // 等待缓存完成后再激活
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting()) // 立即激活新的service worker
    );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim()) // 控制所有打开的页面
    );
});

//  fetch 事件：处理资源请求
self.addEventListener('fetch', (event) => {
    // 对HTML页面使用网络优先策略，同时缓存最新版本
    if (event.request.headers.get('Accept').includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // 更新缓存中的HTML
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // 网络失败时使用缓存
                    return caches.match(event.request);
                })
        );
        return;
    }

    // 对API请求使用网络优先策略
    if (event.request.url.includes('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // 只缓存成功的响应
                    if (networkResponse.ok) {
                        caches.open(DYNAMIC_CACHE).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 对静态资源使用缓存优先策略
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 同时后台更新缓存
                const fetchPromise = fetch(event.request)
                    .then(networkResponse => {
                        caches.open(STATIC_CACHE).then(cache => {
                            cache.put(event.request, networkResponse.clone());
                        });
                        return networkResponse;
                    });

                // 返回缓存的响应，同时更新缓存
                return cachedResponse || fetchPromise;
            })
    );
});