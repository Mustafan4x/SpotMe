'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * InstallPrompt — detects install scenarios for iOS, Android, and desktop:
 *
 * - iOS: Shows a banner instructing the user to use Share > Add to Home Screen
 * - Android/Desktop: Intercepts the `beforeinstallprompt` event and shows a
 *   native install button that triggers the browser's built-in install flow
 *
 * Dismissal is persisted to localStorage and won't show again for 30 days.
 *
 * iOS PWA quirks handled:
 *  - No Background Sync API on iOS Safari — uses visibilitychange event
 *    as a trigger to attempt offline data sync when the app regains focus.
 *  - Standalone detection via display-mode media query and navigator.standalone.
 */

const DISMISS_KEY = 'spotme-install-prompt-dismissed';
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface DismissRecord {
  timestamp: number;
}

/** The BeforeInstallPromptEvent is not in the standard TS lib */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS-specific property
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone) {
    return true;
  }
  // Standard media query
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  return false;
}

function isDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const record: DismissRecord = JSON.parse(raw);
    // Check if dismissal has expired
    if (Date.now() - record.timestamp > DISMISS_DURATION_MS) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function persistDismiss(): void {
  try {
    const record: DismissRecord = { timestamp: Date.now() };
    localStorage.setItem(DISMISS_KEY, JSON.stringify(record));
  } catch {
    // localStorage might be full or unavailable — fail silently
  }
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [promptType, setPromptType] = useState<'ios' | 'native' | null>(null);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  // ── Android/Desktop: capture beforeinstallprompt ────────────────────────
  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    function handleBeforeInstallPrompt(e: Event) {
      // Prevent the default mini-infobar on mobile
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setPromptType('native');
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // ── iOS: show manual install instructions ───────────────────────────────
  useEffect(() => {
    // Only show iOS prompt if we haven't already captured a native prompt
    if (isIOS() && !isStandalone() && !isDismissed() && !deferredPrompt.current) {
      const timer = setTimeout(() => {
        setPromptType('ios');
        setVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // ── iOS offline sync workaround ───────────────────────────────────────────
  // iOS does not support the Background Sync API. Instead, we listen for
  // visibilitychange and post a message to trigger sync when the app
  // returns to the foreground.
  useEffect(() => {
    if (!isIOS()) return;

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_OFFLINE_WORKOUTS',
        });
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    persistDismiss();
    deferredPrompt.current = null;
  }, []);

  const handleNativeInstall = useCallback(async () => {
    if (!deferredPrompt.current) return;

    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;

    if (outcome === 'accepted') {
      setVisible(false);
    }
    // Clear the prompt regardless — it can only be used once
    deferredPrompt.current = null;
  }, []);

  if (!visible || !promptType) return null;

  return (
    <div
      role="banner"
      aria-label="Install SpotMe"
      className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-xl">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
              aria-hidden="true"
            >
              {promptType === 'ios' ? (
                <>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </>
              ) : (
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </>
              )}
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-100">
              Install SpotMe
            </p>

            {promptType === 'ios' ? (
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
                Tap the share button
                <span className="mx-1 inline-block align-middle">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-400"
                    aria-hidden="true"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </span>
                then &quot;Add to Home Screen&quot;
              </p>
            ) : (
              <div className="mt-1.5">
                <button
                  onClick={handleNativeInstall}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
                  type="button"
                >
                  Install app
                </button>
              </div>
            )}
          </div>

          <button
            onClick={dismiss}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            aria-label="Dismiss install prompt"
            type="button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
