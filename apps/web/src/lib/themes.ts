import { syncActivePipTheme } from "../capture/documentPip";

export type ThemeMode = "light" | "dark";

export type ThemeId =
  | "ocean-mist"
  | "carbon-blue"
  | "editorial"
  | "warm-paper"
  | "nordic"
  | "lavender-dawn"
  | "midnight-indigo"
  | "terminal"
  | "midnight-teal"
  | "obsidian-violet";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  mode: ThemeMode;
  /** Swatch: [paper, ink, accent] */
  swatch: [string, string, string];
  description: string;
};

export const DEFAULT_LIGHT_THEME_ID: ThemeId = "ocean-mist";
export const DEFAULT_DARK_THEME_ID: ThemeId = "carbon-blue";
export const FEATURED_THEME_IDS: ThemeId[] = ["ocean-mist", "carbon-blue"];
export const DEFAULT_THEME_ID: ThemeId = DEFAULT_LIGHT_THEME_ID;

export const THEME_STORAGE_KEY = "nw-theme";

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
  {
    id: "editorial",
    name: "Editorial",
    mode: "light",
    swatch: ["#faf8f5", "#0a0a0a", "#e11d48"],
    description: "Black & pink on paper",
  },
  {
    id: "warm-paper",
    name: "Warm paper",
    mode: "light",
    swatch: ["#f7f2e8", "#1a1612", "#b45309"],
    description: "Ink & amber on cream",
  },
  {
    id: "nordic",
    name: "Nordic",
    mode: "light",
    swatch: ["#f4f7fb", "#1e3a5f", "#2563eb"],
    description: "Knowledge blue, cool white",
  },
  {
    id: "lavender-dawn",
    name: "Lavender Dawn",
    mode: "light",
    swatch: ["#f8f6fc", "#1e1b2e", "#7c3aed"],
    description: "Soft violet tones for a calm, creative feel",
  },
  {
    id: "midnight-indigo",
    name: "Midnight",
    mode: "dark",
    swatch: ["#0a0a0f", "#ededf5", "#6366f1"],
    description: "Near-black & indigo",
  },
  {
    id: "terminal",
    name: "Terminal",
    mode: "dark",
    swatch: ["#0d1117", "#e6edf3", "#22c55e"],
    description: "Code dark, run green",
  },
  {
    id: "midnight-teal",
    name: "Midnight Teal",
    mode: "dark",
    swatch: ["#0c1220", "#e8f4f3", "#2dd4bf"],
    description: "Deep navy night with luminous teal glow",
  },
  {
    id: "obsidian-violet",
    name: "Obsidian Violet",
    mode: "dark",
    swatch: ["#0f0d14", "#ede9f5", "#a78bfa"],
    description: "Rich purple-black with soft violet accents",
  },
];

export const FEATURED_THEMES = THEMES.filter((t) => FEATURED_THEME_IDS.includes(t.id));
export const LIGHT_THEMES = THEMES.filter(
  (t) => t.mode === "light" && !FEATURED_THEME_IDS.includes(t.id),
);
export const DARK_THEMES = THEMES.filter(
  (t) => t.mode === "dark" && !FEATURED_THEME_IDS.includes(t.id),
);

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
    if (stored) {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
  return resolveDefaultTheme();
}

export function applyTheme(themeId: ThemeId): void {
  document.documentElement.dataset.theme = themeId;
  syncActivePipTheme();
}

export function persistTheme(themeId: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
}
