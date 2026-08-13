from __future__ import annotations

import logging
import os

import httpx

log = logging.getLogger("pyai.ask_llm")


async def synthesize_with_ollama(question: str, evidence_lines: list[str]) -> str | None:
    """Local LLM fallback when PyAI Recap is unavailable (e.g. missing recap:read scope)."""
    base = (os.getenv("OLLAMA_BASE_URL") or "http://127.0.0.1:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL") or "llama3.2"
    if not evidence_lines:
        return None
    prompt = (
        "Answer the question using ONLY the evidence below. "
        "Return 2-5 concise bullet points. No preamble.\n\n"
        f"QUESTION: {question.strip()}\n\nEVIDENCE:\n"
        + "\n".join(evidence_lines[:18])
    )
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            res = await client.post(
                f"{base}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You synthesize meeting notes. Only use provided evidence.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "stream": False,
                },
            )
        if res.status_code >= 400:
            log.warning("Ollama ask failed: %s %s", res.status_code, res.text[:200])
            return None
        data = res.json()
        msg = data.get("message") or {}
        text = (msg.get("content") or "").strip()
        return text or None
    except Exception as e:
        log.warning("Ollama unavailable: %s", e)
        return None
