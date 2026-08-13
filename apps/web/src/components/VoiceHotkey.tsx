import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { hearWsUrl, isPyaiBackend } from "../lib/backend";
import { acquireCaptureStream } from "../lib/audio";
import { connectHearStream, startHearCapture } from "../lib/hearCapture";

/**
 * Hold Alt+Space: Hear STT → retrieve → Cast (cascaded, not Omni).
 * Falls back to Web Speech if Hear is unavailable.
 */
export function VoiceHotkey() {
  const holding = useRef(false);
  const stopCapture = useRef<(() => Promise<string>) | null>(null);
  const [hud, setHud] = useState<string | null>(null);

  useEffect(() => {
    const startHear = async () => {
      setHud("Listening…");
      const stream = await acquireCaptureStream();
      const { sessionId, meetingId } = await api.createLocalSession("Voice ask");
      const finals: string[] = [];
      const client = connectHearStream(hearWsUrl(sessionId), {
        onPartial: (t) => setHud(t || "Listening…"),
        onFinal: (t) => {
          const cleaned = t.trim();
          if (!cleaned || finals[finals.length - 1] === cleaned) return;
          finals.push(cleaned);
          setHud(cleaned);
        },
        onError: (m) => setHud(m),
      });
      const capture = await startHearCapture(stream, (frame) => client.sendPcm(frame));
      stopCapture.current = async () => {
        capture.stop();
        client.commit();
        await new Promise((r) => setTimeout(r, 450));
        client.close();
        stream.getTracks().forEach((t) => t.stop());
        void api.deleteMeeting(meetingId).catch(() => undefined);
        return finals.join(" ").trim();
      };
    };

    const startBrowser = () => {
      const w = window as unknown as {
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        SpeechRecognition?: new () => SpeechRecognitionLike;
      };
      const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!Ctor) {
        setHud("Hold Alt+Space — speech recognition unavailable, type in Ask instead");
        return;
      }
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      let finalText = "";
      rec.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) finalText += t;
          else interim += t;
        }
        setHud(finalText || interim || "Listening…");
      };
      rec.onend = () => undefined;
      rec.start();
      stopCapture.current = async () => {
        rec.stop();
        return finalText.trim();
      };
      setHud("Listening…");
    };

    const down = (e: KeyboardEvent) => {
      if (!(e.altKey && e.code === "Space")) return;
      e.preventDefault();
      if (holding.current) return;
      holding.current = true;
      if (isPyaiBackend()) {
        void startHear().catch(() => startBrowser());
      } else {
        startBrowser();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== "Alt") return;
      if (!holding.current) return;
      holding.current = false;
      const stopper = stopCapture.current;
      stopCapture.current = null;
      void (async () => {
        const q = stopper ? await stopper() : "";
        if (!q) {
          setHud(null);
          return;
        }
        setHud("Retrieving…");
        try {
          const res = await api.voiceAsk(q);
          setHud(res.spoken || res.answer?.[0]?.text || "No evidence yet");
          if (res.audioBase64) {
            void new Audio(`data:audio/mpeg;base64,${res.audioBase64}`).play().catch(() => undefined);
          }
        } catch {
          setHud("Ask failed");
        }
        window.setTimeout(() => setHud(null), 8000);
      })();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  if (!hud) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[rgb(15_23_42_/_0.9)] px-4 py-2 text-sm text-white">
      {hud}
    </div>
  );
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
