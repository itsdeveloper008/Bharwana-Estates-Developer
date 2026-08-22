"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function AboutCTA() {
  return (
    <section className="border-t border-forest/10 bg-forest py-16 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-3xl px-4 text-center sm:px-6"
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Next step</p>
        <h2 className="mt-3 font-serif text-3xl text-ivory sm:text-4xl">
          Looking to list your property?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-ivory/70">
          Browse the collection, or place a residence on the floor. We keep the
          introduction as careful as the home itself.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login?returnTo=%2Fowner%2Fadd-property">List a property</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-ivory/30 bg-transparent text-ivory hover:bg-ivory hover:text-forest"
          >
            <Link href="/properties">View residences</Link>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
