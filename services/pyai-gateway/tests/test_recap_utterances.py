import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.pyai.recap_utterances import fold_user_notes_into_utterances, fresh_recap_call_id


class FoldUserNotesTests(unittest.TestCase):
    def test_prepends_notes_to_first_utterance_without_note_taker_role(self):
        utterances = [
            {
                "speaker_role": "agent",
                "text": "We will ship Friday.",
                "offset_s": 1.0,
                "duration_s": 2.0,
            },
            {
                "speaker_role": "customer",
                "text": "Sounds good.",
                "offset_s": 3.0,
                "duration_s": 1.0,
            },
        ]
        out = fold_user_notes_into_utterances(utterances, "Follow up with Priya")
        self.assertEqual(len(out), 2)
        self.assertTrue(all(u["speaker_role"] in ("agent", "customer") for u in out))
        self.assertIn("Follow up with Priya", out[0]["text"])
        self.assertIn("We will ship Friday.", out[0]["text"])
        self.assertEqual(out[1]["text"], "Sounds good.")

    def test_empty_transcript_becomes_single_agent_utterance(self):
        out = fold_user_notes_into_utterances([], "Action: send deck")
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["speaker_role"], "agent")
        self.assertIn("Action: send deck", out[0]["text"])

    def test_blank_notes_leave_utterances_unchanged(self):
        utterances = [
            {
                "speaker_role": "customer",
                "text": "Hello",
                "offset_s": 0.0,
                "duration_s": 0.5,
            }
        ]
        out = fold_user_notes_into_utterances(utterances, "   ")
        self.assertEqual(out, utterances)


class FreshRecapCallIdTests(unittest.TestCase):
    def test_differs_from_base_and_stays_path_safe(self):
        base = "50b3a7e1-0224-4d63-81f7-0cafc1fd25ca"
        first = fresh_recap_call_id(base)
        second = fresh_recap_call_id(base)
        self.assertNotEqual(first, base)
        self.assertTrue(first.startswith(f"{base}-r"))
        self.assertLessEqual(len(first), 128)
        self.assertRegex(first, r"^[A-Za-z0-9._:-]+$")
        self.assertNotEqual(first, second)


if __name__ == "__main__":
    unittest.main()
