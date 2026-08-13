# Notewise PyAI Gateway

Parallel FastAPI backend that mirrors the Nest Notewise API contract using **PyAI Hear** (STT) and **PyAI Recap** (notes). Nest + ai-worker stay unchanged.

## Run

From the **notewise repo root**:

```bash
make setup    # once
make run      # gateway on :3002
```

Or use the shared script: `bash scripts/gateway.sh`

## Frontend switch

```bash
# apps/web/.env
VITE_API_URL=http://127.0.0.1:3002
# or keep /api and set:
VITE_PROXY_TARGET=http://127.0.0.1:3002
```

Legacy Nest remains on `:3001`.

## Env

| Variable | Purpose |
|----------|---------|
| `PYAI_API_KEY` | Org key (never ship to Vite) |
| `PYAI_GATEWAY_PORT` | Default `3002` |
| `MARGIN_DIR` | Default `~/Margin` |
| `PYAI_RECAP_PACK_ID` | Default `sales_outbound` |

## Paths

- **A** Live: `WS /sessions/:id/hear` → Hear streaming PCM16 16 kHz
- **B** Finalize: Hear jobs `diarize` (mono) or `channel` (stereo)
- **C** Enrollment: local sample + check-in window bind
- **D** Recap → NotesPayload + `~/Margin/YYYY-MM-DD-title/`
