// build-sw.mjs
import { generateSW } from 'workbox-build';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ASSET_WEB_PATH = '/view/theme/solidified/assets';
const OUT_DIR = path.resolve(
  __dirname,
  '../hz-ddev/core/extend/view/theme/solidified/assets'
);

const { count, size } = await generateSW({
  swDest: path.join(OUT_DIR, 'sw.js'),
  globDirectory: OUT_DIR,
  globPatterns: ['**/*.{js,css,woff2,png,svg,ico}'],
  // exclude the sw itself from precache
  globIgnores: ['sw.js'],

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

console.log(`[SW] ${count} files precached, ${(size / 1024).toFixed(1)} KB`);
