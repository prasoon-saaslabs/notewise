"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { FAQ_ITEMS } from "@/lib/constants";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <Reveal className="text-center">
          <p className="text-sm font-medium text-teal">Questions</p>
          <h2 className="mt-3 font-display text-4xl leading-tight tracking-tight text-ink md:text-5xl">
            Before you clone the repo
          </h2>
        </Reveal>

        <ul className="mt-12 divide-y divide-border border-y border-border">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <li key={item.question}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 py-5 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-medium text-ink">{item.question}</span>
                  <ChevronDown
                    className={cn(
                      "mt-1 h-5 w-5 shrink-0 text-ink-muted transition-transform duration-300",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 text-sm leading-relaxed text-ink-secondary">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
