import { clsx } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "record" | "glass" | "glass-muted";

const variantClass: Record<Variant, string> = {
  primary: "nw-btn--primary",
  secondary: "nw-btn--secondary",
  ghost: "nw-btn--ghost",
  danger: "nw-btn--danger",
  record: "nw-btn--record",
  glass: "nw-btn--primary",
  "glass-muted": "nw-btn--secondary",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "nw-btn",
        variantClass[variant],
        size === "sm" && "nw-btn--sm",
        size === "lg" && "nw-btn--lg",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
