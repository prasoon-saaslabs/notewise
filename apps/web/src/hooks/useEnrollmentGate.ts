import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

const SKIP_KEY = "notewise.skipEnrollment";

export function useEnrollmentGate() {
  const q = useQuery({
    queryKey: ["enrollment"],
    queryFn: () => api.getEnrollment(),
  });

  const skipped =
    typeof localStorage !== "undefined" && localStorage.getItem(SKIP_KEY) === "1";

  return {
    loading: q.isLoading,
    needsEnrollment: !skipped && Boolean(q.data) && !q.data?.enrolled,
    enrollment: q.data,
    skip() {
      localStorage.setItem(SKIP_KEY, "1");
      window.location.href = "/";
    },
  };
}

export function clearEnrollmentSkip() {
  localStorage.removeItem(SKIP_KEY);
}
