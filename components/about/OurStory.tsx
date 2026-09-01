"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { StatsCounter } from "@/components/about/StatsCounter";
import { companyStats } from "@/lib/mock-data/team";

export function OurStory() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
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
            Bharwana Estates Dealer was founded on the principle that buying or selling a home
            should feel considered, never hurried. We bring direct-from-owner residences and
            Dealer-verified stock onto one floor, so families can compare with honesty and speak
            with people who know the street as well as the spreadsheet.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-forest/80 sm:text-base">
            From Lahore to Islamabad and beyond, our work is quiet counsel: clear documents,
            measured site visits, and a presentation that respects the address itself.
          </p>
          <blockquote className="mt-8 border-l border-gold/50 pl-5">
            <p className="font-serif text-xl italic leading-snug text-forest sm:text-2xl">
              “Equal footing between buyer and owner is not a slogan. It is how every listing
              earns the floor.”
            </p>
            <footer className="mt-3 text-[11px] uppercase tracking-[0.18em] text-gold-700">
              Falak Sher · Chief Executive Officer
            </footer>
          </blockquote>
          <p className="mt-8 text-sm leading-relaxed text-forest/80 sm:text-base">
            In practice, that means every submission is reviewed before it publishes, Direct-Owner
            and Dealer-Verified badges stay visible so buyers know who stands behind a home, and
            each inquiry offers a clear choice: Platform-Assisted stewardship or a Direct-to-Seller
            conversation when both parties prefer it.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative aspect-[4/3] overflow-hidden bg-cream shadow-[0_20px_50px_-28px_rgba(15,46,29,0.28)] sm:aspect-[5/4] lg:aspect-[4/3]"
        >
          <Image
            src="/about.jpg"
            alt="Bharwana Estates, about us"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </motion.div>
      </div>

      <StatsCounter stats={companyStats} />
    </section>
  );
}
