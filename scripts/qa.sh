#!/usr/bin/env bash
# Notewise end-to-end QA — exits non-zero on failure.
set -euo pipefail

API="${API:-http://127.0.0.1:3001}"
WORKER="${WORKER:-http://127.0.0.1:8001}"
PROXY="${PROXY:-http://127.0.0.1:5173/api}"

pass=0
fail=0
check() {
  local name="$1"; shift
  if "$@"; then
    echo "PASS  $name"
    pass=$((pass + 1))
  else
    echo "FAIL  $name"
    fail=$((fail + 1))
  fi
}

echo "== Notewise QA =="

check "api health" curl -sf "$API/health" >/dev/null
check "worker health" curl -sf "$WORKER/health" >/dev/null
check "vite proxy health" curl -sf "$PROXY/health" >/dev/null

WORKER_JSON=$(curl -sf "$WORKER/health")
echo "worker providers: $WORKER_JSON"
echo "$WORKER_JSON" | grep -q '"llm":"ollama"' || echo "WARN  llm is not ollama"
echo "$WORKER_JSON" | grep -q '"stt":"whisper_cli"\|"stt":"faster_whisper"\|"stt":"whisper"' \
  || echo "WARN  stt may still be stub"

# Speech sample via macOS say + ffmpeg
SPEECH_WAV="/tmp/nw-qa-speech.wav"
if command -v say >/dev/null && command -v ffmpeg >/dev/null; then
  say -o /tmp/nw-qa-speech.aiff "Let's ship the notes feature this week. I will own QA and follow up tomorrow."
  ffmpeg -y -i /tmp/nw-qa-speech.aiff -ar 16000 -ac 1 "$SPEECH_WAV" >/dev/null 2>&1
else
  echo "WARN  say/ffmpeg missing — using silence wav"
  ffmpeg -y -f lavfi -i anullsrc=r=16000:cl=mono -t 2 "$SPEECH_WAV" >/dev/null 2>&1
fi

# Direct worker STT + summarize
TX=$(curl -sf -X POST "$WORKER/jobs/transcribe" -H 'Content-Type: application/json' \
  -d "{\"audio_path\":\"$SPEECH_WAV\"}")
echo "transcribe: $TX"
check "transcribe returns segments" python3 -c "import json,sys; d=json.loads(sys.argv[1]); assert d.get('segments')" "$TX"
TEXT=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print(' '.join(s['text'] for s in d['segments']))" "$TX")
echo "transcript text: $TEXT"
check "transcript is not stub filename" python3 -c "import sys; t=sys.argv[1].lower(); assert 'transcribed (stub)' not in t and '.webm' not in t" "$TEXT"

NOTES=$(curl -sf -X POST "$WORKER/jobs/summarize" -H 'Content-Type: application/json' \
  -d "$(python3 -c "import json,sys; print(json.dumps({'transcript': sys.argv[1]}))" "You: $TEXT")")
echo "notes: $NOTES"
check "notes have executiveSummary" python3 -c "import json,sys; d=json.loads(sys.argv[1]); assert d.get('executiveSummary')" "$NOTES"
check "notes do not echo prompt" python3 -c "import json,sys; d=json.loads(sys.argv[1]); s=d.get('executiveSummary','').lower(); assert 'summarize this meeting transcript' not in s" "$NOTES"

# Full session path via API
CREATE=$(curl -sf -X POST "$API/sessions" -H 'Content-Type: application/json' \
  -d '{"source":"local","title":"QA Capture"}')
SID=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['sessionId'])" "$CREATE")
MID=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['meetingId'])" "$CREATE")
check "create session" test -n "$SID"

# Upload wav as audio file
UPLOAD=$(curl -sf -X POST "$API/sessions/$SID/chunks" \
  -F "file=@${SPEECH_WAV};filename=speech.wav;type=audio/wav" -F "sequence=0")
check "upload chunk" python3 -c "import json,sys; assert json.loads(sys.argv[1]).get('ok') is True" "$UPLOAD"

FIN=$(curl -sf -X POST "$API/sessions/$SID/finalize")
check "finalize session" python3 -c "import json,sys; assert 'meetingId' in json.loads(sys.argv[1])" "$FIN"

echo "waiting for meeting $MID to become ready…"
READY=0
for i in $(seq 1 90); do
  DETAIL=$(curl -sf "$API/meetings/$MID")
  STATUS=$(python3 -c "import json,sys; print(json.loads(sys.argv[1]).get('status'))" "$DETAIL")
  if [ "$STATUS" = "ready" ] || [ "$STATUS" = "failed" ]; then
    READY=1
    echo "status=$STATUS after ${i}s"
    echo "$DETAIL" | python3 -m json.tool | head -60
    break
  fi
  sleep 1
done
check "meeting reaches terminal status" test "$READY" -eq 1
check "meeting notes look sane" python3 -c "
import json,sys
d=json.loads(sys.argv[1])
assert d.get('status')=='ready'
notes=d.get('notes') or {}
s=(notes.get('executiveSummary') or '').lower()
assert 'summarize this meeting transcript' not in s
assert '.webm' not in s
assert notes.get('executiveSummary')
" "$DETAIL"

# Join bot path
JOIN=$(curl -sf -X POST "$API/bots/join" -H 'Content-Type: application/json' \
  -d '{"meetingUrl":"https://meet.google.com/aaa-bbbb-ccc","title":"QA Bot"}')
BID=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['meetingId'])" "$JOIN")
check "bot join" test -n "$BID"
sleep 4
BOT=$(curl -sf "$API/meetings/$BID")
check "bot meeting exists" python3 -c "import json,sys; assert json.loads(sys.argv[1]).get('id')" "$BOT"

# Enrollment + providers + list
check "enrollment status" curl -sf "$API/enrollment" >/dev/null
check "providers list" curl -sf "$API/providers" >/dev/null
check "meetings list" curl -sf "$API/meetings" >/dev/null

echo
echo "Result: $pass passed, $fail failed"
test "$fail" -eq 0
