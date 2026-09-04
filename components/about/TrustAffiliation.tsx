"use client";

import { motion } from "framer-motion";

export function TrustAffiliation() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="type-eyebrow">Affiliation</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Part of Bharwana Estate Group</h2>
            <div className="mt-4 h-px w-14 bg-gold/60" />
            <p className="mt-5 max-w-md text-sm leading-relaxed text-forest/80 sm:text-base">
              Bharwana Estates Dealer stands within the Bharwana Estate Group, a backing that
              favours continuity, measured growth, and introductions that outlast a single
              transaction.
            </p>
            <a
              href="https://bharwanaestates.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block type-eyebrow transition-colors hover:text-forest"
            >
              Visit the Group →
            </a>
          </motion.div>

          <motion.blockquote
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="border-l border-gold/50 pl-8 sm:pl-10"
          >
            <p className="font-serif text-2xl italic leading-snug text-forest sm:text-3xl sm:leading-snug">
              Our promise is simple: every residence earns its place, every conversation keeps its
              dignity, and every key is passed with quiet care.
            </p>
            <footer className="mt-6 type-eyebrow">
              Our commitment
            </footer>
          </motion.blockquote>
        </div>
      </div>
    </section>
  );
}
