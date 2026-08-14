# Notewise

**AI meeting notes that stay on your machine.**

Notewise captures conversations without a bot joining the call, turns them into structured notes with transcript receipts, and builds memory across people and meetings — all powered by a local gateway on your Mac.

MIT licensed · [Privacy & trust](docs/USAGE.md#trust--privacy) · [Full usage guide](docs/USAGE.md)

---

## Why Notewise

- **No meeting bot** — record from your mic and system audio; nothing joins Zoom or Meet.
- **Notes you can trust** — claims link to transcript lines; unverified statements are dropped.
- **Memory that compounds** — people, commitments, and context carry forward across calls.
- **Local by default** — audio and data stay on disk; PyAI runs through your own gateway.

---

## Screenshots

### Home — quick notes and upcoming meets

![Notewise home dashboard](docs/screenshots/home.png)

### Upcoming — prep briefs before each call

![Notewise upcoming meetings](docs/screenshots/upcoming.png)

### Library — searchable meeting intelligence

![Notewise library with notes and transcript](docs/screenshots/library.png)

### People — relationship graph and network pulse

![Notewise people and relationship AI](docs/screenshots/people.png)

---

## Get started

**You need:** macOS (recommended), Node 20+, Python 3.9+, pnpm, and a [PyAI API key](https://api.pyai.com).

```bash
make setup    # once — Python venv, dependencies, .env template
make dev      # gateway + web app
```

Open **http://127.0.0.1:5173**, sign in, accept recording consent, and start a capture.

```bash
make doctor   # verify Python, Node, API key, and permissions
```

**Try without recording:** Library → **Import 5 sample calls**.

---

## What you can do

|              |                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **Capture**  | Live transcription, meeting modes (General, Sales, 1:1, Standup, Investor), optional people tags |
| **Notes**    | Executive summary, takeaways, action items — each tied to the transcript                         |
| **Library**  | Search every meeting on disk; regenerate notes in a different mode                               |
| **People**   | Relationship graph, briefs, commitments, and objections over time                                |
| **Calendar** | Google Calendar sync, prep briefs, and upcoming-call reminders                                   |
| **Ask**      | Q&A across your library with citations (Meeting brain, voice shortcut)                           |

---

## Run locally

| What           | URL                   | Command                             |
| -------------- | --------------------- | ----------------------------------- |
| Web app        | http://127.0.0.1:5173 | `make dev` or `make web`            |
| AI gateway     | http://127.0.0.1:3002 | `make run` (included in `make dev`) |
| Desktop (dev)  | native window         | `make desktop`                      |
| Marketing site | http://127.0.0.1:5174 | `make website`                      |

**Two terminals** (optional):

```bash
make run    # Terminal A — gateway
make web    # Terminal B — web UI
```

Equivalent pnpm scripts: `pnpm setup`, `pnpm dev`, `pnpm dev:gateway`, `pnpm dev:web`.

---

## Desktop app

For daily use, run the native macOS app — same gateway, menu bar tray, and system-audio capture.

```bash
make setup
make desktop      # development
make build-dmg    # release installer → apps/desktop/src-tauri/target/release/bundle/dmg/
```

Dev uses the repo gateway (`services/pyai-gateway/.venv`). The DMG bundles a portable sidecar so end users only need a PyAI key — no Python setup.

→ [Desktop README](apps/desktop/README.md)

---

## Configuration

Copy `.env.example` files and add your keys. Never commit secrets.

| File                         | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `services/pyai-gateway/.env` | PyAI key, Google OAuth, JWT                    |
| `apps/web/.env`              | Gateway proxy target                           |
| `apps/website/.env.local`    | Public DMG + GitHub URLs (marketing site only) |

Custom meeting modes live in `modes/*.yaml`. Upload PyAI packs with `make upload-packs` when you change them.

---

## Documentation

| Doc                                                                | Contents                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **[docs/USAGE.md](docs/USAGE.md)**                                 | Complete guide — every screen, shortcut, and troubleshooting step |
| [services/pyai-gateway/README.md](services/pyai-gateway/README.md) | Gateway API and pipeline                                          |
| [apps/desktop/README.md](apps/desktop/README.md)                   | Tauri app, DMG build, first launch                                |
| [apps/website/README.md](apps/website/README.md)                   | Marketing site and Vercel deploy                                  |

Product docs (when the site is running): http://localhost:5174/docs

---

## License

MIT — audit the code, fork it, ship it.
