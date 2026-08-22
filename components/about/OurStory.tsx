"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { StatsCounter } from "@/components/about/StatsCounter";
import { companyStats } from "@/lib/mock-data/team";

export function OurStory() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Our story</p>
          <h2 className="mt-3 font-serif text-4xl">A house deserves a careful introduction.</h2>
          <div className="mt-4 h-px w-14 bg-gold/60" />
          <p className="mt-6 text-sm leading-relaxed text-forest/80 sm:text-base">
            Bharwana Estates Dealer was founded on the principle that buying
            or selling a home should feel considered, never hurried. We bring
            direct-from-owner residences and Dealer-verified stock onto one
            floor, so families can compare with honesty and speak with people
            who know the street as well as the spreadsheet.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-forest/80 sm:text-base">
            From Lahore to Islamabad and beyond, our work is quiet counsel:
            clear documents, measured site visits, and a presentation that
            respects the address itself.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative aspect-[4/5] overflow-hidden bg-cream sm:aspect-[5/4] lg:aspect-[4/5]"
        >
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80"
            alt="A composed residence reflecting Bharwana’s presentation standards"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </motion.div>
      </div>

      <StatsCounter stats={companyStats} />
    </section>
  );
}
