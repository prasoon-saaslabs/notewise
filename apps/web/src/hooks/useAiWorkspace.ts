import { useCallback, useEffect, useState } from "react";
import type { EntityRecord, NotesPayload } from "@notewise/api-client";
import { api } from "../lib/api";
import type { ProcessPhase } from "./useRecorder";
import {
  DEFAULT_MEETING_MODE_ID,
  FALLBACK_MEETING_MODES,
} from "../lib/meetingModes";
import { useRegeneratingOverlay } from "./useRegeneratingOverlay";

async function pollMeetingNotes(
  meetingId: string,
  onUpdate: (detail: {
    transcript?: Array<{
      id: string;
      speaker: string;
      kind: string;
      text: string;
    }>;
    notes?: NotesPayload | null;
  }) => void,
) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const detail = await api.getMeeting(meetingId);
    if (detail.status === "ready" || detail.status === "failed") {
      onUpdate(detail);
      return detail;
    }
  }
  throw new Error("Regeneration timed out — check Library");
}

export type AiWorkspaceOptions = {
  sessionLive: boolean;
  phase: ProcessPhase;
  hasNotes: boolean;
  meetingId?: string | null;
  sessionId?: string | null;
  userNotes?: string;
  onNotesUpdated?: (detail: {
    transcript?: Array<{
      id: string;
      speaker: string;
      kind: string;
      text: string;
    }>;
    notes?: NotesPayload | null;
  }) => void;
  onRegeneratingChange?: (active: boolean) => void;
};

export function useAiWorkspace({
  sessionLive,
  phase,
  hasNotes,
  meetingId,
  sessionId,
  userNotes,
  onNotesUpdated,
  onRegeneratingChange,
}: AiWorkspaceOptions) {
  const [modeId, setModeId] = useState(
    () => localStorage.getItem("og-mode-id") || DEFAULT_MEETING_MODE_ID,
  );
  const [modePending, setModePending] = useState(false);
  const showRegenOverlay = useRegeneratingOverlay(modePending);
  const [modeError, setModeError] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [entityId, setEntityId] = useState(
    () => localStorage.getItem("og-entity-id") || "",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const activeModeName =
    FALLBACK_MEETING_MODES.find((m) => m.id === modeId)?.name ?? modeId;

  const canRegenerate =
    Boolean(meetingId) && (phase === "ready" || hasNotes) && !sessionLive;

  useEffect(() => {
    onRegeneratingChange?.(showRegenOverlay);
  }, [showRegenOverlay, onRegeneratingChange]);

  useEffect(() => {
    void api
      .listEntities()
      .then(setEntities)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!meetingId) return;
    void api
      .getMeeting(meetingId)
      .then((m) => {
        if (m.modeId) {
          setModeId(m.modeId);
          localStorage.setItem("og-mode-id", m.modeId);
        }
      })
      .catch(() => undefined);
  }, [meetingId]);

  const handleModeChange = useCallback(
    async (nextModeId: string) => {
      if (nextModeId === modeId || modePending) return;
      setModeId(nextModeId);
      localStorage.setItem("og-mode-id", nextModeId);
      setModeError(null);

      try {
        if (sessionLive && sessionId) {
          await api.updateSessionMode(sessionId, nextModeId);
          return;
        }

        if (!meetingId) return;

        if (canRegenerate) {
          setModePending(true);
          await api.regenerateNotes(meetingId, {
            modeId: nextModeId,
            userNotes: userNotes ?? undefined,
          });
          await pollMeetingNotes(meetingId, (detail) => {
            onNotesUpdated?.(detail);
          });
          return;
        }

        await api.updateMeeting(meetingId, { modeId: nextModeId });
      } catch (err) {
        setModeError(
          err instanceof Error ? err.message : "Could not update meeting mode",
        );
      } finally {
        setModePending(false);
      }
    },
    [
      modeId,
      modePending,
      sessionLive,
      sessionId,
      meetingId,
      canRegenerate,
      userNotes,
      onNotesUpdated,
    ],
  );

  const selectEntity = useCallback((id: string) => {
    setEntityId(id);
    localStorage.setItem("og-entity-id", id);
  }, []);

  const clearEntity = useCallback(() => {
    setEntityId("");
    localStorage.removeItem("og-entity-id");
  }, []);

  const openCreateEntity = useCallback(() => {
    setCreateError(null);
    setCreateOpen(true);
  }, []);

  const closeCreateEntity = useCallback(() => {
    if (!createPending) setCreateOpen(false);
  }, [createPending]);

  const handleCreateEntity = useCallback(
    async (body: {
      name: string;
      kind: EntityRecord["kind"];
      company?: string | null;
    }) => {
      setCreatePending(true);
      setCreateError(null);
      try {
        const entity = await api.createEntity(body);
        setEntities((prev) =>
          [...prev.filter((e) => e.id !== entity.id), entity].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        selectEntity(entity.id);
        setCreateOpen(false);
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : "Could not create contact",
        );
      } finally {
        setCreatePending(false);
      }
    },
    [selectEntity],
  );

  return {
    modeId,
    modeError,
    showRegenOverlay,
    activeModeName,
    canRegenerate,
    handleModeChange,
    entities,
    entityId,
    selectEntity,
    clearEntity,
    createOpen,
    createPending,
    createError,
    openCreateEntity,
    closeCreateEntity,
    handleCreateEntity,
  };
}
