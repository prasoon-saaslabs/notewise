from __future__ import annotations

import asyncio
import json
import logging
from typing import Any
from urllib.parse import urlencode

from fastapi import WebSocket, WebSocketDisconnect
import websockets
from websockets.exceptions import ConnectionClosed, InvalidStatus

from app.config import settings
from app.pyai.client import require_api_key
from app.store.file_store import store

log = logging.getLogger("pyai.hear_stream")


def hear_stream_url(*, call_id: str, language: str = "en", channels: int = 1) -> str:
    base = settings.pyai_base_url.replace("https://", "wss://").replace("http://", "ws://")
    qs = urlencode(
        {
            "protocol": "pyai-hear-v1",
            "model": "pyai-hear",
            "language": language,
            "sample_rate": "16000",
            "encoding": "pcm16",
            "channels": str(2 if channels == 2 else 1),
            "interim_results": "true",
            "endpointing_ms": "800",
            "call_id": call_id,
            "pack_id": settings.recap_pack_id,
        }
    )
    return f"{base}/audio/transcriptions/stream?{qs}"


async def proxy_hear_stream(client_ws: WebSocket, session_id: str) -> None:
    """
    Bridge browser WS ↔ PyAI Hear streaming.
    Client sends binary PCM16 frames (and optional JSON control).
    Server forwards Hear JSON events; persists finals to local store.
    """
    await client_ws.accept()
    session = store.get_session(session_id)
    if not session:
        await client_ws.send_json({"type": "error", "code": "not_found", "message": "Unknown session"})
        await client_ws.close(code=1008)
        return

    meeting = store.get_meeting(session.meetingId)
    call_id = (meeting.callId if meeting else None) or session.meetingId

    try:
        api_key = require_api_key()
    except Exception as e:
        await client_ws.send_json({"type": "error", "code": "no_key", "message": str(e)})
        await client_ws.close(code=1008)
        return

    # Auth via Authorization header only — never put the key in the URL (logs/exceptions).
    channels = 2 if session.channelMode == "stereo" else 1
    url = hear_stream_url(call_id=call_id, channels=channels)
    log.info("Hear stream connect session=%s call_id=%s channels=%s", session_id, call_id, channels)

    try:
        async with websockets.connect(
            url,
            additional_headers={"Authorization": f"Bearer {api_key}"},
            max_size=8 * 1024 * 1024,
        ) as pyai_ws:
            await client_ws.send_json({"type": "ready", "call_id": call_id})

            async def client_to_pyai() -> None:
                try:
                    while True:
                        msg = await client_ws.receive()
                        if msg.get("type") == "websocket.disconnect":
                            break
                        if "bytes" in msg and msg["bytes"] is not None:
                            await pyai_ws.send(msg["bytes"])
                        elif "text" in msg and msg["text"] is not None:
                            # control frames (commit / config) pass through
                            await pyai_ws.send(msg["text"])
                except WebSocketDisconnect:
                    pass
                finally:
                    try:
                        await pyai_ws.send(json.dumps({"type": "commit"}))
                    except Exception:
                        pass

            async def pyai_to_client() -> None:
                try:
                    async for raw in pyai_ws:
                        if isinstance(raw, bytes):
                            continue
                        try:
                            frame: dict[str, Any] = json.loads(raw)
                        except json.JSONDecodeError:
                            await client_ws.send_text(raw)
                            continue
                        await _handle_and_forward(client_ws, session_id, frame)
                except ConnectionClosed:
                    pass

            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(client_to_pyai()),
                    asyncio.create_task(pyai_to_client()),
                ],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for t in pending:
                t.cancel()
            for t in done:
                if t.exception():
                    log.debug("bridge task ended: %s", t.exception())
    except InvalidStatus as e:
        code = "stream_failed"
        message = str(e)
        if getattr(e, "response", None) and e.response.status_code == 429:
            code = "rate_limit"
            message = (
                "PyAI daily usage cap reached for this API key (resets 00:00 UTC). "
                "Use browser live captions or wait for reset."
            )
        log.warning("Hear stream rejected: %s", message)
        try:
            await client_ws.send_json({"type": "error", "code": code, "message": message})
        except Exception:
            pass
    except Exception as e:
        log.exception("Hear stream failed")
        msg = str(e)
        code = "rate_limit" if "429" in msg or "daily_cap" in msg.lower() else "stream_failed"
        try:
            await client_ws.send_json(
                {"type": "error", "code": code, "message": msg}
            )
        except Exception:
            pass
    finally:
        try:
            await client_ws.close()
        except Exception:
            pass


async def _handle_and_forward(
    client_ws: WebSocket,
    session_id: str,
    frame: dict[str, Any],
) -> None:
    ftype = frame.get("type")
    # Persist finals continuously (crash-safety)
    if ftype in ("speech_final", "final"):
        text = (frame.get("text") or "").strip()
        if text:
            t_ms = int(frame.get("t_ms") or 0)
            audio_ms = int(frame.get("audio_ms") or 0)
            start_ms = max(0, t_ms - audio_ms)
            end_ms = t_ms or (start_ms + audio_ms)
            # Dedupe: speech_final then final often same utterance — skip store + client forward
            if ftype == "final":
                session = store.get_session(session_id)
                if session and session.liveTranscript:
                    last = session.liveTranscript[-1]
                    if last.get("text") == text:
                        return
            store.append_live_final(
                session_id,
                text=text,
                start_ms=start_ms,
                end_ms=end_ms,
            )
    await client_ws.send_json(frame)
