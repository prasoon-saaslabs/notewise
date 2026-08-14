import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href?: string;
  external?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "glass" | "glass-muted" | "glass-dark" | "glass-dark-muted";
  size?: "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
};

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

const variants = {
  primary:
    "bg-teal text-white hover:bg-teal-hover hover:shadow-[0_8px_30px_rgba(13,148,136,0.35)]",
  secondary:
    "bg-paper-elevated text-ink border border-border hover:bg-teal-subtle hover:border-teal/30",
  ghost: "text-ink-secondary hover:text-teal hover:bg-teal-subtle",
  glass: "glass-btn hover:text-teal-hover",
  "glass-muted": "glass-btn-muted",
  "glass-dark": "glass-btn-dark focus-visible:ring-offset-dark-room",
  "glass-dark-muted": "glass-btn-dark-muted focus-visible:ring-offset-dark-room",
};

const sizes = {
  sm: "h-9 px-4 text-sm rounded-full",
  md: "h-11 px-6 text-sm rounded-full",
  lg: "h-12 px-7 text-base rounded-full",
};

export function Button({
  href = "#",
  external = false,
  variant = "primary",
  size = "md",
  className,
  children,
  onClick,
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }

  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
