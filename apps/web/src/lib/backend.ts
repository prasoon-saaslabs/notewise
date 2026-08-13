/**
 * Backend selection for Notewise web.
 * - env `VITE_API_URL` / Vite proxy (build-time)
 * - optional runtime override via localStorage `notewise.apiBase` (Settings)
 *
 * Important: choosing base `/api` does NOT change Vite's proxy target.
 * That is fixed at Vite startup by `VITE_PROXY_TARGET` (default :3001).
 * The app origin (e.g. http://127.0.0.1:5173) never changes.
 */

const STORAGE_KEY = "notewise.apiBase";
const KIND_KEY = "notewise.backendKind";

export type BackendKind = "nest" | "pyai" | "unknown";

export function getStoredApiBase(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredApiBase(url: string | null, kind?: BackendKind) {
  try {
    if (!url) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(KIND_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
      if (kind && kind !== "unknown") localStorage.setItem(KIND_KEY, kind);
    }
  } catch {
    /* ignore */
  }
}

export function getStoredBackendKind(): BackendKind | null {
  try {
    const k = localStorage.getItem(KIND_KEY);
    if (k === "pyai" || k === "nest") return k;
    return null;
  } catch {
    return null;
  }
}

/** Vite proxy target for `/api` (build-time). Does not change at runtime. */
export function viteProxyTarget(): string {
  return String(import.meta.env.VITE_PROXY_TARGET || "http://127.0.0.1:3001").replace(
    /\/$/,
    "",
  );
}

/** Resolve effective API base (no trailing slash). */
export function resolveApiBase(): string {
  if (typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)) {
    return "http://127.0.0.1:3002";
  }
  const stored = getStoredApiBase();
  if (stored) return stored.replace(/\/$/, "");
  const env = import.meta.env.VITE_API_URL;
  if (env) return String(env).replace(/\/$/, "");
  return "/api";
}

function kindFromUrl(url: string): BackendKind {
  if (/:3002\b/.test(url) || /pyai/i.test(url)) return "pyai";
  if (/:3001\b/.test(url)) return "nest";
  return "unknown";
}

/**
 * Which AI stack the Record UI should use.
 * For `/api`, kind follows the Vite proxy target (not a misleading "nest" label).
 */
export function detectBackendKind(base?: string): BackendKind {
  const resolved = base ?? resolveApiBase();

  if (resolved === "/api" || resolved.endsWith("/api")) {
    const fromProxy = kindFromUrl(viteProxyTarget());
    if (fromProxy !== "unknown") return fromProxy;
  }

  const fromBase = kindFromUrl(resolved);
  if (fromBase !== "unknown") return fromBase;

  const stored = getStoredBackendKind();
  if (stored) return stored;

  return "unknown";
}

/** Infer kind from a live /providers or /health payload (most accurate). */
export function kindFromProviders(
  providers?: Record<string, string> | null,
  healthApi?: string | null,
): BackendKind | null {
  if (providers?.backend === "pyai-gateway" || providers?.stt === "pyai-hear") return "pyai";
  if (healthApi === "pyai-gateway") return "pyai";
  if (providers?.stt === "whisper_cli" || providers?.llm === "ollama") return "nest";
  if (healthApi === "ok" || healthApi === "nest") return "nest";
  return null;
}

export function isPyaiBackend(base?: string): boolean {
  return detectBackendKind(base ?? resolveApiBase()) === "pyai";
}

/** WebSocket URL for Hear proxy on pyai-gateway. */
export function hearWsUrl(sessionId: string, apiBase = resolveApiBase()): string {
  let httpBase = apiBase;
  if (httpBase.startsWith("/")) {
    httpBase = `${window.location.origin}${httpBase}`;
  }
  const u = new URL(httpBase);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  const path = u.pathname.replace(/\/$/, "");
  u.pathname = `${path}/sessions/${encodeURIComponent(sessionId)}/hear`;
  u.search = "";
  u.hash = "";
  return u.toString();
}
