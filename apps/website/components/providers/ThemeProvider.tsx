"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LIGHT_THEME_ID,
  applyTheme,
  persistTheme,
  readStoredTheme,
  THEMES,
  type ThemeDefinition,
  type ThemeId,
} from "@/lib/themes";

type ThemeContextValue = {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
  toggleTheme: () => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_LIGHT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeId(readStoredTheme());
    setMounted(true);
  }, []);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    applyTheme(id);
    persistTheme(id);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(themeId === "ocean-mist" ? "carbon-blue" : "ocean-mist");
  }, [setTheme, themeId]);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]!;
    return { themeId, theme, setTheme, toggleTheme, mounted };
  }, [themeId, setTheme, toggleTheme, mounted]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
