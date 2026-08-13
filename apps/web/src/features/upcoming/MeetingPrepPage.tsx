import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageMotion } from "../../components/PageMotion";
import { MeetingPrepContent } from "../../components/MeetingPrepContent";
import { useCaptureSession } from "../../capture/CaptureSessionContext";
import { setPendingCalendarEventId } from "../../lib/authSession";
import type { EventPrepDetail } from "@notewise/api-client";

export function MeetingPrepPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { start, setUserNotesDraft, recording, paused } = useCaptureSession();

  useEffect(() => {
    if (!eventId) navigate("/upcoming", { replace: true });
  }, [eventId, navigate]);

  if (!eventId) return null;

  const handleStartRecording = (prep: EventPrepDetail, manualNotes: string) => {
    setPendingCalendarEventId(prep.eventId);
    if (manualNotes.trim()) setUserNotesDraft(manualNotes);
    if (!recording && !paused) void start();
    navigate("/", { replace: true });
  };

  return (
    <PageMotion className="nw-page-surface h-full min-h-0 overflow-auto p-3 md:p-5">
      <div className="mx-auto w-full max-w-3xl">
        <MeetingPrepContent
          eventId={eventId}
          onStartRecording={handleStartRecording}
          showStartCta
        />
      </div>
    </PageMotion>
  );
}
