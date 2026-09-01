"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function TeamGrid() {
  return (
    <section className="bg-cream/50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold-700">Our people</p>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl">Meet the Team</h2>
          <div className="mx-auto mt-5 h-px w-16 bg-gold/60" />
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Leadership, design, and craft behind every introduction. Open a profile for the full
            story.
          </p>
          <Button asChild variant="outline" className="mt-6 rounded-full">
            <Link href="/team">View all profiles →</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
