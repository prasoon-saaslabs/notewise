export type ThemeId = "ocean-mist" | "carbon-blue";

export type ThemeMode = "light" | "dark";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  swatch: [string, string, string];
  description: string;
};

export const THEME_STORAGE_KEY = "nw-theme";
export const DEFAULT_LIGHT_THEME_ID: ThemeId = "ocean-mist";
export const DEFAULT_DARK_THEME_ID: ThemeId = "carbon-blue";

export const THEMES: ThemeDefinition[] = [
  {
    id: "ocean-mist",
    name: "Ocean Mist",
    mode: "light",
    swatch: ["#f0f6fb", "#0c1929", "#0284c7"],
    description: "Default light — cool sky blues with crisp cyan highlights",
  },
  {
    id: "carbon-blue",
    name: "Carbon Blue",
    mode: "dark",
    swatch: ["#0a0f18", "#e8eef8", "#60a5fa"],
    description: "Default dark — slate carbon with electric blue highlights",
  },
];

const themeIds = new Set(THEMES.map((t) => t.id));

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return Boolean(value && themeIds.has(value as ThemeId));
}

export function resolveDefaultTheme(): ThemeId {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return DEFAULT_DARK_THEME_ID;
    }
  }
  return DEFAULT_LIGHT_THEME_ID;
}

export function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(stored)) return stored;
    if (stored) localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return resolveDefaultTheme();
}

export function applyTheme(themeId: ThemeId): void {
  document.documentElement.dataset.theme = themeId;
}

export function persistTheme(themeId: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(current: ThemeId): ThemeId {
  return current === "ocean-mist" ? "carbon-blue" : "ocean-mist";
}
