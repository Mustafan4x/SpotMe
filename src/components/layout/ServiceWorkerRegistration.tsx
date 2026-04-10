'use client';

import { useEffect } from 'react';

/**
 * ServiceWorkerRegistration — registers the service worker and handles updates.
 *
 * This component should be rendered once in the app layout. It:
 *  1. Registers /sw.js on mount
 *  2. Listens for SW update messages and logs them
 *  3. Registers background sync for offline workout submissions
 *  4. On iOS (no Background Sync support), uses visibilitychange as a fallback
 *     (handled in InstallPrompt.tsx to avoid duplicate listeners)
 *
 * Usage in layout.tsx:
 *   import { ServiceWorkerRegistration } from '@/components/layout/ServiceWorkerRegistration';
 *   // Render anywhere in the body:
 *   <ServiceWorkerRegistration />
 */

const WORKOUT_SYNC_TAG = 'sync-workouts';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    // ── Register service worker ───────────────────────────────────────────
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;
        console.log('[App] Service worker registered, scope:', reg.scope);

        // Check for updates periodically (every 60 minutes)
        const interval = setInterval(() => {
          reg.update().catch(() => {
            // update() can fail if offline — that's fine
          });
        }, 60 * 60 * 1000);

        // Clean up interval on unmount
        cleanupFns.push(() => clearInterval(interval));
      })
      .catch((err) => {
        console.error('[App] Service worker registration failed:', err);
      });

    // ── Listen for messages from the service worker ───────────────────────
    function handleSWMessage(event: MessageEvent) {
      if (!event.data) return;

      switch (event.data.type) {
        case 'SW_UPDATED':
          console.log('[App] Service worker updated to version:', event.data.version);
          // The app can react to this — e.g. show a toast suggesting a refresh.
          // For now, the new SW takes over immediately via skipWaiting + claim.
          break;

        case 'SYNC_OFFLINE_WORKOUTS':
          // Dispatch a custom event that the offline sync module can listen to
          window.dispatchEvent(new CustomEvent('spotme:sync-offline-workouts'));
          break;

        default:
          break;
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage);

    const cleanupFns: Array<() => void> = [
      () => navigator.serviceWorker.removeEventListener('message', handleSWMessage),
    ];

    // ── Register background sync ──────────────────────────────────────────
    // Request sync registration when going offline then back online.
    // This is a no-op on iOS (no Background Sync support).
    function registerSync() {
      if (registration && 'sync' in registration) {
        (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
          .sync.register(WORKOUT_SYNC_TAG)
          .catch(() => {
            // Background sync not supported or permission denied — not critical
          });
      }
    }

    window.addEventListener('online', registerSync);
    cleanupFns.push(() => window.removeEventListener('online', registerSync));

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  // This component renders nothing — it's purely a side-effect component
  return null;
}
