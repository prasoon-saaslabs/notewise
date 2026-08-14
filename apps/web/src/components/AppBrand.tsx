import { BrandIcon } from "@notewise/ui";

type AppBrandProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
};

const SIZES = {
  sm: {
    mark: 36,
    title: "text-sm",
    tagline: "text-[0.62rem]",
  },
  md: {
    mark: 48,
    title: "text-xl",
    tagline: "text-xs",
  },
  lg: {
    mark: 64,
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
      <BrandIcon
        size={s.mark}
        className="drop-shadow-[0_8px_24px_rgba(14,116,144,0.28)]"
      />
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
