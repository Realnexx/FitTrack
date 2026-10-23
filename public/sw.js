/* Only public assets are cached. Auth responses, HTML pages and private data always use the network. */
const CACHE = 'fittrack-public-v1';
const SHELL = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fittrack-public-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
 const url = new URL(event.request.url);
 if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
 if (event.request.mode === 'navigate') { event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html'))); return; }
 if (!SHELL.includes(url.pathname) && !/^\/assets\/[^/]+-[\w-]+\.(js|css)$/.test(url.pathname)) return;
 event.respondWith(caches.open(CACHE).then(async cache => { const hit = await cache.match(event.request); if(hit) return hit; const response = await fetch(event.request); if(response.ok) await cache.put(event.request,response.clone()); return response; }));
});
