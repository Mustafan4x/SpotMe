"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Sun,
  Moon,
  LogOut,
  Weight,
  User,
  Info,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type WeightUnit = "lbs" | "kg";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [isDark, setIsDark] = useState(true);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lbs");
  const [mounted, setMounted] = useState(false);

  // Load persisted settings
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("spotme_theme");
    const storedUnit = localStorage.getItem("spotme_weight_unit") as WeightUnit | null;

    if (storedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      setIsDark(true);
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }

    if (storedUnit === "kg" || storedUnit === "lbs") {
      setWeightUnit(storedUnit);
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("spotme_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("spotme_theme", "light");
    }
  };

  const changeWeightUnit = (unit: WeightUnit) => {
    setWeightUnit(unit);
    localStorage.setItem("spotme_weight_unit", unit);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // signOut may fail if Supabase is not configured
    }
  };

  if (!mounted) return null;

  return (
    <div>
      <Header title="Settings" />
      <div className="space-y-4 px-4 py-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {isDark ? (
                <Moon className="h-4 w-4 text-primary" />
              ) : (
                <Sun className="h-4 w-4 text-primary" />
              )}
              <CardTitle>Appearance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isDark ? "Dark Mode" : "Light Mode"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isDark
                    ? "Switch to light mode"
                    : "Switch to dark mode"}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={{
                  backgroundColor: isDark
                    ? "var(--primary)"
                    : "var(--accent)",
                }}
                role="switch"
                aria-checked={isDark}
                aria-label="Toggle dark mode"
              >
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm transition-transform"
                  style={{
                    transform: isDark ? "translateX(28px)" : "translateX(4px)",
                  }}
                >
                  {isDark ? (
                    <Moon className="h-3.5 w-3.5 text-gray-700" />
                  ) : (
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                  )}
                </span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Weight Unit */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-primary" />
              <CardTitle>Weight Unit</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <button
                onClick={() => changeWeightUnit("lbs")}
                className={[
                  "flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all min-h-[44px] active:scale-95",
                  weightUnit === "lbs"
                    ? "bg-primary text-primary-foreground shadow-[0_1px_12px_rgba(99,102,241,0.25)]"
                    : "bg-accent text-accent-foreground hover:bg-accent/80",
                ].join(" ")}
              >
                Pounds (lbs)
              </button>
              <button
                onClick={() => changeWeightUnit("kg")}
                className={[
                  "flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all min-h-[44px] active:scale-95",
                  weightUnit === "kg"
                    ? "bg-primary text-primary-foreground shadow-[0_1px_12px_rgba(99,102,241,0.25)]"
                    : "bg-accent text-accent-foreground hover:bg-accent/80",
                ].join(" ")}
              >
                Kilograms (kg)
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <CardTitle>Account</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user?.email ?? "Not signed in"}
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              fullWidth
              icon={<LogOut className="h-4 w-4" />}
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <CardTitle>About</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="text-sm font-medium text-foreground">0.1.0</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Built with</p>
                <p className="text-sm font-medium text-foreground">Next.js</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
