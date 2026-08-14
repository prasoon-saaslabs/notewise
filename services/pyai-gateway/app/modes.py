from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from app.config import settings

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
    if "general" in modes:
        return modes["general"]
    if "sales-discovery" in modes:
        return modes["sales-discovery"]
    return next(iter(modes.values()), _fallback_mode())


def pack_id_for_mode(mode_id: str | None) -> str | None:
    """PyAI Recap pack_id for a Notewise meeting mode.

    Returns None for the ``general`` mode so PyAI uses its platform default pack.
    Other modes use their YAML ``pack_id``, with ``PYAI_RECAP_PACK_ID`` as fallback.
    """
    mode = get_mode(mode_id)
    if mode.get("id") == "general":
        return None
    pack = mode.get("pack_id")
    if pack is None:
        return settings.recap_pack_id
    pack_str = str(pack).strip()
    return pack_str or settings.recap_pack_id


def _fallback_mode() -> dict[str, Any]:
    return {
        "id": "general",
        "name": "General",
        "prompt": "Extract summary, action items, takeaways, and open questions.",
        "schema": {
            "actions": True,
            "takeaways": True,
            "openQuestions": True,
        },
    }
