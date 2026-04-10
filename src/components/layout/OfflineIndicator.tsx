'use client';

// ============================================================================
// SpotMe: Offline Indicator
// ============================================================================
// A small banner that appears at the top of the viewport when the app is
// offline. Shows sync status and pending item count. Animates in/out.
// ============================================================================

import { useOffline } from '@/hooks/useOffline';

export function OfflineIndicator() {
  const { isOnline, pendingCount, syncStatus, syncNow } = useOffline();

  // Don't render anything when online and fully synced
  if (isOnline && pendingCount === 0 && syncStatus === 'synced') {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 safe-top"
    >
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-amber-900/90 px-4 py-2 text-center text-sm text-amber-100 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0"
              aria-hidden="true"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            <span>
              Offline — changes will sync when you&apos;re back online
              {pendingCount > 0 && (
                <span className="ml-1 font-medium">
                  ({pendingCount} pending)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Syncing indicator (shown when online but actively syncing) */}
      {isOnline && syncStatus === 'syncing' && (
        <div className="bg-blue-900/90 px-4 py-2 text-center text-sm text-blue-100 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 animate-spin"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
            </svg>
            <span>Syncing {pendingCount} item{pendingCount !== 1 ? 's' : ''}...</span>
          </div>
        </div>
      )}

      {/* Pending items (online but items waiting) */}
      {isOnline && syncStatus === 'pending' && pendingCount > 0 && (
        <div className="bg-zinc-800/90 px-4 py-2 text-center text-sm text-zinc-300 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2">
            <span>{pendingCount} item{pendingCount !== 1 ? 's' : ''} waiting to sync</span>
            <button
              onClick={syncNow}
              className="rounded-md bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-zinc-600"
              type="button"
            >
              Sync now
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {isOnline && syncStatus === 'error' && (
        <div className="bg-red-900/90 px-4 py-2 text-center text-sm text-red-100 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Sync failed — {pendingCount} item{pendingCount !== 1 ? 's' : ''} pending</span>
            <button
              onClick={syncNow}
              className="rounded-md bg-red-800 px-2 py-0.5 text-xs font-medium text-red-100 transition-colors hover:bg-red-700"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
