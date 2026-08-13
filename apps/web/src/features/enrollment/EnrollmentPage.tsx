import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@notewise/ui";
import { useNavigate } from "react-router-dom";
import { Mic, Sparkles } from "lucide-react";
import { api } from "../../lib/api";
import { createAudioRecorder } from "../../lib/audio";
import { AmbientBackdrop } from "../../components/AmbientBackdrop";
import { Waveform } from "../../components/Waveform";

export function EnrollmentPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const status = useQuery({
    queryKey: ["enrollment"],
    queryFn: () => api.getEnrollment(),
  });

  const enroll = useMutation({
    mutationFn: (blob: Blob) => api.enrollSample(blob),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["enrollment"] });
      navigate("/");
    },
    onError: (err: Error) => setError(err.message),
  });

  async function startSample() {
    if (busy || recording) return;
    setBusy(true);
    setError(null);
    chunksRef.current = [];
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone API unavailable in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = createAudioRecorder(stream);
      mediaRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size === 0) {
          setError("No audio captured — try again.");
          setBusy(false);
          return;
        }
        enroll.mutate(blob, {
          onSettled: () => setBusy(false),
        });
      };
      rec.start();
      setRecording(true);
      window.setTimeout(() => {
        if (mediaRef.current?.state === "recording") mediaRef.current.stop();
        setRecording(false);
      }, 4000);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied — allow access and try again."
          : err instanceof Error
            ? err.message
            : "Microphone permission required";
      setError(message);
      setBusy(false);
    }
  }

  return (
    <div className="nw-enroll relative grid min-h-full place-items-center overflow-hidden p-6">
      <AmbientBackdrop />
      <div className="nw-page-card nw-rise relative z-10 w-full max-w-md p-8 text-center">
        <div className="nw-brand-mark mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl shadow-[0_10px_24px_rgb(14_116_144_/_0.28)]">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <p className="m-0 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-4)]">
          Voice imprint
        </p>
        <h1 className="mb-2 mt-2 text-2xl font-bold tracking-tight text-[var(--nw-ink)] md:text-[1.85rem]">
          Make “You” unmistakable
        </h1>
        <p className="m-0 text-sm leading-relaxed text-[var(--nw-ink-3)]">
          A short sample helps label your voice after diarization on the Nest stack. On PyAI, use
          the check-in window instead.
        </p>

        <div className="relative my-7">
          {recording ? (
            <span
              className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgb(14_116_144_/_0.3)]"
              style={{ animation: "nw-pulse-ring 2s ease infinite" }}
            />
          ) : null}
          <Waveform active={recording} bars={16} />
        </div>

        <p className="mb-5 rounded-2xl border border-[var(--nw-border)] bg-[rgb(248_250_252)] px-4 py-3.5 text-sm italic leading-relaxed text-[var(--nw-ink-2)]">
          “Hi, I’m enrolling my voice with Notewise for clearer meeting notes.”
        </p>

        {error ? (
          <p className="mb-3 text-xs text-[var(--nw-danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <p className="mb-4 text-xs text-[var(--nw-ink-4)]">
          Samples: {status.data?.samples ?? 0}
          {status.data?.enrolled ? " · enrolled" : ""}
        </p>

        <Button
          className="mb-2 w-full !rounded-xl"
          disabled={recording || busy || enroll.isPending}
          onClick={() => void startSample()}
        >
          <Mic className="h-4 w-4" />
          {recording ? "Listening…" : enroll.isPending || busy ? "Saving…" : "Record 4s sample"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => navigate("/")}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
