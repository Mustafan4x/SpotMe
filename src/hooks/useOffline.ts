'use client';

// ============================================================================
// SpotMe: Offline Sync Hook
// ============================================================================
// Provides online/offline status, pending sync count, and manual sync trigger.
// Auto-syncs when connectivity returns. Listens for the iOS visibility-based
// sync event dispatched by ServiceWorkerRegistration.tsx.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getOfflineQueue,
  syncOfflineData,
  clearSyncedEntries,
} from '@/lib/offline';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error';

export interface UseOfflineReturn {
  /** Whether the browser currently has network connectivity */
  isOnline: boolean;
  /** Number of sessions + sets waiting to be synced */
  pendingCount: number;
  /** Current sync state */
  syncStatus: SyncStatus;
  /** Manually trigger a sync attempt */
  syncNow: () => Promise<void>;
}

const SYNC_EVENT = 'spotme:sync-offline-workouts';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');

  const isSyncing = useRef(false);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Refresh pending count from IndexedDB ────────────────────────────────
  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await getOfflineQueue();
      const count = queue.sessions.length + queue.sets.length;
      setPendingCount(count);

      if (count > 0 && syncStatus !== 'syncing') {
        setSyncStatus('pending');
      } else if (count === 0 && syncStatus !== 'syncing') {
        setSyncStatus('synced');
      }
    } catch {
      // IndexedDB might not be available (SSR, private browsing)
    }
  }, [syncStatus]);

  // ── Sync logic ──────────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (isSyncing.current) return;
    if (!navigator.onLine) return;

    isSyncing.current = true;
    setSyncStatus('syncing');

    try {
      const result = await syncOfflineData(supabase);

      if (result.failedSessions > 0 || result.failedSets > 0) {
        // Some items failed — schedule retry if under limit
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current++;
          setSyncStatus('error');

          retryTimer.current = setTimeout(() => {
            retryTimer.current = null;
            syncNow();
          }, RETRY_DELAY_MS * retryCount.current);
        } else {
          setSyncStatus('error');
        }
      } else {
        // All synced successfully
        retryCount.current = 0;
        setSyncStatus('synced');

        // Clean up synced entries from IndexedDB
        await clearSyncedEntries();
      }

      // Refresh count to reflect current state
      const queue = await getOfflineQueue();
      const count = queue.sessions.length + queue.sets.length;
      setPendingCount(count);

      if (count === 0) {
        setSyncStatus('synced');
      }
    } catch {
      setSyncStatus('error');

      // Schedule retry
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        retryTimer.current = setTimeout(() => {
          retryTimer.current = null;
          syncNow();
        }, RETRY_DELAY_MS * retryCount.current);
      }
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // ── Online/offline event listeners ──────────────────────────────────────
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      retryCount.current = 0;
      // Auto-sync when connection returns
      syncNow();
    }

    function handleOffline() {
      setIsOnline(false);
      // Cancel any pending retry
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // ── iOS sync event listener ─────────────────────────────────────────────
  useEffect(() => {
    function handleSyncEvent() {
      syncNow();
    }

    window.addEventListener(SYNC_EVENT, handleSyncEvent);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSyncEvent);
    };
  }, [syncNow]);

  // ── Initial pending count check ─────────────────────────────────────────
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // ── Periodic pending count refresh ──────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(refreshPendingCount, 30_000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // ── Cleanup retry timer on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
      }
    };
  }, []);

  return { isOnline, pendingCount, syncStatus, syncNow };
}
