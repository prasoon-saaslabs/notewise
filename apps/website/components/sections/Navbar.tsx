"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NAV_LINKS } from "@/lib/constants";
import { GITHUB_URL } from "@/lib/siteConfig";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 md:px-6"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
    >
      <nav
        className={cn(
          "glass-panel flex w-full max-w-5xl items-center gap-5 rounded-full px-5 py-3 transition-all duration-300 md:gap-6 md:px-6",
          scrolled && "glass-panel-scrolled",
        )}
        aria-label="Main navigation"
      >
        <Link href="/" className="inline-flex shrink-0 items-center transition-opacity hover:opacity-90">
          <Logo
            markSize={36}
            className="gap-3.5"
            wordmarkClassName="font-display text-lg font-semibold"
          />
        </Link>

        <div className="hidden items-center gap-8 md:ml-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors",
                pathname === link.href
                  ? "font-medium text-teal"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Button href={GITHUB_URL} size="sm" variant="glass-muted" external>
            GitHub
          </Button>
          <Button href="/download" size="sm" variant="glass">
            Get started
          </Button>
        </div>
      </nav>
    </motion.header>
  );
}
