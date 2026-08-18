#!/usr/bin/env python3
"""Upload Notewise meeting modes as PyAI Trace rule packs.

Reads templates from modes/*.yaml and POSTs each to:
  https://api.pyai.com/v1/trace/rule-packs

See: https://docs.pyai.com/api-reference/trace/upload-a-custom-rule-pack

Requires PYAI_API_KEY with trace:configure (and recap:configure for --recap-config).

Usage:
  python scripts/upload-pyai-packs.py --dry-run
  python scripts/upload-pyai-packs.py
  python scripts/upload-pyai-packs.py --sync-yaml --recap-config
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import httpx
import yaml

ROOT = Path(__file__).resolve().parents[1]
MODES_DIR = ROOT / "modes"
EXPORT_DIR = MODES_DIR / "pyai-packs"
ENV_FILE = ROOT / "services" / "pyai-gateway" / ".env"
PACK_VERSION = "1.0.0"
PACK_PREFIX = "notewise"

FIELD_HINTS: dict[str, str] = {
    "decisions": "Explicit decisions reached on the call.",
    "objections": "Concerns, pushback, or blockers raised by either side.",
    "actions": "Action items with owner and due date when mentioned.",
    "followUpEmail": "Short follow-up email draft grounded in the call.",
    "budget": "Budget constraints or pricing sensitivity.",
    "authority": "Decision-maker / buying authority signals.",
    "need": "Pain points and business need.",
    "timeline": "Timing, urgency, and procurement timeline.",
    "blockers": "Blockers preventing progress.",
    "career": "Career growth, wellbeing, or development topics.",
    "ask": "Fundraising ask, round size, or terms discussed.",
    "interest": "Investor interest level and rationale.",
}


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def mode_to_pack_id(mode_id: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", mode_id.lower()).strip("_")
    return f"{PACK_PREFIX}_{slug}"


def list_modes() -> list[dict[str, Any]]:
    modes: list[dict[str, Any]] = []
    if not MODES_DIR.is_dir():
        raise SystemExit(f"modes directory not found: {MODES_DIR}")
    for path in sorted(MODES_DIR.glob("*.yaml")):
        if path.stem == "registry":
            continue
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        data["id"] = data.get("id") or path.stem
        data["_path"] = str(path)
        modes.append(data)
    if not modes:
        raise SystemExit(f"No mode YAML files in {MODES_DIR}")
    return modes


def _rule(
    *,
    rule_id: str,
    name: str,
    description: str,
    severity: str = "medium",
    category: str = "recap_field",
    field: str | None = None,
    required: bool = True,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "id": rule_id,
        "name": name,
        "description": description,
        "severity": severity,
        "category": category,
        "required": required,
    }
    if field is not None:
        body["field"] = field
    if extra:
        body.update(extra)
    return body


def build_rule_pack(mode: dict[str, Any]) -> dict[str, Any]:
    mode_id = str(mode["id"])
    pack_id = mode_to_pack_id(mode_id)
    name = str(mode.get("name") or mode_id)
    prompt = str(mode.get("prompt") or "").strip()
    schema = mode.get("schema") or {}

    rules: list[dict[str, Any]] = [
        _rule(
            rule_id=f"{pack_id}_evidence",
            name="evidence_required",
            description=(
                "Every factual claim in Recap output must cite transcript lineIds. "
                "Do not invent facts not supported by utterances."
            ),
            severity="high",
            category="evidence",
            field=None,
            required=True,
            extra={"instruction": prompt or "Ground all notes in the transcript."},
        ),
        _rule(
            rule_id=f"{pack_id}_summary",
            name="executive_summary",
            description="Produce a concise executive summary (2–4 sentences unless mode specifies otherwise).",
            severity="medium",
            category="recap_field",
            field="summary",
        ),
    ]

    for field, enabled in schema.items():
        if not enabled:
            continue
        hint = FIELD_HINTS.get(field, f"Extract `{field}` when present in the conversation.")
        rules.append(
            _rule(
                rule_id=f"{pack_id}_{field}",
                name=f"extract_{field}",
                description=hint,
                severity="medium" if field in ("decisions", "actions", "objections") else "low",
                category="recap_field",
                field=field,
            )
        )

    mode_hints: dict[str, str] = {
        "sales-discovery": "Prioritize BANT signals: budget, authority, need, timeline, and competitive objections.",
        "1-1": "Capture wellbeing, priorities, blockers, and career development alongside commitments.",
        "standup": "Structure summary as yesterday / today / blockers per speaker when possible.",
        "investor-call": "Highlight fundraising ask, traction proof points, investor interest, and next step.",
    }
    if mode_id in mode_hints:
        rules.append(
            _rule(
                rule_id=f"{pack_id}_mode_focus",
                name="mode_focus",
                description=mode_hints[mode_id],
                severity="low",
                category="guidance",
                field=None,
                required=False,
            )
        )

    return {
        "pack_id": pack_id,
        "version": PACK_VERSION,
        "jurisdiction": "notewise",
        "legal_status": "product_curated",
        "rules": rules,
        "_meta": {
            "notewise_mode_id": mode_id,
            "notewise_mode_name": name,
            "prompt": prompt,
            "schema": schema,
        },
    }


def api_payload(spec: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in spec.items() if not k.startswith("_")}


def export_specs(specs: list[dict[str, Any]]) -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    for spec in specs:
        pack_id = spec["pack_id"]
        path = EXPORT_DIR / f"{pack_id}.json"
        path.write_text(json.dumps(api_payload(spec), indent=2) + "\n", encoding="utf-8")
        meta_path = EXPORT_DIR / f"{pack_id}.meta.json"
        meta_path.write_text(json.dumps(spec.get("_meta", {}), indent=2) + "\n", encoding="utf-8")


def sync_mode_yaml(specs: list[dict[str, Any]]) -> None:
    by_mode = {s["_meta"]["notewise_mode_id"]: s["pack_id"] for s in specs}
    for path in sorted(MODES_DIR.glob("*.yaml")):
        if path.stem == "registry":
            continue
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        mode_id = data.get("id") or path.stem
        if mode_id not in by_mode:
            continue
        new_pack = by_mode[mode_id]
        if data.get("pack_id") == new_pack:
            continue
        data["pack_id"] = new_pack
        path.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True), encoding="utf-8")
        print(f"  updated {path.name} pack_id -> {new_pack}")


def upload_pack(client: httpx.Client, spec: dict[str, Any], *, dry_run: bool) -> dict[str, Any] | None:
    payload = api_payload(spec)
    pack_id = payload["pack_id"]
    if dry_run:
        print(f"[dry-run] POST /trace/rule-packs  pack_id={pack_id}  rules={len(payload['rules'])}")
        return {"pack_id": pack_id, "status": "dry_run"}

    res = client.post("/trace/rule-packs", json=payload)
    if res.status_code == 201:
        body = res.json()
        print(f"  created {pack_id} -> {body.get('id', 'ok')}")
        return body
    if res.status_code == 409:
        print(f"  exists  {pack_id} (409 — bump version to replace)")
        return {"pack_id": pack_id, "status": "exists"}
    res.raise_for_status()
    return None


def configure_recap(client: httpx.Client, default_pack_id: str, *, dry_run: bool) -> None:
    body = {"enabled": True, "default_pack_id": default_pack_id}
    if dry_run:
        print(f"[dry-run] PUT /recap/config  default_pack_id={default_pack_id}")
        return
    res = client.put("/recap/config", json=body)
    res.raise_for_status()
    print(f"  recap default_pack_id -> {default_pack_id}")


def configure_trace(client: httpx.Client, pack_ids: list[str], *, dry_run: bool) -> None:
    rule_packs = {pid: {"enabled": True, "version": PACK_VERSION} for pid in pack_ids}
    body = {
        "enabled": True,
        "rule_packs": rule_packs,
        "guardrails": {
            "mode": "warn",
            "fail_open": True,
            "blocked_phrases": [],
        },
    }
    if dry_run:
        print(f"[dry-run] PUT /trace/config  packs={','.join(pack_ids)}")
        return
    res = client.put("/trace/config", json=body)
    res.raise_for_status()
    print(f"  trace enabled with {len(pack_ids)} Notewise packs (mode=warn)")


def list_remote_packs(client: httpx.Client) -> list[dict[str, Any]]:
    res = client.get("/trace/rule-packs")
    res.raise_for_status()
    data = res.json()
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        return data["data"]
    if isinstance(data, list):
        return data
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="Upload Notewise modes to PyAI Trace rule packs")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without calling PyAI")
    parser.add_argument("--export-only", action="store_true", help="Write modes/pyai-packs/*.json only")
    parser.add_argument("--mode", dest="mode_id", help="Upload a single mode id (e.g. sales-discovery)")
    parser.add_argument("--sync-yaml", action="store_true", help="Set pack_id in modes/*.yaml after upload")
    parser.add_argument(
        "--recap-config",
        action="store_true",
        help="PUT /recap/config with default notewise_sales_discovery",
    )
    parser.add_argument(
        "--trace-config",
        action="store_true",
        help="PUT /trace/config enabling uploaded Notewise packs (warn mode)",
    )
    parser.add_argument("--list", action="store_true", help="List remote rule packs and exit")
    args = parser.parse_args()

    load_dotenv(ENV_FILE)
    api_key = os.environ.get("PYAI_API_KEY", "").strip()
    base_url = os.environ.get("PYAI_BASE_URL", "https://api.pyai.com/v1").rstrip("/")

    modes = list_modes()
    if args.mode_id:
        modes = [m for m in modes if m["id"] == args.mode_id]
        if not modes:
            raise SystemExit(f"Mode not found: {args.mode_id}")

    specs = [build_rule_pack(m) for m in modes]
    export_specs(specs)
    print(f"==> Exported {len(specs)} pack spec(s) to {EXPORT_DIR.relative_to(ROOT)}/")

    if args.export_only:
        return 0

    if not api_key:
        raise SystemExit(
            "PYAI_API_KEY is not set. Add it to services/pyai-gateway/.env "
            "(requires trace:configure scope)."
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    with httpx.Client(base_url=base_url, headers=headers, timeout=60.0) as client:
        if args.list:
            packs = list_remote_packs(client)
            for p in packs:
                print(f"{p.get('pack_id')}\t{p.get('version')}\tbuiltin={p.get('builtin')}\t{p.get('status')}")
            return 0

        print("==> Uploading rule packs")
        for spec in specs:
            upload_pack(client, spec, dry_run=args.dry_run)

        pack_ids = [s["pack_id"] for s in specs]

        if args.sync_yaml and not args.dry_run:
            print("==> Syncing modes/*.yaml pack_id")
            sync_mode_yaml(specs)

        if args.recap_config:
            print("==> Recap config")
            default = next(
                (s["pack_id"] for s in specs if s["_meta"]["notewise_mode_id"] == "sales-discovery"),
                pack_ids[0],
            )
            configure_recap(client, default, dry_run=args.dry_run)

        if args.trace_config:
            print("==> Trace config")
            configure_trace(client, pack_ids, dry_run=args.dry_run)

    print("Done.")
    if not args.sync_yaml:
        print("Tip: re-run with --sync-yaml to point modes/*.yaml at the new pack_id values.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except httpx.HTTPStatusError as exc:
        detail = (exc.response.text or "")[:500]
        print(f"PyAI error {exc.response.status_code}: {detail}", file=sys.stderr)
        raise SystemExit(1) from exc
