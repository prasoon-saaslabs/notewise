import { useNavigate } from "react-router-dom";
import type { CalendarEventPrep } from "@notewise/api-client";
import { useCaptureSession } from "../capture/CaptureSessionContext";
import { useAuth } from "../auth/AuthContext";
import { MeetingFlowModal } from "./MeetingFlowModal";
import { useCalendarFlow } from "../hooks/useCalendarFlow";
import { setPendingCalendarEventId } from "../lib/authSession";

export function CalendarFlowHost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { modal, dismissModal, prepareCapture } = useCalendarFlow(Boolean(user?.calendarConnected));
  const { start, setUserNotesDraft, recording, paused } = useCaptureSession();

  const handleStart = (event: CalendarEventPrep, manualNotes: string) => {
    prepareCapture(event.id);
    setPendingCalendarEventId(event.id);
    if (manualNotes.trim()) setUserNotesDraft(manualNotes);
    if (!recording && !paused) void start();
  };

  const handleOpenPrep = (event: CalendarEventPrep, manualNotes: string) => {
    if (manualNotes.trim()) setUserNotesDraft(manualNotes);
    navigate(`/upcoming/${event.id}`);
  };

  return (
    <MeetingFlowModal
      modal={modal}
      onClose={dismissModal}
      onStartCapture={handleStart}
      onOpenPrep={handleOpenPrep}
    />
  );
}
