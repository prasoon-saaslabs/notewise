# Notewise

**Local-first meeting intelligence** — capture without a bot, notes with receipts, relationship memory, and AI Q&A across your library.

MIT licensed · [Privacy policy](../PRIVACY.md)

---

## Start here

| I want to… | Go to |
|------------|-------|
| **Use the app** (full guide) | **[docs/USAGE.md](docs/USAGE.md)** ← start here |
| **Run it in 5 minutes** | [Quick start](#quick-start) below |
| **Browse the product site** | `pnpm dev:website` → http://localhost:5174 |
| **Build the macOS app** | [Desktop](#desktop) below |

---

## Quick start

**Prerequisites:** macOS (recommended), Node 20+, Python 3.11+, pnpm, [PyAI API key](https://api.pyai.com)

From the repo root (`granola/`):

```bash
make setup          # Install dependencies + copy .env templates
make run            # Terminal A — AI gateway on http://127.0.0.1:3002
make web            # Terminal B — web app on http://127.0.0.1:5173
```

1. Open **http://127.0.0.1:5173** and sign in (Google or Guest).
2. Accept recording consent → pick a **mode** → click the **mic**.
3. Stop recording → read notes with timestamp receipts.

**Explore without recording:** Library → **Import 5 sample calls**.

```bash
make doctor         # Check Python, Node, API key, permissions
```

---

## What it does

| Feature | Description |
|---------|-------------|
| **Local capture** | Mic + system audio — no bot in your call |
| **Notes with receipts** | Every claim links to a transcript line; unverified claims are dropped |
| **Meeting modes** | Sales, investor, 1:1, standup — editable YAML packs |
| **Library & search** | Full-text search across all meetings on disk |
| **People AI** | Relationship graph, commitments, objections, briefs |
| **Calendar prep** | Google Calendar sync, 10-min reminders, AI prep briefs |
| **Meeting brain** | Ask questions across your library with citations |
| **Live copilot** | In-call suggestions (similarity-gated, budget-aware) |
| **Voice Q&A** | Hold Alt+Space — spoken question, spoken answer |

---

## URLs at a glance

| Surface | Port | Command |
|---------|------|---------|
| Web app | 5173 | `make web` |
| AI gateway | 3002 | `make run` |
| Marketing site | 5174 | `pnpm dev:website` |

---

## Desktop

```bash
make setup
pnpm build:desktop:dmg
# → apps/desktop/src-tauri/target/release/bundle/dmg/
```

Dev: `cd apps/desktop && pnpm tauri:dev`

Menu bar tray · bundled gateway · capture overlay · close-to-tray.

See [apps/desktop/README.md](apps/desktop/README.md) and [docs/USAGE.md](docs/USAGE.md#macos-desktop-app).

---

## Configuration

| File | Purpose |
|------|---------|
| `services/pyai-gateway/.env` | PyAI key, Google OAuth, JWT |
| `apps/web/.env` | Gateway proxy target |

Copy from `.env.example` files. Never commit secrets.

---

## Docs

- **[Complete usage guide](docs/USAGE.md)** — every page, feature, shortcut, and troubleshooting step
- [PyAI gateway](services/pyai-gateway/README.md)
- [Desktop app](apps/desktop/README.md)
- Marketing docs (in-app): http://localhost:5174/docs

---

## Screenshot

Notes with receipts — timestamp chips jump to the transcript; run-status shows cited vs blocked claims.

![Notes with receipts](docs/screenshot-receipts.svg)

---

## License

MIT — audit the code, fork it, ship it.
