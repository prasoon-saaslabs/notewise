import { BrandIcon } from "@notewise/ui";

type AppBrandProps = {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  layout?: "stack" | "row";
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
  layout = "stack",
  className = "",
}: AppBrandProps) {
  const s = SIZES[size];
  const isRow = layout === "row";
  return (
    <div
      className={`flex ${
        isRow
          ? "flex-row items-center justify-center gap-3"
          : "flex-col items-center text-center"
      } ${className}`}
    >
      <BrandIcon
        size={s.mark}
        className="shrink-0 drop-shadow-[0_8px_24px_rgba(14,116,144,0.28)]"
      />
      <h1
        className={`m-0 font-bold tracking-tight text-[var(--nw-ink)] ${s.title} ${
          isRow ? "" : "mt-4"
        }`}
      >
        Notewise
      </h1>
      {showTagline ? (
        // <p
        //   className={`m-0 mt-1 font-medium text-[var(--nw-ink-3)] ${s.tagline}`}
        // >
        //   AI meeting intelligence
        // </p>
        <></>
      ) : null}
    </div>
  );
}
