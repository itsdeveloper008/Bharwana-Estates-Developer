"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export function FaqAccordion({
  items,
  className,
}: {
  items: FaqItem[];
  className?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className={cn("divide-y divide-forest/10 overflow-hidden rounded-2xl border border-forest/10", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : item.id)}
              className={cn(
                "flex w-full items-start justify-between gap-4 px-1 py-5 text-left transition-colors",
                open ? "text-forest" : "text-forest/90 hover:text-gold-700",
              )}
            >
              <span className="font-serif text-lg leading-snug sm:text-xl">{item.question}</span>
              <ChevronDown
                className={cn(
                  "mt-1 h-5 w-5 shrink-0 text-gold transition-transform duration-300",
                  open && "rotate-180",
                )}
              />
            </button>
            <motion.div
              initial={false}
              animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
