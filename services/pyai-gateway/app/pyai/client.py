from __future__ import annotations

import httpx

from app.config import settings


class PyAIError(RuntimeError):
    def __init__(self, message: str, *, status: int | None = None, body: str | None = None):
        super().__init__(message)
        self.status = status
        self.body = body


def require_api_key() -> str:
    key = settings.pyai_api_key
    if not key:
        raise PyAIError(
            "PYAI_API_KEY is not set. Add it to services/pyai-gateway/.env",
            status=503,
        )
    return key


def auth_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {require_api_key()}",
        "Accept": "application/json",
    }


async def pyai_request(
    method: str,
    path: str,
    *,
    json: dict | None = None,
    data: dict | None = None,
    files: dict | None = None,
    timeout: float = 120.0,
) -> dict | list | None:
    url = f"{settings.pyai_base_url}{path}"
    headers = auth_headers()
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if files:
                res = await client.request(
                    method,
                    url,
                    headers={k: v for k, v in headers.items() if k.lower() != "content-type"},
                    data=data or {},
                    files=files,
                )
            else:
                res = await client.request(
                    method,
                    url,
                    headers={**headers, "Content-Type": "application/json"},
                    json=json,
                )
    except httpx.HTTPError as e:
        raise PyAIError(f"PyAI {method} {path} network error") from e
    if res.status_code >= 400:
        body = (res.text or "")[:2000]
        # Never include Authorization; response bodies are safe error JSON.
        raise PyAIError(
            f"PyAI {method} {path} failed: {res.status_code} {body[:300]}",
            status=res.status_code,
            body=body,
        )
    if res.status_code == 204 or not res.content:
        return None
    return res.json()
