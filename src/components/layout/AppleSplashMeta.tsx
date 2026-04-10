/**
 * AppleSplashMeta — renders Apple splash screen and PWA-related meta tags.
 *
 * Usage: import and place inside <head> of layout.tsx (via Next.js metadata API
 * or as a component in a custom <head>).
 *
 * Since Next.js App Router manages <head> through the metadata export, these
 * tags should be added to layout.tsx by importing this component and rendering
 * it inside the <head> or <body> (Next.js hoists <link>/<meta> to <head>).
 *
 * Example in layout.tsx:
 *   import { AppleSplashMeta } from '@/components/layout/AppleSplashMeta';
 *   // Then in the JSX, inside <html>:
 *   <head><AppleSplashMeta /></head>
 *
 * ─── Apple Splash Screen Sizes ──────────────────────────────────────────────
 * These cover all modern iPhone models. Each entry corresponds to a device
 * screen resolution at the appropriate device-pixel-ratio.
 *
 * Since we do not have generated splash images yet, we reference paths under
 * /splash/ that can be created later. The component renders the link tags
 * regardless — browsers simply ignore missing splash images gracefully.
 *
 * ─── Standalone Mode Considerations ─────────────────────────────────────────
 * When running in standalone mode (display: standalone in manifest.json):
 *  - There is no browser navigation (back/forward). The app must provide its
 *    own navigation via BottomTabs and in-app back buttons.
 *  - External links open in Safari, breaking the standalone experience. Use
 *    router.push() for internal navigation and warn before opening external URLs.
 *  - The status bar area is part of the app viewport when using
 *    apple-mobile-web-app-status-bar-style: black-translucent. The layout must
 *    account for safe area insets via env(safe-area-inset-top) etc.
 *  - On iOS, there is no beforeinstallprompt event. Install detection relies on
 *    navigator.standalone and the display-mode media query.
 *  - Sessions are scoped to the home screen app; cookies/storage are separate
 *    from Safari.
 *
 * ─── iOS Safari Rendering Considerations ────────────────────────────────────
 *  - 100vh does not account for the Safari toolbar. Use 100dvh or the
 *    env(safe-area-inset-*) variables for full-height layouts.
 *  - Overscroll/bounce can be distracting. Use overscroll-behavior: none on
 *    scroll containers if needed.
 *  - position: fixed can behave unpredictably when the virtual keyboard opens.
 *    Bottom-positioned elements (like BottomTabs) should use a wrapper that
 *    responds to visualViewport resize events.
 *  - Tap highlight can be disabled with -webkit-tap-highlight-color: transparent.
 *  - Font rendering: -webkit-font-smoothing: antialiased is recommended.
 */

// Apple splash screen definitions: [media query, image path]
const APPLE_SPLASH_SCREENS: Array<{ media: string; href: string }> = [
  // iPhone 15 Pro Max, 14 Pro Max
  {
    media:
      '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1290-2796.png',
  },
  // iPhone 15 Pro, 15, 14 Pro
  {
    media:
      '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1179-2556.png',
  },
  // iPhone 14 Plus, 13 Pro Max, 12 Pro Max
  {
    media:
      '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1284-2778.png',
  },
  // iPhone 14, 13 Pro, 13, 12 Pro, 12
  {
    media:
      '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1170-2532.png',
  },
  // iPhone 13 mini, 12 mini
  {
    media:
      '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1125-2436.png',
  },
  // iPhone 11 Pro Max, XS Max
  {
    media:
      '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1242-2688.png',
  },
  // iPhone 11, XR
  {
    media:
      '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
    href: '/splash/apple-splash-828-1792.png',
  },
  // iPhone 8 Plus, 7 Plus, 6s Plus
  {
    media:
      '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1242-2208.png',
  },
  // iPhone SE (2nd/3rd gen), 8, 7, 6s
  {
    media:
      '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
    href: '/splash/apple-splash-750-1334.png',
  },
  // iPhone 16 Pro Max
  {
    media:
      '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1320-2868.png',
  },
  // iPhone 16 Pro
  {
    media:
      '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)',
    href: '/splash/apple-splash-1206-2622.png',
  },
];

export function AppleSplashMeta() {
  return (
    <>
      {/* Apple touch icon */}
      <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />

      {/* Apple splash screens */}
      {APPLE_SPLASH_SCREENS.map(({ media, href }) => (
        <link
          key={href}
          rel="apple-touch-startup-image"
          media={media}
          href={href}
        />
      ))}
    </>
  );
}
