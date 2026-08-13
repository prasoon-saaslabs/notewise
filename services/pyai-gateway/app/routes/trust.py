from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

from app.config import settings
from app.store.file_store import store

router = APIRouter(tags=["trust"])


@router.get("/trust")
async def trust():
    runs = store.list_runs(limit=50)
    return {
        "dbPath": store.db_path(),
        "runs": runs,
        "dataFlow": {
            "audio": "PyAI Hear only (configured STT endpoint). Not stored on disk after the call.",
            "transcript": str(store.db_path()),
            "notes": str(store.db_path()),
            "embeddings": str(store.db_path()),
            "telemetry": "none",
            "account": "none",
        },
    }


@router.get("/privacy")
async def privacy():
    return {
        "title": "What leaves this machine",
        "audio": "Audio frames go only to the Hear endpoint you configured. They are not stored by Notewise after transcription.",
        "text": "Transcript text is sent to Recap (and optional Cast/Clone) for notes and spoken answers.",
        "atRest": f"Everything persistent lives in {store.db_path()} and optional Markdown under {settings.margin_dir}.",
        "notSent": ["analytics", "accounts", "cloud backups", "third-party CRMs"],
        "consent": "Recording consent is confirmed before the first capture. Laws differ by jurisdiction.",
    }


@router.get("/privacy.html", response_class=HTMLResponse)
async def privacy_html():
    data = await privacy()
    items = "".join(f"<li>{x}</li>" for x in data["notSent"])
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>Data flow</title></head>
<body style="font-family:system-ui;max-width:40rem;margin:2rem auto;line-height:1.5">
<h1>{data['title']}</h1>
<p><b>Audio.</b> {data['audio']}</p>
<p><b>Text.</b> {data['text']}</p>
<p><b>At rest.</b> {data['atRest']}</p>
<p>Never sent:</p><ul>{items}</ul>
<p>{data['consent']}</p>
</body></html>"""


@router.get("/meetings/{meeting_id}/export.json")
async def export_json(meeting_id: str):
    m = store.get_meeting(meeting_id)
    if not m:
        from fastapi import HTTPException

        raise HTTPException(404, "Meeting not found")
    return m.model_dump()


@router.get("/meetings/{meeting_id}/export.md")
async def export_md(meeting_id: str):
    from fastapi.responses import PlainTextResponse
    from app.store.margin import _summary_md, _transcript_md

    m = store.get_meeting(meeting_id)
    if not m:
        from fastapi import HTTPException

        raise HTTPException(404, "Meeting not found")
    body = _summary_md(m.notes) + "\n" + _transcript_md(m.transcript)
    return PlainTextResponse(body, media_type="text/markdown")


@router.get("/meetings/{meeting_id}/export.html")
async def export_html(meeting_id: str):
    from fastapi.responses import HTMLResponse
    from app.store.margin import _summary_md, _transcript_md

    m = store.get_meeting(meeting_id)
    if not m:
        from fastapi import HTTPException

        raise HTTPException(404, "Meeting not found")
    md = _summary_md(m.notes) + "\n" + _transcript_md(m.transcript)
    dropped = m.notes.droppedCount if m.notes else 0
    status = m.notes.runStatus.exit if m.notes and m.notes.runStatus else "n/a"
    html = f"""<!doctype html><html><head><meta charset="utf-8"><title>{m.title}</title>
<style>body{{font-family:system-ui;max-width:42rem;margin:2rem auto;line-height:1.5}}
pre{{white-space:pre-wrap}}</style></head>
<body><p>Local share · run {status} · {dropped} claims dropped</p>
<pre>{md.replace("<", "&lt;")}</pre></body></html>"""
    return HTMLResponse(html)
