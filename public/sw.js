// SpotMe Service Worker
// Production-grade service worker for offline-first PWA experience

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `spotme-static-${CACHE_VERSION}`;
const API_CACHE = `spotme-api-${CACHE_VERSION}`;
const ALL_CACHES = [STATIC_CACHE, API_CACHE];

// App shell — critical assets precached on install
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Patterns for cache-first strategy (static assets)
const STATIC_ASSET_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  /\/splash\//,
  /\.(?:js|css|woff2?|ttf|otf|eot)$/,
  /\.(?:png|jpg|jpeg|gif|svg|webp|ico)$/,
];

// Patterns for network-first strategy (API calls)
const API_PATTERNS = [
  /\/api\//,
  /supabase\.co/,
  /\.supabase\./,
];

// Background sync tag for offline workout submissions
const WORKOUT_SYNC_TAG = 'sync-workouts';

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        // Precache app shell assets individually — don't fail install if one asset 404s
        return Promise.allSettled(
          APP_SHELL.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`[SW] Failed to precache: ${url}`, err);
            })
          )
        );
      })
      .then(() => {
        // Skip waiting so the new SW activates immediately
        return self.skipWaiting();
      })
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // Delete old versioned caches
        return Promise.all(
          cacheNames
            .filter((name) => !ALL_CACHES.includes(name))
            .map((name) => {
              console.log(`[SW] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Claim all open clients so the new SW controls them immediately
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients that a new version is active
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: CACHE_VERSION,
            });
          });
        });
      })
  );
});

// ─── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests for caching
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and non-http(s) requests
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip external font/CDN requests — let the browser handle them directly
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.')) {
    return;
  }

  // Determine strategy based on URL pattern
  if (isApiRequest(request)) {
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
  } else {
    // Navigation and other requests: network-first with cache fallback
    event.respondWith(networkFirst(request));
  }
});

// ─── Cache Strategies ───────────────────────────────────────────────────────

/**
 * Cache-first: return cached response if available, otherwise fetch and cache.
 * Best for static assets that rarely change.
 */
function cacheFirst(request) {
  return caches.match(request).then((cachedResponse) => {
    if (cachedResponse) {
      return cachedResponse;
    }

    return fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clonedResponse = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // For navigation requests, return the cached app shell
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
  });
}

/**
 * Network-first: try network, fall back to cache.
 * Best for API calls and dynamic content.
 */
function networkFirst(request) {
  const cacheName = isApiRequest(request) ? API_CACHE : STATIC_CACHE;

  return fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        const clonedResponse = networkResponse.clone();
        caches.open(cacheName).then((cache) => {
          cache.put(request, clonedResponse);
        });
      }
      return networkResponse;
    })
    .catch(() => {
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // For navigation requests, return the cached app shell as fallback
        if (request.mode === 'navigate') {
          return caches.match('/');
        }

        return new Response(
          JSON.stringify({ error: 'Offline', message: 'No cached data available' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      });
    });
}

// ─── Pattern Matching ───────────────────────────────────────────────────────

function isStaticAsset(request) {
  return STATIC_ASSET_PATTERNS.some((pattern) => pattern.test(request.url));
}

function isApiRequest(request) {
  return API_PATTERNS.some((pattern) => pattern.test(request.url));
}

// ─── Background Sync ────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === WORKOUT_SYNC_TAG) {
    event.waitUntil(syncOfflineWorkouts());
  }
});

/**
 * Process queued offline workouts from IndexedDB.
 * This is triggered by the Background Sync API when connectivity is restored.
 * The actual IndexedDB read/write logic lives in the app's offline.ts module;
 * here we send a message to the client to trigger the sync from the app layer.
 */
function syncOfflineWorkouts() {
  return self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clients) => {
      if (clients.length > 0) {
        // Notify the first available client to perform the sync
        clients[0].postMessage({
          type: 'SYNC_OFFLINE_WORKOUTS',
        });
      }
    })
    .catch((err) => {
      console.error('[SW] Background sync failed:', err);
    });
}

// ─── Messages from Clients ──────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.source.postMessage({
        type: 'VERSION',
        version: CACHE_VERSION,
      });
      break;

    case 'CLEAR_CACHES':
      caches.keys().then((names) => {
        Promise.all(names.map((name) => caches.delete(name))).then(() => {
          event.source.postMessage({ type: 'CACHES_CLEARED' });
        });
      });
      break;

    default:
      break;
  }
});
