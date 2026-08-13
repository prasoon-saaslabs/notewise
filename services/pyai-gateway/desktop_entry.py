"""Entry point for the Notewise desktop sidecar (uvicorn)."""
from __future__ import annotations

import os

import uvicorn


def main() -> None:
    port = int(os.getenv("PYAI_GATEWAY_PORT", "3002"))
    host = os.getenv("PYAI_GATEWAY_HOST", "127.0.0.1")
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level=os.getenv("PYAI_GATEWAY_LOG_LEVEL", "info"),
        access_log=False,
    )


if __name__ == "__main__":
    main()
