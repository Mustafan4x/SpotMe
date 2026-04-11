"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, PlusCircle, BarChart3, Settings } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/routines", label: "Routines", icon: Dumbbell },
  { href: "/log", label: "Log", icon: PlusCircle },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomTabs() {
  const pathname = usePathname();

  // Hide tabs on login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[50px] min-w-[48px] flex-col items-center justify-center gap-0.5 px-3 py-2 text-xs ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
