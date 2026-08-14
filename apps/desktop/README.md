# Notewise Desktop (Tauri)

PyAI-only macOS app with local gateway, menu bar tray, and capture overlay.

## Dev (recommended)

Uses the **same repo gateway** as web dev — one Python venv, one `.env`.

```bash
cd notewise
make setup          # once
make desktop        # starts gateway if needed + Tauri dev window
```

Or manually:

```bash
make run            # terminal 1
make desktop        # terminal 2 (skips gateway start if already up)
```

Put your PyAI key in `services/pyai-gateway/.env` — desktop dev reads it automatically.

## Build DMG (release)

No **Xcode** or Swift required — `build.rs` compiles `native/system_audio.m` with **clang** from the Command Line Tools.

```bash
make setup
make stage-gateway
make build-dmg
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/Notewise_0.1.0_aarch64.dmg`

## First launch (DMG)

1. Grant **Microphone** when prompted
2. Enter your **PyAI API key** (stored in `~/Library/Application Support/com.notewise.app/data/gateway.env`)
3. Sign in with Google if this DMG was built with `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `services/pyai-gateway/.env`
4. On first capture, grant **Screen Recording** for system audio (optional — mic-only fallback works)

## Menu bar

- **Open Notewise** / click tray icon
- **Start / Stop recording**
- **Open library** · **Show capture overlay** · **Hide overlay** (⌘⇧H)
- **Settings** · **Quit**

Closing the main window hides to the menu bar (does not quit).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Gateway not responding | `make doctor` · check `~/Library/Application Support/com.notewise.app/data/gateway.log` |
| Dev desktop can't find gateway | Run `make setup` from `notewise/` root |
| Port 3002 in use | Quit other Notewise instances or `make run` in another terminal |

## Enterprise distribution

For production rollout, sign and notarize the `.app` with your Apple Developer ID. MDM: pre-approve Microphone and Screen Recording for `com.notewise.app`.
