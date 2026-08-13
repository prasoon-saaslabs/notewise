# Notewise design tokens

Editorial light UI for AI meeting notes. Calm and document-first — denser than Granola, quieter than Gong/Fireflies dashboards.

## Brand

- **Name:** Notewise
- **Promise:** Capture meetings from anywhere. Clear notes. You vs others that actually works.
- **Voice:** Precise, calm, adult. No “AI magic” hype in chrome.

## Color

| Token | Hex | Use |
|-------|-----|-----|
| `paper` | `#f7f6f3` | App background |
| `surface` | `#ffffff` | Cards, panels |
| `surface2` | `#f3f2ee` | Nested wells |
| `ink` | `#0c1222` | Primary text |
| `ink3` | `#64748b` | Secondary |
| `accent` | `#0f766e` | Primary actions, You speaker |
| `accentSoft` | `#e6f4f2` | Selected rows, soft badges |
| `other` | `#4338ca` | Other speakers |
| `danger` | `#b91c1c` | Destructive |

Avoid: purple gradients, cream+terracotta, dark-mode-first, glow orbs.

## Typography

- **UI:** Geist or Inter
- **Mono:** Geist Mono (timers, timestamps)
- Scale: `xs` 12 → `display` 44 for enrollment hero only

## Spacing & radius

8px grid. Cards `radius.lg` (14). Pills `radius.full`. Touch targets ≥ 40px.

## Elevation

Prefer border + `shadow.md` once. No stacked multi-layer shadows.

## Motion

- Tab/panel fade: 200ms
- List selection: background 120ms
- Record pulse: subtle opacity only
- Respect `prefers-reduced-motion`
