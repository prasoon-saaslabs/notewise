import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarEventPrep } from "@notewise/api-client";
import { api } from "../lib/api";
import { getPendingCalendarEventId, setPendingCalendarEventId } from "../lib/authSession";

export type CalendarFlowModal =
  | { kind: "reminder"; event: CalendarEventPrep }
  | { kind: "start"; event: CalendarEventPrep }
  | null;

export function useCalendarFlow(enabled: boolean) {
  const [modal, setModal] = useState<CalendarFlowModal>(null);
  const seenRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const { reminders, starts } = await api.pendingCalendarReminders();
      for (const ev of reminders) {
        const key = `r:${ev.id}`;
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        setModal({ kind: "reminder", event: ev });
        return;
      }
      for (const ev of starts) {
        const key = `s:${ev.id}`;
        if (seenRef.current.has(key)) continue;
        seenRef.current.add(key);
        setModal({ kind: "start", event: ev });
        return;
      }
    } catch {
      /* ignore when offline or guest */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void poll();
    const id = window.setInterval(() => void poll(), 30_000);
    return () => window.clearInterval(id);
  }, [enabled, poll]);

  const dismissModal = useCallback(() => setModal(null), []);

  const prepareCapture = useCallback((eventId: string) => {
    setPendingCalendarEventId(eventId);
  }, []);

  const clearPendingCapture = useCallback(() => {
    setPendingCalendarEventId(null);
  }, []);

  return {
    modal,
    dismissModal,
    prepareCapture,
    clearPendingCapture,
    pendingEventId: getPendingCalendarEventId(),
  };
}
