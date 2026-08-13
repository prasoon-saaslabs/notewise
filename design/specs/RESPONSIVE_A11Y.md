# Responsive & motion / a11y specs

## Breakpoints

| Name | Width | Shell behavior |
|------|-------|----------------|
| Phone | &lt; 640px | Single column; nav full-width under brand; Library list→detail with Back |
| Tablet | 640–1023px | Record stacks recorder → transcript → notes; Join single column |
| Desktop | ≥ 1024px | Record side-by-side; Library master–detail; Join two-column |

## Layout rules (Record idle — no page scroll)

1. App shell = `100dvh`, `overflow: hidden`
2. Recorder = `auto` height (never clipped)
3. Transcript = remaining flex space
4. Notes = capped slice (`~24dvh` phone, flexible desktop)

## Motion

| Interaction | Motion |
|-------------|--------|
| Route / tab change | 200ms fade + 4px rise |
| List selection | 120ms background |
| Recording | Timer color to accent; wave animates; Live badge pulse (opacity only) |
| Enrollment | Soft ring pulse on mic orb |

Disable all non-essential motion when `prefers-reduced-motion: reduce`.

## Accessibility

- Focus rings: 2px accent at 40% opacity
- Touch targets ≥ 40×40
- Live transcript: `aria-live="polite"`
- Player: `aria-label` Play/Pause toggles with state
- Color is not the only speaker cue (labels + position)
- Contrast: ink on paper / surface meets WCAG AA
- Dialogs trap focus; Escape closes non-blocking dialogs (not processing)

## Design review gate

Approve:

1. [x] Tokens (`design/tokens/`)
2. [x] Component inventory
3. [x] Mockups (`design/screens/index.html`) — Desktop / Tablet / Phone toggles
4. [x] These specs

**Gate status:** Approved to proceed (implementation wave started per product greenfield plan).

Then proceed to monorepo scaffold (`apps/`, `services/`, `packages/`).

## How to view mockups

```bash
open notewise/design/screens/index.html
# or serve:
python3 -m http.server 8765 --directory notewise/design/screens
```
