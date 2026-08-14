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

End users get a bundled gateway (Homebrew Python matching the staged ABI + vendored deps). macOS `/usr/bin/python3` (3.9) is not used.

```bash
make setup
make build-dmg
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/Notewise_0.1.0_aarch64.dmg`

## First launch (DMG)

1. Grant **Microphone** when prompted
2. Enter your **PyAI API key** (stored in `~/Library/Application Support/com.notewise.app/data/gateway.env`)
3. On first capture, grant **Screen Recording** for system audio (optional — mic-only fallback works)

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
| `make run` dies when desktop opens | Fully **Quit Notewise** from the menu bar (closing the window is not enough). Desktop now attaches to a healthy `:3002` instead of killing it. |
| DMG sidecar crash / Python 3.9 | Install matching Python: `brew install python@3.14` (see `.python-version` in the staged gateway). Rebuild the DMG after `make stage-gateway`. |

## Enterprise distribution

For production rollout, sign and notarize the `.app` with your Apple Developer ID. MDM: pre-approve Microphone and Screen Recording for `com.notewise.app`.
