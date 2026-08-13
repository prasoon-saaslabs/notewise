import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sparkles, Sun } from "lucide-react";
import {
  DARK_THEMES,
  FEATURED_THEMES,
  LIGHT_THEMES,
  type ThemeDefinition,
} from "../lib/themes";
import { useTheme } from "../theme/ThemeContext";

function ThemeSwatch({ theme }: { theme: ThemeDefinition }) {
  const [paper, ink, accent] = theme.swatch;
  return (
    <span className="relative h-8 w-[2.85rem] shrink-0" aria-hidden>
      <span
        className="absolute left-0 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--nw-border)] shadow-sm"
        style={{ background: paper }}
      />
      <span
        className="absolute left-3.5 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--nw-border)] shadow-sm"
        style={{ background: ink }}
      />
      <span
        className="absolute left-7 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--nw-border)] shadow-sm"
        style={{ background: accent }}
      />
    </span>
  );
}

function ThemeOption({
  theme,
  active,
  onSelect,
}: {
  theme: ThemeDefinition;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      title={theme.description}
      className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition ${
        active
          ? "bg-[var(--nw-accent-soft)] ring-1 ring-[rgb(var(--nw-accent-rgb)_/_0.25)]"
          : "hover:bg-[var(--nw-surface-2)]"
      }`}
    >
      <ThemeSwatch theme={theme} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--nw-ink)]">
          {theme.name}
        </span>
        <span className="mt-0.5 block truncate text-[0.65rem] text-[var(--nw-ink-4)]">
          {theme.description}
        </span>
      </span>
      {active ? (
        <Check className="h-4 w-4 shrink-0 text-[var(--nw-accent-dark)]" strokeWidth={2.5} />
      ) : null}
    </button>
  );
}

function ThemeSection({
  title,
  icon: Icon,
  themes,
  themeId,
  onSelect,
}: {
  title: string;
  icon: typeof Sun;
  themes: ThemeDefinition[];
  themeId: string;
  onSelect: (id: ThemeDefinition["id"]) => void;
}) {
  if (!themes.length) return null;
  return (
    <>
      <div className="mb-1 flex items-center gap-1.5 px-1.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <div className="mb-2 flex flex-col gap-0.5">
        {themes.map((theme) => (
          <ThemeOption
            key={theme.id}
            theme={theme}
            active={themeId === theme.id}
            onSelect={() => onSelect(theme.id)}
          />
        ))}
      </div>
    </>
  );
}

export function ThemePicker() {
  const { themeId, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: ThemeDefinition["id"]) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div className="relative z-40 shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="nw-theme-trigger grid h-9 w-9 place-items-center rounded-xl border border-[var(--nw-border)] bg-[var(--nw-glass-bg)] text-[var(--nw-ink-3)] backdrop-blur-md transition hover:border-[rgb(var(--nw-accent-rgb)_/_0.25)] hover:text-[var(--nw-accent-dark)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Change theme"
        title="Change theme"
      >
        <Palette className="h-4 w-4" strokeWidth={2} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Theme picker"
          className="nw-theme-menu absolute right-0 top-[calc(100%+6px)] z-[100] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] shadow-[var(--nw-shadow-lg)]"
        >
          <div className="border-b border-[var(--nw-border)] px-3 py-2.5">
            <p className="m-0 text-sm font-semibold text-[var(--nw-ink)]">Theme</p>
            <p className="m-0 mt-0.5 text-[0.65rem] text-[var(--nw-ink-4)]">
              Pick a look — saved on this device
            </p>
          </div>

          <div className="max-h-[min(28rem,65vh)] overflow-y-auto p-2">
            <ThemeSection
              title="Default"
              icon={Sparkles}
              themes={FEATURED_THEMES}
              themeId={themeId}
              onSelect={pick}
            />
            <ThemeSection
              title="Light"
              icon={Sun}
              themes={LIGHT_THEMES}
              themeId={themeId}
              onSelect={pick}
            />
            <ThemeSection
              title="Dark"
              icon={Moon}
              themes={DARK_THEMES}
              themeId={themeId}
              onSelect={pick}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
