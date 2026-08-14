"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  variant?: "nav" | "site";
};

export function ThemeToggle({ className, variant = "nav" }: ThemeToggleProps) {
  const { themeId, toggleTheme, mounted } = useTheme();
  const isDark = mounted && themeId === "carbon-blue";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "grid place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--nw-accent-rgb)_/_0.35)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--nw-paper)]",
        variant === "nav"
          ? "h-9 w-9 border border-[var(--nw-border)] bg-[var(--nw-glass-bg)] text-[var(--nw-ink-3)] backdrop-blur-md hover:border-[rgb(var(--nw-accent-rgb)_/_0.25)] hover:text-[var(--nw-accent-dark)]"
          : "h-9 w-9 rounded-lg border border-[var(--nw-border)] text-[var(--nw-ink-3)] hover:bg-[var(--nw-surface-2)] hover:text-[var(--nw-ink)]",
        className,
      )}
      aria-label={isDark ? "Switch to light mode (Ocean Mist)" : "Switch to dark mode (Carbon Blue)"}
      title={isDark ? "Switch to light mode (Ocean Mist)" : "Switch to dark mode (Carbon Blue)"}
    >
      {isDark ? <Sun className="h-4 w-4" strokeWidth={2} /> : <Moon className="h-4 w-4" strokeWidth={2} />}
    </button>
  );
}
