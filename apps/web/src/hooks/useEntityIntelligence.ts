import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const RELATIONSHIP_PROMPT =
  "In 3-4 concise bullets, summarize my relationship intelligence for this contact: what we have discussed, what they care about, open follow-ups, and how to approach the next conversation. Be specific and cite patterns from past meetings.";

const NETWORK_PROMPT =
  "In 3 bullets, summarize the most important relationship intelligence across my network: who needs follow-up, recurring themes, and risks I should not forget. Be concise.";

export function useEntityBrief(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity-brief", entityId],
    queryFn: () => api.getBrief(entityId!),
    enabled: Boolean(entityId),
    staleTime: 60_000,
  });
}

export function useEntityDetail(entityId: string | undefined) {
  return useQuery({
    queryKey: ["entity", entityId],
    queryFn: () => api.getEntity(entityId!),
    enabled: Boolean(entityId),
  });
}

export function useEntityNarrative(entityId: string | undefined, meetingCount = 0) {
  return useQuery({
    queryKey: ["entity-narrative", entityId],
    queryFn: () => api.ask(RELATIONSHIP_PROMPT, entityId),
    enabled: Boolean(entityId) && meetingCount > 0,
    staleTime: 5 * 60_000,
  });
}

export function useNetworkPulse(entityCount: number) {
  return useQuery({
    queryKey: ["network-pulse", entityCount],
    queryFn: () => api.ask(NETWORK_PROMPT),
    enabled: entityCount > 0,
    staleTime: 5 * 60_000,
  });
}
