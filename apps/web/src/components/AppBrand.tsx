import { Sparkles } from "lucide-react";

type AppBrandProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
};

const SIZES = {
  sm: {
    mark: "h-9 w-9",
    icon: "h-4 w-4",
    title: "text-sm",
    tagline: "text-[0.62rem]",
  },
  md: {
    mark: "h-12 w-12",
    icon: "h-5 w-5",
    title: "text-xl",
    tagline: "text-xs",
  },
  lg: {
    mark: "h-16 w-16",
    icon: "h-7 w-7",
    title: "text-2xl",
    tagline: "text-sm",
  },
} as const;

export function AppBrand({
  size = "md",
  showTagline = true,
  className = "",
}: AppBrandProps) {
  const s = SIZES[size];
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <span
        className={`nw-brand-mark grid ${s.mark} place-items-center rounded-2xl shadow-[0_8px_24px_rgb(var(--nw-accent-rgb)_/_0.28)]`}
        aria-hidden
      >
        <Sparkles className={`${s.icon} text-white`} />
      </span>
      <h1
        className={`m-0 mt-4 font-bold tracking-tight text-[var(--nw-ink)] ${s.title}`}
      >
        Notewise
      </h1>
      {showTagline ? (
        <p
          className={`m-0 mt-1 font-medium text-[var(--nw-ink-3)] ${s.tagline}`}
        >
          AI meeting intelligence
        </p>
      ) : null}
    </div>
  );
}
