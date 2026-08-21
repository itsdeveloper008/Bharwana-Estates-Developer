"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-forest py-24 sm:py-28">
      <Image
        src="/logo.png"
        alt=""
        width={420}
        height={420}
        className="pointer-events-none absolute -right-16 top-1/2 h-[320px] w-[320px] -translate-y-1/2 object-contain opacity-[0.07] sm:h-[420px] sm:w-[420px]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
        >
          <Image
            src="/logo.png"
            alt="Bharwana Estates Developer"
            width={64}
            height={64}
            className="mx-auto h-16 w-16 object-contain"
            priority
          />
          <p className="mt-6 font-display text-sm tracking-crest text-gold">ABOUT US</p>
          <h1 className="mt-4 font-serif text-4xl text-ivory sm:text-5xl sm:leading-[1.1]">
            Building Trust, One Address at a Time
          </h1>
          <div className="mx-auto mt-6 h-px w-16 bg-gold/70" />
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-ivory/75 sm:text-base">
            Bharwana Estates Developer exists to place private homes and
            developer-verified residences on a single, honest floor. We favour
            clarity over noise, so every conversation starts with the property,
            not the pitch.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
