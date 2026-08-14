import { Injectable, Logger } from "@nestjs/common";
import type { NotesPayload, TranscriptTurn } from "../store/data.store";
import {
  foldUserNotesIntoUtterances,
  freshRecapCallId,
  mapRecapToNotes,
  transcriptToUtterances,
} from "./recap.mapper";

const CALL_ID_RE = /^[A-Za-z0-9._:-]{1,128}$/;

@Injectable()
export class RecapClient {
  private readonly logger = new Logger(RecapClient.name);
  private readonly apiKey = (process.env.PYAI_API_KEY ?? "").trim();
  private readonly baseUrl = (
    process.env.PYAI_BASE_URL ?? "https://api.pyai.com/v1"
  ).replace(/\/$/, "");
  private readonly packId = process.env.PYAI_RECAP_PACK_ID ?? "sales_outbound";
  private configEnsured = false;

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async summarizeMeeting(input: {
    callId: string;
    title?: string;
    turns: TranscriptTurn[];
    userNotes?: string;
  }): Promise<NotesPayload> {
    if (!this.isConfigured()) {
      throw new Error("PYAI_API_KEY is not set");
    }
    if (!CALL_ID_RE.test(input.callId)) {
      throw new Error("Invalid Recap call id");
    }
    const utterances = foldUserNotesIntoUtterances(
      transcriptToUtterances(input.turns),
      input.userNotes,
    );
    if (utterances.length === 0) {
      throw new Error("No transcript utterances for Recap");
    }
    await this.ensureConfig();
    const payload: Record<string, unknown> = {
      call_direction: "inbound",
      pack_id: this.packId,
      utterances,
    };
    if (input.title?.trim()) payload.customer_name = input.title.trim();
    let postedId = freshRecapCallId(input.callId);
    try {
      await this.request("POST", `/recap/calls/${postedId}`, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (!message.includes("409")) throw err;
      postedId = freshRecapCallId(input.callId);
      this.logger.warn(`Recap 409, retrying as new call id`);
      await this.request("POST", `/recap/calls/${postedId}`, payload);
    }
    return mapRecapToNotes(await this.waitForRecap(postedId));
  }

  private async ensureConfig(): Promise<void> {
    if (this.configEnsured) return;
    try {
      await this.request("PUT", "/recap/config", {
        enabled: true,
        default_pack_id: this.packId,
      });
      this.configEnsured = true;
    } catch (err) {
      this.logger.warn(
        `Recap config update skipped: ${err instanceof Error ? err.message : "error"}`,
      );
    }
  }

  private async waitForRecap(
    callId: string,
    timeoutMs = 300_000,
    intervalMs = 2_000,
  ): Promise<Record<string, unknown>> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const recap = await this.request("GET", `/recap/calls/${callId}`);
      const status =
        typeof recap.status === "string" ? recap.status.toLowerCase() : "";
      if (status === "complete" || status === "completed") return recap;
      if (status === "failed" || status === "error") {
        throw new Error(`Recap failed for call ${callId}`);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Recap timed out for call ${callId}`);
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      this.logger.warn(`PyAI ${method} ${path} failed: ${res.status}`);
      throw new Error(`PyAI Recap error ${res.status}: ${text.slice(0, 200)}`);
    }
    if (res.status === 204) return {};
    return (await res.json()) as Record<string, unknown>;
  }
}
