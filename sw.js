const V = 'mediatheque-v2', SHELL = ['./', 'index.html', 'manifest.webmanifest', 'seed.json', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
    const r = e.request, u = new URL(r.url); if (r.method !== 'GET') return;
    if (u.origin === location.origin || r.destination === 'image') {
        e.respondWith(caches.match(r).then(hit => {
            const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') caches.open(V).then(c => c.put(r, res.clone())); return res }).catch(() => hit);
            return hit || net
        }))
    }
});
