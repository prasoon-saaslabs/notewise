import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  foldUserNotesIntoUtterances,
  freshRecapCallId,
  mapRecapToNotes,
  transcriptToUtterances,
} from "./recap.mapper.ts";

test("fresh Recap call ids differ from the meeting id", () => {
  const base = "50b3a7e1-0224-4d63-81f7-0cafc1fd25ca";
  const first = freshRecapCallId(base);
  const second = freshRecapCallId(base);
  assert.notEqual(first, base);
  assert.notEqual(first, second);
  assert.match(first, /^[A-Za-z0-9._:-]{1,128}$/);
});

test("maps you/other turns to agent/customer utterances", () => {
  const out = transcriptToUtterances([
    {
      id: "1",
      speaker: "You",
      kind: "you",
      text: "I will send the deck",
      startMs: 1000,
      endMs: 2500,
    },
    {
      id: "2",
      speaker: "Alex",
      kind: "other",
      text: "Thanks",
      startMs: 2600,
      endMs: 3200,
    },
  ]);
  assert.equal(out[0].speaker_role, "agent");
  assert.equal(out[1].speaker_role, "customer");
  assert.equal(out[0].offset_s, 1);
  assert.ok(out[0].duration_s >= 1.4);
});

test("folds user notes into the first utterance without a note_taker role", () => {
  const out = foldUserNotesIntoUtterances(
    [{ speaker_role: "customer", text: "Hello", offset_s: 0, duration_s: 1 }],
    "Follow up Friday",
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].speaker_role, "customer");
  assert.match(out[0].text, /Follow up Friday/);
  assert.match(out[0].text, /Hello/);
});

test("maps Recap record fields onto notes", () => {
  const notes = mapRecapToNotes({
    headline: "Q3 sync",
    record: {
      summary: "Covered launch timing",
      action_items: [{ task: "Send deck", owner: "You" }],
      takeaways: ["Ship Friday"],
      open_questions: ["Budget?"],
    },
  });
  assert.equal(notes.title, "Q3 sync");
  assert.equal(notes.executiveSummary, "Covered launch timing");
  assert.deepEqual(notes.takeaways, ["Ship Friday"]);
  assert.equal(notes.actions?.[0]?.text, "Send deck");
  assert.deepEqual(notes.openQuestions, ["Budget?"]);
});
