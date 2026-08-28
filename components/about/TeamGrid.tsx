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
            Leadership, design, and craft behind every introduction — open a profile for the full
            story.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/team">View all profiles →</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="mt-12 overflow-hidden bg-forest"
        >
          <div className="mx-auto max-w-3xl px-6 py-12 text-center sm:px-10 sm:py-14">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-[11px] uppercase tracking-[0.22em] text-gold"
            >
              The floor
            </motion.p>
            <motion.h3
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.22 }}
              className="mt-3 font-serif text-2xl text-ivory sm:text-3xl"
            >
              Meet the people who introduce every address.
            </motion.h3>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.3 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button asChild size="lg">
                <Link href="/team">Enter the team</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-ivory/30 bg-transparent text-ivory hover:bg-ivory hover:text-forest"
              >
                <Link href="/owner/add-property">List a property</Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
