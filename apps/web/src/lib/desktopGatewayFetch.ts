/**
 * Desktop webview fetch to the loopback gateway via Tauri (bypasses WKWebView CORS).
 */
import { DESKTOP_API_BASE } from "./desktopMode";
import { isDesktopShell } from "../capture/desktopMiniWindow";
import { getAuthToken } from "./authSession";

type GatewayFetchArgs = {
  path: string;
  method?: string;
  body?: string | null;
  authToken?: string | null;
};

type UploadField = { name: string; value: string };

const UPLOAD_CHUNK_BYTES = 256 * 1024;

function resolveAuthToken(explicit: string | null, init?: RequestInit): string | null {
  if (explicit) return explicit;
  const header = init?.headers ? new Headers(init.headers).get("Authorization") : null;
  return header?.replace(/^Bearer\s+/i, "") ?? getAuthToken();
}

function gatewayError(status: number, body: string, fallback: string): Error {
  const detail = body.trim();
  if (detail) {
    try {
      const parsed = JSON.parse(detail) as { detail?: string; message?: string };
      const msg = parsed.detail ?? parsed.message;
      if (msg) return new Error(`${fallback} (${status}): ${msg}`);
    } catch {
      /* plain text */
    }
    return new Error(`${fallback} (${status}): ${detail.slice(0, 240)}`);
  }
  return new Error(`${fallback} (HTTP ${status})`);
}

async function uploadViaGateway(
  path: string,
  form: FormData,
  authToken: string | null,
): Promise<Response> {
  const fields: UploadField[] = [];
  let fileField = "file";
  let fileName = "upload.bin";
  let fileMime = "application/octet-stream";
  let fileBytes: Uint8Array | null = null;

  for (const [key, value] of form.entries()) {
    if (value instanceof Blob) {
      fileField = key;
      fileName = (value as File).name || fileName;
      fileMime = value.type || fileMime;
      fileBytes = new Uint8Array(await value.arrayBuffer());
    } else {
      fields.push({ name: key, value: String(value) });
    }
  }

  if (!fileBytes) {
    throw new Error("Upload form is missing a file");
  }

  const { invoke } = await import("@tauri-apps/api/core");
  const uploadId = crypto.randomUUID();
  await invoke("gateway_upload_begin", { uploadId });

  try {
    for (let offset = 0; offset < fileBytes.length; offset += UPLOAD_CHUNK_BYTES) {
      const chunk = fileBytes.subarray(offset, offset + UPLOAD_CHUNK_BYTES);
      let binary = "";
      for (let i = 0; i < chunk.length; i++) binary += String.fromCharCode(chunk[i]!);
      const chunkB64 = btoa(binary);
      await invoke("gateway_upload_append_b64", { uploadId, chunkB64 });
    }

    const result = await invoke<{ status: number; body: string }>("gateway_upload_finish", {
      uploadId,
      path,
      authToken,
      fields,
      fileField,
      fileName,
      fileMime,
    });

    if (result.status < 200 || result.status >= 300) {
      throw gatewayError(result.status, result.body, "Upload failed");
    }

    return new Response(result.body, {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    throw err instanceof Error ? err : new Error("Upload failed");
  }
}

export function isDesktopGatewayFetchAvailable(): boolean {
  return isDesktopShell();
}

export async function desktopGatewayFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;

  if (!url.startsWith(DESKTOP_API_BASE)) {
    return fetch(input, init);
  }

  const path = url.slice(DESKTOP_API_BASE.length) || "/";
  const method = (init?.method || "GET").toUpperCase();
  const authToken = resolveAuthToken(null, init);

  if (init?.body instanceof FormData) {
    return uploadViaGateway(path, init.body, authToken);
  }

  const body =
    init?.body != null
      ? typeof init.body === "string"
        ? init.body
        : await new Request(url, init).text()
      : null;

  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<{ status: number; body: string }>("gateway_fetch", {
    path,
    method,
    body,
    authToken,
  } satisfies GatewayFetchArgs);

  if (result.status < 200 || result.status >= 300) {
    throw gatewayError(result.status, result.body, "Gateway request failed");
  }

  return new Response(result.body, {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}
