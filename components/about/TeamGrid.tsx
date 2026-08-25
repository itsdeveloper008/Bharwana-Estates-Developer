"use client";

import Image from "next/image";
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
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mt-12"
        >
          <Link
            href="/team"
            className="group relative block aspect-[21/9] min-h-[220px] overflow-hidden bg-forest sm:min-h-[280px]"
          >
            <Image
              src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80"
              alt="The Bharwana team floor"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/85 via-forest/35 to-forest/10" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <p className="text-[11px] uppercase tracking-[0.22em] text-gold">The floor</p>
              <p className="mt-2 max-w-md font-serif text-2xl text-ivory sm:text-3xl">
                Meet the people who introduce every address.
              </p>
              <span className="mt-4 inline-block text-[11px] uppercase tracking-[0.18em] text-gold transition-colors group-hover:text-ivory">
                Enter the team →
              </span>
            </div>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
