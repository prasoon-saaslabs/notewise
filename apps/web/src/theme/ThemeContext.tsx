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
  applyTheme,
  persistTheme,
  readStoredTheme,
  resolveDefaultTheme,
  type ThemeDefinition,
  type ThemeId,
  THEMES,
} from "../lib/themes";

type ThemeContextValue = {
  themeId: ThemeId;
  theme: ThemeDefinition;
  setTheme: (id: ThemeId) => void;
  themes: ThemeDefinition[];
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => readStoredTheme());

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    applyTheme(id);
    persistTheme(id);
  }, []);

  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  const value = useMemo<ThemeContextValue>(() => {
    const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[0]!;
    return { themeId, theme, setTheme, themes: THEMES };
  }, [themeId, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

/** Safe read for bootstrapping before React mounts */
export function getInitialThemeId(): ThemeId {
  return readStoredTheme() ?? resolveDefaultTheme();
}
