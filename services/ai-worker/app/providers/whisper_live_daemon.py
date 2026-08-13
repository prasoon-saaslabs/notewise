#!/usr/bin/env python3
"""Long-lived Whisper process for low-latency live STT.

Reads one JSON request per line from stdin:
  {"wav": "/path/to.wav", "model": "tiny.en"}

Writes one JSON response per line to stdout:
  {"segments": [{"text": "...", "startMs": 0, "endMs": 1000}]}
"""

from __future__ import annotations

import json
import sys
from typing import Any


def main() -> None:
    import whisper  # type: ignore

    models: dict[str, Any] = {}
    default_model = "tiny.en"
    models[default_model] = whisper.load_model(default_model)
    # Signal ready (model already in memory)
    print(json.dumps({"ok": True, "ready": True, "model": default_model}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            wav = req["wav"]
            model_name = req.get("model") or "tiny.en"
            if model_name not in models:
                models[model_name] = whisper.load_model(model_name)
            payload = models[model_name].transcribe(
                wav,
                language="en",
                fp16=False,
                condition_on_previous_text=False,
                verbose=False,
            )
            segments = []
            for seg in payload.get("segments") or []:
                text = str(seg.get("text") or "").strip()
                if not text:
                    continue
                segments.append(
                    {
                        "text": text,
                        "startMs": int(float(seg.get("start") or 0) * 1000),
                        "endMs": int(float(seg.get("end") or 0) * 1000),
                    }
                )
            print(json.dumps({"segments": segments}), flush=True)
        except Exception as exc:  # noqa: BLE001
            print(json.dumps({"segments": [], "error": str(exc)[:200]}), flush=True)


if __name__ == "__main__":
    main()
