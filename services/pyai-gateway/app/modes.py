from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

_MODES_DIR = Path(__file__).resolve().parents[3] / "modes"
if not _MODES_DIR.exists():
    _MODES_DIR = Path(__file__).resolve().parents[2] / "modes"


def modes_dir() -> Path:
    return _MODES_DIR


def list_modes() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if not _MODES_DIR.exists():
        return out
    for path in sorted(_MODES_DIR.glob("*.yaml")):
        if path.stem == "registry":
            continue
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        data["id"] = data.get("id") or path.stem
        data["path"] = str(path)
        out.append(data)
    return out


def get_mode(mode_id: str | None) -> dict[str, Any]:
    modes = {m["id"]: m for m in list_modes()}
    if mode_id and mode_id in modes:
        return modes[mode_id]
    if "sales-discovery" in modes:
        return modes["sales-discovery"]
    return next(iter(modes.values()), _fallback_mode())


def _fallback_mode() -> dict[str, Any]:
    return {
        "id": "sales-discovery",
        "name": "Sales discovery",
        "pack_id": "sales_outbound",
        "prompt": "Extract decisions, objections, action items with owners, and a follow-up email.",
        "schema": {
            "decisions": True,
            "objections": True,
            "actions": True,
            "followUpEmail": True,
        },
    }
