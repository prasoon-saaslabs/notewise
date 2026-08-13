# Notewise Desktop (Tauri)

PyAI-only macOS app with bundled local gateway, menu bar tray, and capture overlay.

## Build DMG (macOS)

Prerequisites: Node 20+, pnpm, Rust, Python 3.11+

```bash
cd notewise
make setup                    # gateway venv + deps
pnpm build:desktop:dmg        # stages gateway + builds DMG
```

Output: `apps/desktop/src-tauri/target/release/bundle/dmg/Notewise_0.1.0_aarch64.dmg`

## Dev mode

```bash
# Terminal A — optional if not using bundled sidecar
pnpm dev:pyai-gateway

# Terminal B
cd apps/desktop && pnpm tauri:dev
```

In dev, the app auto-starts the gateway from `services/pyai-gateway` if the bundled sidecar is not staged.

## First launch

1. Grant **Microphone** when prompted
2. Enter your **PyAI API key** (stored in `~/Library/Application Support/Notewise/data/gateway.env`)
3. On first capture, grant **Screen Recording** for system audio (optional — mic-only fallback works)

## Menu bar

- **Open Notewise** / click tray icon
- **Start / Stop recording**
- **Open library** · **Show capture overlay** · **Hide overlay** (⌘⇧H)
- **Settings** · **Quit**

Closing the main window hides to the menu bar (does not quit).

## Enterprise distribution

For production rollout, sign and notarize the `.app` with your Apple Developer ID:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Org (TEAMID)"
# Configure notarization in CI — see Apple notarytool docs
```

MDM: pre-approve Microphone and Screen Recording via PPPC payloads for `com.notewise.app`.
