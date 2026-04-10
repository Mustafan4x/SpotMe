import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomTabs } from "@/components/layout/BottomTabs";
import { ServiceWorkerRegistration } from "@/components/layout/ServiceWorkerRegistration";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";
import { AppleSplashMeta } from "@/components/layout/AppleSplashMeta";
import { PageTransition } from "@/components/layout/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpotMe",
  description: "Mobile-first fitness workout tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpotMe",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <AppleSplashMeta />
      </head>
      <body className="flex h-full flex-col">
        <OfflineIndicator />
        <main className="scroll-container safe-top flex-1 pb-20">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
        <BottomTabs />
        <InstallPrompt />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
