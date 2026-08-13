import type { ReactNode } from "react";

export function PageMotion({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`nw-rise h-full min-h-0 ${className}`}>{children}</div>;
}
