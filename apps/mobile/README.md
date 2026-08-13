# Notewise Mobile

Expo (React Native) shell for Capture / Join / Library.

## Mini capture player

While recording, [`MiniCaptureOverlay`](src/components/MiniCaptureOverlay.tsx) shows:

- Timer + status
- Transcript tail
- Live notes
- Pause / Resume / Stop

`expo-keep-awake` keeps the screen on during capture.

### Platform limits (honest)

| Capability | iOS | Android |
|------------|-----|---------|
| In-app mini overlay | Yes | Yes |
| Float over other apps | No (OS) | Limited / special perms |
| Background controls | Live Activity (planned) | Foreground-service notification (planned) |

Desktop Tauri owns true always-on-top. Mobile Phase D follow-up: notification actions + iOS Live Activity.

## Dev

```bash
pnpm --filter @notewise/mobile start
```

Set `EXPO_PUBLIC_API_URL` to your Nest or PyAI gateway.
