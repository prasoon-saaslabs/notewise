import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MeetingBackend } from "@notewise/api-client";
import { clientForBackend } from "../../lib/meetingsCatalog";

export type UserNotesSaveHint = "idle" | "saving" | "saved" | "error";

type Options = {
  meetingId: string | null | undefined;
  backend: MeetingBackend;
  sourceValue: string;
  queryKey?: unknown[];
  debounceMs?: number;
  onSessionSync?: (value: string) => void;
  enabled?: boolean;
};

export function usePersistedUserNotes({
  meetingId,
  backend,
  sourceValue,
  queryKey,
  debounceMs = 600,
  onSessionSync,
  enabled = true,
}: Options) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [saveHint, setSaveHint] = useState<UserNotesSaveHint>("idle");
  const lastSavedRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    lastSavedRef.current = null;
    setSaveHint("idle");
    if (!meetingId) {
      initializedRef.current = false;
      setDraft("");
      return;
    }
    initializedRef.current = false;
  }, [meetingId]);

  useEffect(() => {
    if (!enabled || !meetingId || initializedRef.current) return;
    setDraft(sourceValue);
    lastSavedRef.current = sourceValue;
    initializedRef.current = true;
  }, [enabled, meetingId, sourceValue]);

  useEffect(() => {
    if (!enabled) return;
    if (!initializedRef.current) return;
    if (sourceValue === lastSavedRef.current) return;
    if (sourceValue === draft) return;
    setDraft(sourceValue);
    lastSavedRef.current = sourceValue;
  }, [enabled, sourceValue, draft]);

  const saveNotes = useMutation({
    mutationFn: (userNotes: string) => {
      if (!meetingId) return Promise.reject(new Error("Missing meeting id"));
      return clientForBackend(backend).updateMeeting(meetingId, { userNotes });
    },
    onMutate: () => setSaveHint("saving"),
    onSuccess: (_data, userNotes) => {
      lastSavedRef.current = userNotes;
      setSaveHint("saved");
      if (queryKey) {
        void qc.invalidateQueries({ queryKey });
      }
      void qc.invalidateQueries({ queryKey: ["meetings", "catalog"] });
    },
    onError: () => setSaveHint("error"),
  });

  const saveNotesRef = useRef(saveNotes.mutate);
  saveNotesRef.current = saveNotes.mutate;

  useEffect(() => {
    if (!enabled || !meetingId || !initializedRef.current) return;
    if (draft === lastSavedRef.current) return;

    const timer = window.setTimeout(() => {
      saveNotesRef.current(draft);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [draft, meetingId, debounceMs, enabled]);

  const handleChange = (value: string) => {
    setDraft(value);
    setSaveHint("idle");
    onSessionSync?.(value);
  };

  return {
    draft,
    saveHint,
    handleChange,
    setDraft,
    canPersist: Boolean(meetingId),
  };
}
