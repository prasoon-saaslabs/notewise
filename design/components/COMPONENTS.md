# Component inventory

Shared across web, desktop (Tauri), and mobile (RN token parity).

## Primitives

| Component | Variants | Notes |
|-----------|----------|-------|
| `Button` | primary, secondary, ghost, danger, record | Height 40 default; record is full-width teal |
| `IconButton` | ghost, secondary | 40×40 min |
| `Badge` | solid, soft, source | Source: Bot / Local / Desktop |
| `Chip` | meta, speaker | SpeakerChip: you / other / guest colors |
| `Input` | text, search, url | 40px height, focus ring accent |
| `Tabs` | underline or pill | Library uses pill; Record output uses pill |
| `Menu` | dropdown | Radix; More actions on detail |
| `Dialog` | modal | Processing, delete confirm, enrollment |
| `Toast` | info, success, error | Bottom-right desktop; top mobile |
| `EmptyState` | icon + title + desc | Flex-centered, no min-height trap |
| `Card` | default | White on paper, 1px border |
| `Player` | slim | Play/pause single icon, seek, times |
| `NoteSection` | heading + bullets | Uppercase micro-label accent |
| `ActionItem` | owner / task / due / priority | Priority badge high/med/low |
| `NavShell` | header + main | Record \| Library \| Join; health pill |
| `SidebarList` | meeting rows | Active left accent bar |

## Patterns

1. **Master–detail** — Library desktop; mobile full-screen detail + Back  
2. **One primary CTA** — Start recording / Join meeting / Enroll  
3. **More menu** — secondary actions never dump six labeled buttons  
4. **Live region** — transcript scrolls; empty states center in remaining space  

## Do / Don’t

- Do: one job per section  
- Don’t: dashboard widgets in first viewport of Record  
- Don’t: tab-capture as primary messaging  
- Do: show capture mode honestly (Local mic / Bot / Desktop)  
