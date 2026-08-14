import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

type Props = {
  src?: string | null;
  durationHintSec?: number;
  className?: string;
};

export function MeetingAudioPlayer({
  src,
  durationHintSec = 0,
  className = "",
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  const effectiveDuration =
    duration > 0 ? duration : durationHintSec > 0 ? durationHintSec : 0;
  const progressPct =
    effectiveDuration > 0
      ? Math.min(100, (current / effectiveDuration) * 100)
      : 0;

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setScrubbing(false);
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [src]);

  async function togglePlay() {
    const el = audioRef.current;
    if (!el || !src) return;
    if (el.paused) {
      try {
        await el.play();
      } catch (err) {
        console.error(err);
      }
    } else {
      el.pause();
    }
  }

  function seekTo(sec: number) {
    const el = audioRef.current;
    if (!el) return;
    const max = el.duration || effectiveDuration || sec;
    const next = Math.max(0, Math.min(sec, max));
    el.currentTime = next;
    setCurrent(next);
  }

  function handleSeekInput(value: number) {
    setCurrent(value);
    if (scrubbing) return;
    seekTo(value);
  }

  function finishScrub(value: number) {
    setScrubbing(false);
    seekTo(value);
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 shadow-[0_1px_0_rgb(15_23_42_/_0.04)] ${className}`}
    >
      <button
        type="button"
        className="nw-play-orb grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--nw-accent)] text-white disabled:opacity-40"
        aria-label={playing ? "Pause" : "Play"}
        disabled={!src}
        onClick={() => void togglePlay()}
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </button>

      <span
        className="w-9 shrink-0 font-mono text-[0.7rem] tabular-nums text-[var(--nw-ink-3)]"
        aria-hidden
      >
        {formatTime(current)}
      </span>

      <div className="relative min-w-0 flex-1 py-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-[var(--nw-surface-3)]"
          aria-hidden
        >
          <span
            className={`block h-full rounded-full bg-[linear-gradient(90deg,var(--nw-accent),#0ea5e9)] ${
              scrubbing ? "" : "nw-progress-fill"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <input
          type="range"
          className="nw-audio-seek relative z-[1] w-full"
          min={0}
          max={effectiveDuration || 100}
          step={0.1}
          value={Math.min(current, effectiveDuration || current)}
          disabled={!src || effectiveDuration <= 0}
          aria-label="Seek playback"
          aria-valuemin={0}
          aria-valuemax={effectiveDuration}
          aria-valuenow={current}
          aria-valuetext={`${formatTime(current)} of ${formatTime(effectiveDuration)}`}
          onPointerDown={() => setScrubbing(true)}
          onPointerUp={(e) => finishScrub(Number(e.currentTarget.value))}
          onPointerCancel={(e) => finishScrub(Number(e.currentTarget.value))}
          onChange={(e) => handleSeekInput(Number(e.target.value))}
          onKeyUp={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              seekTo(Number(e.currentTarget.value));
            }
          }}
        />
      </div>

      <span
        className="w-9 shrink-0 text-right font-mono text-[0.7rem] tabular-nums text-[var(--nw-ink-3)]"
        aria-hidden
      >
        {formatTime(effectiveDuration)}
      </span>

      {src ? (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onDurationChange={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onTimeUpdate={(e) => {
            if (scrubbing) return;
            setCurrent(e.currentTarget.currentTime || 0);
          }}
          onSeeked={(e) => setCurrent(e.currentTarget.currentTime || 0)}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
      ) : (
        <span
          className="nw-muted shrink-0 text-xs"
          title="Record a new meeting to enable playback"
        >
          No audio
        </span>
      )}
    </div>
  );
}
