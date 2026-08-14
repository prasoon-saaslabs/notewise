import unittest
from pathlib import Path
import sys
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.store.models import Entity


class AskEntityFilterTests(unittest.TestCase):
    def test_ask_with_entity_and_no_meetings_returns_no_evidence(self):
        from app.routes.memory import ask, AskBody

        entity = Entity(
            id="ent-1",
            kind="person",
            name="Alex",
            createdAt="2026-01-01T00:00:00Z",
            updatedAt="2026-01-01T00:00:00Z",
            meetingIds=[],
        )

        async def _run():
            with (
                patch("app.routes.memory.retrieve", return_value=[{"meetingId": "other-meeting", "text": "pilot pricing"}]),
                patch("app.routes.memory.store.get_entity", return_value=entity),
                patch("app.routes.memory.store.entity_meeting_ids", return_value=[]),
            ):
                return await ask(AskBody(question="Summarize relationship", entityId="ent-1"))

        import asyncio

        result = asyncio.get_event_loop().run_until_complete(_run())
        self.assertEqual(result["source"], "no_evidence")
        self.assertEqual(result["answer"], [])
        self.assertEqual(result["hits"], [])


if __name__ == "__main__":
    unittest.main()
