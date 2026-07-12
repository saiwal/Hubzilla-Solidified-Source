// build-sw.mjs
import { generateSW } from 'workbox-build';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSET_WEB_PATH = '/view/theme/solidified/assets';
const OUT_DIR = path.resolve(
  __dirname,
  '../hz-ddev/core/view/theme/solidified/assets'
);

const { count, size } = await generateSW({
  swDest: path.join(OUT_DIR, 'sw.js'),
  globDirectory: OUT_DIR,
  globPatterns: ['**/*.{js,css,woff2,png,svg,ico}'],
  // exclude the sw itself from precache
  globIgnores: ['sw.js'],

  // app-*.js/css names contain a content hash; the URL itself is the revision
  dontCacheBustURLsMatching: /app-[^/]+\.(?:js|css)$/,

  modifyURLPrefix: { '': `${ASSET_WEB_PATH}/` },

  navigateFallback: null,

  skipWaiting: true,
  clientsClaim: true,

  runtimeCaching: [
    {
      urlPattern: /\/pconfig(\?.*)?$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-config',
        networkTimeoutSeconds: 5,
        expiration: { maxAgeSeconds: 86400 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\?format=json/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-json',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 120, maxAgeSeconds: 300 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^https?:\/\/[^/]+\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'theme-api',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 120, maxAgeSeconds: 300 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /\/photo\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'hz-photos',
        expiration: { maxEntries: 500, maxAgeSeconds: 7 * 86400 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^https?:\/\/(?!hz-ddev\.ddev\.site).+\.(jpg|jpeg|png|webp|gif)/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'remote-avatars',
        expiration: { maxEntries: 200, maxAgeSeconds: 3 * 86400 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

// Workbox's generateSW() only produces precaching/runtimeCaching logic — it has
// no notion of Web Push. Append a plain push/notificationclick listener to the
// generated file rather than switching to injectManifest for this one addition.
const PUSH_SW_SNIPPET = `
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  var title = data.title || 'Hubzilla';
  var options = {
    body: data.body || '',
    icon: data.icon || undefined,
    tag: data.tag || undefined,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url === url && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
`;
fs.appendFileSync(path.join(OUT_DIR, 'sw.js'), PUSH_SW_SNIPPET);

console.log(`[SW] ${count} files precached, ${(size / 1024).toFixed(1)} KB`);
