import { cn } from "@/lib/utils";

export function Highlight({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <mark
      className={cn(
        "rounded-sm bg-highlight px-1 py-0.5 text-inherit",
        className,
      )}
    >
      {children}
    </mark>
  );
}
