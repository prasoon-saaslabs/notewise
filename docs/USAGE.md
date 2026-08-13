# Notewise — Complete Usage Guide

**Notewise** is a local-first meeting intelligence app. It captures calls without a bot joining, writes notes where every claim links back to the transcript, remembers people and companies over time, and lets you ask questions across your meeting history.

This guide covers everything: installation, sign-in, every screen in the app, desktop usage, calendar prep, and troubleshooting.

---

## Table of contents

1. [What you need](#what-you-need)
2. [Quick start (5 minutes)](#quick-start-5-minutes)
3. [Running the app](#running-the-app)
4. [Sign in, profile & logout](#sign-in-profile--logout)
5. [App tour — every page](#app-tour--every-page)
6. [Recording your first meeting](#recording-your-first-meeting)
7. [Meeting modes](#meeting-modes)
8. [Library & search](#library--search)
9. [People & relationship AI](#people--relationship-ai)
10. [Upcoming calls & prep](#upcoming-calls--prep)
11. [Meeting brain (Q&A)](#meeting-brain-qa)
12. [Live copilot](#live-copilot)
13. [macOS desktop app](#macos-desktop-app)
14. [Marketing website](#marketing-website)
15. [Settings & backend](#settings--backend)
16. [Google Calendar setup](#google-calendar-setup)
17. [Keyboard shortcuts](#keyboard-shortcuts)
18. [Trust & privacy](#trust--privacy)
19. [Troubleshooting](#troubleshooting)
20. [FAQ](#faq)

---

## What you need

| Requirement | Notes |
|-------------|-------|
| **macOS** (recommended) | Full system-audio capture + menu bar app |
| **Web browser** | Chrome or Safari — works on any OS for mic-only capture |
| **Node.js 20+** | For the web UI |
| **Python 3.9+** | For the local AI gateway |
| **pnpm** | Package manager (`npm install -g pnpm`) |
| **PyAI API key** | [Get one at api.pyai.com](https://api.pyai.com) — or let the gateway mint a sandbox key on first run |

> **Tip:** Run `make doctor` from the repo root to check your setup.

---

## Quick start (5 minutes)

From the repository root (`notewise/`):

```bash
make setup          # once — Python venv + pnpm install
make dev            # one terminal — gateway + web UI
```

Or two terminals:

```bash
make run            # Terminal A — AI gateway on port 3002
make web            # Terminal B — web app on port 5173
```

Then:

1. Open **http://127.0.0.1:5173** in your browser.
2. Sign in with **Google** (for calendar) or continue as **Guest**.
3. Accept the **recording consent** prompt.
4. Pick a **meeting mode** (e.g. Sales discovery).
5. Click the **mic** button, speak, then stop.
6. Read your AI notes — click any **timestamp chip** to jump to that line in the transcript.

**No live call?** Go to **Library → Import 5 sample calls**, then try asking the Meeting brain a question.

---

## Running the app

Notewise has one AI backend (`services/pyai-gateway` on port **3002**). Web and desktop dev both talk to it.

| Goal | Command | URL / result |
|------|---------|--------------|
| **Web (easiest)** | `make dev` | http://127.0.0.1:5173 |
| **Web (split)** | `make run` + `make web` | gateway :3002 · UI :5173 |
| **Desktop dev** | `make desktop` | Native window (starts gateway if needed) |
| **Marketing site** | `pnpm dev:website` | http://localhost:5174 |
| **DMG installer** | `make build-dmg` | `apps/desktop/.../bundle/dmg/` |

### Typical daily workflow

**Web only:**

```bash
make dev
```

**Desktop development:**

```bash
make desktop
```

Uses the same `services/pyai-gateway/.env` as web. No need to stage or bundle the gateway for daily dev.

### Release vs dev

| | Dev (web + desktop) | DMG (end users) |
|--|---------------------|-----------------|
| Gateway | Repo venv (`make run`) | Bundled sidecar in `.app` |
| API key | `services/pyai-gateway/.env` | Onboarding UI → Application Support |
| Python setup | `make setup` once | Not required |

### Environment files

| File | Purpose |
|------|---------|
| `services/pyai-gateway/.env` | PyAI API key, Google OAuth, JWT secret |
| `apps/web/.env` | Optional — proxy target for the gateway |

Copy from `.env.example` files. **Never commit real API keys.**

---

## Sign in, profile & logout

The app is **login-first** — you need a session before using Capture, Library, or People.

### Sign in

1. Open http://127.0.0.1:5173 — you land on the **login page**.
2. Choose one:
   - **Continue with Google** — syncs calendar for prep reminders (read-only).
   - **Enter without calendar** — guest mode; type your name and continue.

### Profile

- Click your **avatar** in the top-right header → **Profile**.
- Or open **Profile** from the sidebar.
- Your profile shows:
  - Account info (name, email, provider)
  - AI intelligence snapshot (meetings, contacts, open items)
  - Quick links to Upcoming, People, and Library
  - **Connect Google** (if you signed in as guest)
  - **Log out**

### Log out

- Header avatar menu → **Log out**, or
- Profile page → **Log out**

You return to the login screen. Your local meeting data stays on disk.

### Session persistence

Sessions are stored in your browser. Closing the tab does not sign you out unless you clear site data.

---

## App tour — every page

| Page | Path | What it does |
|------|------|--------------|
| **Capture** | `/` | Live recording, transcript, notes, copilot |
| **Upcoming** | `/upcoming` | Calendar events + prep briefs |
| **Prep** | `/upcoming/:eventId` | Pre-meeting brief (does not auto-record) |
| **Library** | `/library` | All meetings, search, import samples |
| **Meeting detail** | `/library/:id` | Notes, transcript, follow-up email |
| **People** | `/people` | Relationship graph + AI overview |
| **Person detail** | `/people/:id` | Timeline, commitments, objections |
| **Profile** | `/profile` | Account, stats, AI snapshot |
| **Trust** | `/trust` | Data flow, spend, citation gates |
| **Settings** | `/settings` | Backend, voice enrollment, API key |
| **Join** | `/join` | Join a live session (experimental) |
| **Onboarding** | `/onboarding` | Voice enrollment wizard |

### Header bar

- **Left:** “Ask your meeting brain…” search — opens the Q&A panel.
- **Right:** Your profile avatar menu (Profile, Settings, Log out).

---

## Recording your first meeting

### Before you start

1. **Consent** — first launch asks you to confirm recording laws in your region.
2. **Mode** — pick Sales discovery, Investor call, 1:1, or Standup (shapes note sections).
3. **Permissions** — grant **Microphone**. On macOS desktop, also grant **Screen Recording** for system audio.

### Start recording

1. Go to **Capture** (`/`).
2. Click the large **mic** button (or use the desktop tray **Start recording**).
3. Speak naturally. Live transcript appears as you talk.
4. Optional: type scratchpad notes in the notes area during the call.
5. Click **Stop** when finished.

### After you stop

Processing runs through these phases:

| Phase | What happens |
|-------|--------------|
| Upload | Audio sent to local gateway |
| Transcribe | PyAI Hear converts speech to text |
| Speakers | Labels assigned (You vs Others when stereo) |
| Notes | PyAI Recap generates structured notes with receipts |

### Reading notes with receipts

- Each bullet in the notes has **timestamp chips**.
- Click a chip → jumps to that exact line in the transcript.
- Claims that cannot be verified against the transcript are **blocked** (shown in the run-status card on Trust).

### Stereo vs mic-only

| Mode | Channels | Best for |
|------|----------|----------|
| **Stereo** (desktop + screen recording) | You = left, Them = right | Calls where you hear the other person through speakers |
| **Mic-only** | Single channel | Headphones, phone on speaker near mic, or denied screen recording |
| **Mixed capture** (web) | Mic with echo cancellation off | Browser-only; picks up speaker audio through mic |

---

## Meeting modes

Modes are YAML packs in the `modes/` folder. They tell the AI which sections to prioritize.

| Mode | Best for |
|------|----------|
| **Sales discovery** | Qualification, pain points, next steps |
| **Investor call** | Metrics, objections, diligence questions |
| **1:1** | Commitments, blockers, career topics |
| **Standup** | Yesterday / today / blockers |

**How to use:** Select a mode on the Capture page **before** you press record. The mode is saved on the meeting and used when notes are regenerated.

**Customize:** Edit files in `modes/` or add your own. See `modes/registry.yaml` for the list.

---

## Library & search

### Browse meetings

- **Library** lists all meetings stored in local SQLite, newest first.
- Click a row to open the full meeting view.

### Search

- Use the search box to match titles, snippets, and note content (full-text search).

### Import samples

- Click **Import 5 sample calls** to explore the app without recording.
- Great for testing People, Meeting brain, and receipt chips.

### Regenerate notes

- Open a meeting → **Regenerate** if you changed modes or want a fresh pass.
- Uses the stored transcript — no re-recording needed.

### Meeting detail view

Each meeting includes:

- **Executive summary** and structured sections (actions, objections, etc.)
- **Follow-up email draft**
- **Scratchpad** notes you typed during capture
- **Full transcript** with speaker labels

---

## People & relationship AI

Notewise builds a **relationship graph** from attendees and transcript mentions.

### People overview (`/people`)

- Network pulse — AI summary of your contacts
- Cards for each person and company
- Open commitments and unresolved objections at a glance

### Person / company page (`/people/:id`)

- **Meeting timeline** — every call involving this entity
- **Relationship brief** — AI synthesis of what they care about
- **Open items** — follow-ups and commitments
- **Quick-ask chips** — pre-built questions for this person
- Scoped Meeting brain queries

### How entities are created

- Calendar attendee emails (when Google is connected)
- Speaker names from diarization
- Names mentioned in transcripts

---

## Upcoming calls & prep

Requires **Google Calendar** (sign in with Google).

### Setup

1. Sign in with Google on the login page.
2. Grant calendar read access.
3. Events sync for the next 14 days.

### Upcoming page (`/upcoming`)

- Lists your next meetings with attendee links to People pages.
- Each event has a **Prep** button.

### Prep flow (`/upcoming/:eventId`)

> **Important:** Prep opens a **briefing page**, not capture. Recording starts only when you explicitly click Start.

1. **10 minutes before** a meeting, a reminder modal appears.
2. Click **Prep** → review AI context, follow-ups, talking points.
3. Add your own prep notes.
4. When the call starts, go to Capture or tray → **Start recording**.

### Capture page shortcut

The Capture page shows your **next upcoming meeting** with a link to the full prep experience.

---

## Meeting brain (Q&A)

Ask natural-language questions across your meeting library.

### From the header

1. Click **“Ask your meeting brain…”** in the top bar.
2. Type a question, e.g. *“What did Acme say about security?”*
3. Answers include **citations** — click to jump to source lines.

### From a People page

- Questions are scoped to that person’s history.
- Use quick-ask chips for common queries.

### Voice Q&A

- Hold **Alt + Space** (where configured).
- Speak your question → Hear transcribes → brain retrieves → Cast speaks the answer.
- Requires voice enrollment (Settings → Onboarding).

---

## Live copilot

While recording, the **live copilot** watches for patterns:

- Repeated objections
- Commitments and promises
- Open questions

Suggestions appear in the capture pane **without interrupting** your flow.

| Behavior | Detail |
|----------|--------|
| Similarity gating | Prevents duplicate/noisy suggestions |
| Per-meeting budget | Token cap keeps spend predictable |
| Optional | Ignoring copilot does not affect your transcript or final notes |

---

## macOS desktop app

Native shell: menu bar tray, floating capture overlay, close-to-tray.

### Dev mode (same gateway as web)

```bash
make setup
make desktop        # one command — gateway + Tauri window
```

Put your PyAI key in `services/pyai-gateway/.env` (shared with web dev).

### Build the DMG (end users)

```bash
make setup
make build-dmg
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/Notewise_0.1.0_aarch64.dmg`

The DMG bundles a portable gateway sidecar — users do not install Python.

### First launch checklist (DMG)

1. Grant **Microphone**
2. Enter your **PyAI API key** (stored in `~/Library/Application Support/com.notewise.app/data/gateway.env`)
3. On first capture, grant **Screen Recording** for system audio (optional)

### Menu bar

| Action | How |
|--------|-----|
| Open main window | Click tray icon or **Open Notewise** |
| Start / Stop recording | Tray menu |
| Open library | Tray menu |
| Show / hide overlay | Tray menu or **⌘⇧H** |
| Settings | Tray menu |
| Quit | Tray menu |

**Closing the main window hides to the menu bar** — it does not quit the app.

### Capture overlay

- Floating mini window stays on top across workspaces.
- Does not steal focus from your call app.
- Picture-in-picture support in supported browsers.

---

## Marketing website

The product marketing site lives in `apps/website/`.

```bash
pnpm dev:website    # http://localhost:5174
pnpm build:website  # Static build to apps/website/dist
```

| Page | Path |
|------|------|
| Home | `/` |
| Features | `/features` |
| Documentation | `/docs` |
| User stories | `/stories` |
| Download | `/download` |
| Open source | `/open-source` |
| Privacy | `/privacy` |

---

## Settings & backend

Open **Settings** (`/settings`) to configure:

### Backend selection

| Backend | Port | Use case |
|---------|------|----------|
| **PyAI** (recommended) | 3002 | Hear + Recap — the main Notewise path |
| **Nest** (legacy) | 3001 | Whisper + Ollama — hidden from Capture in production builds |

The desktop app is **PyAI-only**.

### Voice enrollment

- Link to **Onboarding** (`/onboarding`) for voice clone setup.
- Required for voice Q&A (Alt+Space).

### Desktop API key

- On desktop, set your PyAI key in Settings if not configured at first launch.

---

## Google Calendar setup

For calendar sync and prep reminders, configure OAuth in the gateway:

1. Create a project at [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Calendar API**.
3. Create **OAuth 2.0 credentials** (Web application).
4. Add redirect URI: `http://127.0.0.1:3002/auth/google/callback`
5. Add yourself as a **Test user** (while app is in testing mode).
6. Set in `services/pyai-gateway/.env`:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:3002/auth/google/callback
WEB_APP_URL=http://127.0.0.1:5173
AUTH_JWT_SECRET=generate-a-random-string
```

7. Restart the gateway and sign in with Google.

> **Desktop app (Mac):** Google sign-in opens the system browser, then returns to Notewise via `http://127.0.0.1:17654/auth/callback`. Copy the same `GOOGLE_*` and `AUTH_JWT_SECRET` values into `~/Library/Application Support/com.notewise.app/data/gateway.env` for installed builds.

> **Use `127.0.0.1` consistently** — not `localhost` — to avoid OAuth redirect mismatches.

### Common OAuth errors

| Error | Fix |
|-------|-----|
| `access_denied` | Add your email as a Test user in Google Cloud |
| Redirect mismatch | Ensure redirect URI matches exactly |
| Calendar not syncing | Check gateway logs; click **Sync calendar** on Profile |

---

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| **Alt + Space** (hold) | Voice Q&A — ask the meeting brain |
| **⌘⇧H** (desktop) | Panic hide capture overlay |
| **Enter** (login) | Submit guest name |

---

## Trust & privacy

Notewise is **local-first**:

| Data | Where it lives |
|------|----------------|
| Audio | **Not stored** — streamed to PyAI Hear, discarded after processing |
| Transcripts & notes | Local SQLite on your machine |
| Embeddings | Local SQLite |
| API key | Gateway `.env` or macOS Application Support |
| Gateway | Binds to `127.0.0.1` only — not exposed to the network |

Open **Trust** (`/trust`) in the app for a live data-flow diagram, token spend, and citation gate stats.

See also [PRIVACY.md](../../PRIVACY.md) in the repo root.

---

## Troubleshooting

Run **`make doctor`** first — it checks Python, venv, API key, gateway reachability, and DMG staging.

### Gateway won’t start

```bash
make setup
make run
# or: bash scripts/gateway.sh
```

Check `PYAI_API_KEY` in `services/pyai-gateway/.env`.

### Web app shows errors / can’t connect

- Run `make dev` (starts gateway + UI together), or ensure `make run` is active on port **3002**.
- Vite proxy defaults to `:3002`; override with `VITE_PROXY_TARGET` if needed.

### Desktop: “Gateway not responding on 127.0.0.1:3002”

**Dev:** run `make setup` then `make desktop` from `notewise/`.

**DMG:** reinstall from a fresh `make build-dmg`. Check logs:

```bash
cat ~/Library/Application\ Support/com.notewise.app/data/gateway.log
```

Quit other processes on port 3002 before testing the DMG (including `make run` in another terminal).

### No transcript after recording

- Speak louder / check mic permissions.
- Check gateway terminal for errors.
- PyAI sandbox may hit rate limits — wait or use a full API key.

### Google sign-in fails

- Add yourself as Test user in Google Cloud.
- Use `127.0.0.1` not `localhost` everywhere.
- Verify `WEB_APP_URL` and redirect URI in `.env`.

### Desktop: no system audio

- Grant **Screen Recording** in System Settings → Privacy.
- Without it, capture continues **mic-only**.

### Profile menu hidden under content

- Hard-refresh the page (`⌘⇧R`).
- Profile should be pinned to the **top-right** of the header.

### Marketing site not loading

```bash
pnpm dev:website
# Open http://localhost:5174
```

Port **5174** is the website; port **5173** is the web app.

---

## FAQ

**Do I need to pay for Notewise?**  
Notewise is MIT open source. You need a PyAI API key for speech and notes (sandbox available).

**Does a bot join my Zoom/Meet call?**  
No. Audio is captured locally on your device.

**Can my team use one account?**  
Not yet — no team accounts in the current version. Data is per-machine.

**Where is my data stored?**  
SQLite database on your Mac (path configurable via `MARGIN_DIR` / `NOTEWISE_PYAI_DATA_DIR`).

**Can I use Windows or Linux?**  
Web app works for mic-only capture. Full system audio and desktop app are macOS-only today.

**How do I back up my meetings?**  
Copy the SQLite file from your data directory. No cloud backup is built in.

**How do I contribute?**  
Fork the repo, read the code, open a PR. See `/open-source` on the marketing site.

---

## Project structure (for developers)

```
notewise/
├── apps/
│   ├── web/          # Main React app (Capture, Library, People, …)
│   ├── website/      # Marketing site
│   ├── desktop/      # Tauri macOS app
│   └── mobile/       # React Native (experimental)
├── services/
│   └── pyai-gateway/ # FastAPI backend (Hear, Recap, auth, calendar)
├── modes/            # Meeting mode YAML packs
├── packages/         # Shared UI + API client
└── docs/             # This guide + screenshots
```

---

**Questions or bugs?** Open an issue on GitHub or check the in-app Trust page for diagnostics.

*Last updated: August 2026*
