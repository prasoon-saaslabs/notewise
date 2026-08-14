import unittest
from pathlib import Path
import sys
from unittest.mock import AsyncMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.modes import pack_id_for_mode
from app.pyai.recap_utterances import fresh_recap_call_id


class PackIdForModeTests(unittest.TestCase):
    def test_known_modes_map_to_notewise_packs(self):
        cases = {
            "sales-discovery": "notewise_sales_discovery",
            "1-1": "notewise_1_1",
            "standup": "notewise_standup",
            "investor-call": "notewise_investor_call",
        }
        for mode_id, expected_pack in cases.items():
            self.assertEqual(pack_id_for_mode(mode_id), expected_pack)

    def test_general_mode_uses_pyai_default(self):
        self.assertIsNone(pack_id_for_mode("general"))
        self.assertIsNone(pack_id_for_mode(None))


class RegenerateRecapCallTests(unittest.IsolatedAsyncioTestCase):
    async def test_regenerate_uses_fresh_call_id_and_mode_pack(self):
        from app.pipeline import regenerate_notes
        from app.store.models import Meeting, NotesPayload, TranscriptTurn

        meeting = Meeting(
            id="m-1",
            title="Demo",
            status="ready",
            createdAt="2026-01-01T00:00:00Z",
            modeId="1-1",
            callId="base-call-id",
            snippet="old snippet",
            transcript=[
                TranscriptTurn(
                    id="l1",
                    speaker="You",
                    kind="you",
                    text="Blockers on infra.",
                    startMs=0,
                    endMs=2000,
                )
            ],
            notes=NotesPayload(executiveSummary="old"),
        )

        submit_mock = AsyncMock(
            return_value={"call_id": "base-call-id-rabc123"}
        )
        wait_mock = AsyncMock(
            return_value={
                "status": "complete",
                "record": {"summary": "New standup summary", "action_items": []},
            }
        )
        gate_mock = AsyncMock(side_effect=lambda _mid, _turns, notes, **_: notes)

        def _update_meeting(mid, **fields):
            nonlocal meeting
            data = meeting.model_dump()
            data.update(fields)
            meeting = Meeting.model_validate(data)
            return meeting

        with (
            patch("app.pipeline.store.get_meeting", side_effect=lambda _mid: meeting),
            patch("app.pipeline.store.update_meeting", side_effect=_update_meeting),
            patch("app.pipeline.submit_utterances", submit_mock),
            patch("app.pipeline.wait_for_recap", wait_mock),
            patch("app.pipeline._gate_and_remember", gate_mock),
            patch("app.pipeline.extract_and_link", return_value=[]),
            patch("app.pipeline.write_margin_folder", return_value=Path("/tmp/m")),
        ):
            result = await regenerate_notes(
                "m-1",
                mode_id="standup",
                user_notes="Ship Friday",
            )

        submit_mock.assert_awaited_once()
        recap_call_id = submit_mock.await_args.args[0]
        self.assertNotEqual(recap_call_id, "base-call-id")
        self.assertTrue(recap_call_id.startswith("base-call-id-r"))

        kwargs = submit_mock.await_args.kwargs
        self.assertEqual(kwargs["pack_id"], "notewise_standup")
        self.assertEqual(kwargs["mode_id"], "standup")
        self.assertIn("New standup summary", result["snippet"] or "")
        self.assertIn("New standup summary", meeting.snippet or "")

    async def test_regenerate_general_mode_omits_pack(self):
        from app.pipeline import regenerate_notes
        from app.store.models import Meeting, NotesPayload, TranscriptTurn

        meeting = Meeting(
            id="m-2",
            title="Demo",
            status="ready",
            createdAt="2026-01-01T00:00:00Z",
            modeId="sales-discovery",
            callId="base-call-id",
            transcript=[
                TranscriptTurn(
                    id="l1",
                    speaker="You",
                    kind="you",
                    text="Hello.",
                    startMs=0,
                    endMs=1000,
                )
            ],
            notes=NotesPayload(executiveSummary="old"),
        )

        submit_mock = AsyncMock(return_value={"call_id": "fresh-id"})
        wait_mock = AsyncMock(
            return_value={
                "status": "complete",
                "record": {"summary": "General summary", "action_items": []},
            }
        )
        gate_mock = AsyncMock(side_effect=lambda _mid, _turns, notes, **_: notes)

        def _update_meeting(mid, **fields):
            nonlocal meeting
            data = meeting.model_dump()
            data.update(fields)
            meeting = Meeting.model_validate(data)
            return meeting

        with (
            patch("app.pipeline.store.get_meeting", side_effect=lambda _mid: meeting),
            patch("app.pipeline.store.update_meeting", side_effect=_update_meeting),
            patch("app.pipeline.submit_utterances", submit_mock),
            patch("app.pipeline.wait_for_recap", wait_mock),
            patch("app.pipeline._gate_and_remember", gate_mock),
            patch("app.pipeline.extract_and_link", return_value=[]),
            patch("app.pipeline.write_margin_folder", return_value=Path("/tmp/m")),
        ):
            await regenerate_notes("m-2", mode_id="general")

        self.assertIsNone(submit_mock.await_args.kwargs["pack_id"])


if __name__ == "__main__":
    unittest.main()
