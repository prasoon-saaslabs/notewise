from __future__ import annotations

import os
from pathlib import Path


def _expand(path: str) -> Path:
    return Path(os.path.expanduser(path)).resolve()


class Settings:
    def __init__(self) -> None:
        self.pyai_api_key: str = (os.getenv("PYAI_API_KEY") or "").strip()
        self.pyai_base_url: str = (
            os.getenv("PYAI_BASE_URL") or "https://api.pyai.com/v1"
        ).rstrip("/")
        self.port: int = int(os.getenv("PYAI_GATEWAY_PORT", "3002"))
        cors = os.getenv("CORS_ORIGIN", "http://localhost:5173,http://127.0.0.1:5173")
        self.cors_origins: list[str] = [o.strip() for o in cors.split(",") if o.strip()]

        data = os.getenv("NOTEWISE_PYAI_DATA_DIR") or str(
            Path(__file__).resolve().parents[1] / ".data"
        )
        self.data_dir: Path = _expand(data)
        self.uploads_dir: Path = self.data_dir / "uploads"
        self.store_path: Path = self.data_dir / "store.json"
        self.sqlite_path: Path = self.data_dir / "opengranola.sqlite"

        margin = os.getenv("MARGIN_DIR") or str(Path.home() / "Margin")
        self.margin_dir: Path = _expand(margin)

        self.recap_pack_id: str = os.getenv("PYAI_RECAP_PACK_ID") or "sales_outbound"
        self.recap_enabled: bool = (os.getenv("PYAI_RECAP_ENABLED") or "true").lower() in (
            "1",
            "true",
            "yes",
        )

        # Auth (Google OAuth + guest sessions)
        self.auth_jwt_secret: str = (
            os.getenv("AUTH_JWT_SECRET") or os.getenv("PYAI_API_KEY") or "dev-change-me-local-only"
        )
        self.auth_jwt_ttl_days: int = int(os.getenv("AUTH_JWT_TTL_DAYS", "30"))
        self.google_client_id: str = (os.getenv("GOOGLE_CLIENT_ID") or "").strip()
        self.google_client_secret: str = (os.getenv("GOOGLE_CLIENT_SECRET") or "").strip()
        self.google_redirect_uri: str = (
            os.getenv("GOOGLE_REDIRECT_URI") or "http://127.0.0.1:3002/auth/google/callback"
        ).strip()
        self.web_app_url: str = (os.getenv("WEB_APP_URL") or "http://127.0.0.1:5173").rstrip("/")
        self.google_scopes: str = (
            os.getenv("GOOGLE_SCOPES")
            or "openid email profile https://www.googleapis.com/auth/calendar.readonly"
        )

        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        self.margin_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
