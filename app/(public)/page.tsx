"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HeroSearch } from "@/components/properties/hero-search";
import { FeaturedSection } from "@/components/properties/featured-grid";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

const principles = [
  {
    n: "01",
    label: "Direct from the owner",
    title: "Direct ownership",
    copy: "Homes presented by the people who know them best.",
    annotation: "Speak directly with the household behind the home.",
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    alt: "A composed modern residence at dusk",
  },
  {
    n: "02",
    label: "Verified before the floor",
    title: "Verified properties",
    copy: "Important property details are reviewed before presentation.",
    annotation: "Every listing earns its place through careful review.",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
    alt: "Architectural villa with garden light",
  },
  {
    n: "03",
    label: "Counsel without pressure",
    title: "A quieter process",
    copy: "Clear communication and thoughtful viewings without pressure.",
    annotation: "Viewings that move at the pace of a decision.",
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=80",
    alt: "Calm interior light in a premium residence",
  },
] as const;

function WhyBharwanaSection() {
  const [active, setActive] = useState(0);
  const current = principles[active]!;

  return (
    <section className="relative overflow-hidden bg-[#F7F3EA] text-[#082B1D]">
      <div className="mx-auto max-w-[1280px] px-5 pb-24 pt-28 sm:px-8 sm:pb-28 sm:pt-32 lg:px-12">
        {/* Intro + photography — asymmetric */}
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] lg:gap-14 xl:gap-20">
          <div className="relative z-10 max-w-[32rem] lg:pt-10">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.55, ease }}
              className="text-[11px] uppercase tracking-[0.26em] text-[#B89545]"
            >
              Why Bharwana
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, delay: 0.05, ease }}
              className="mt-5 font-serif text-[2.5rem] font-normal leading-[1.1] tracking-tight text-[#082B1D] sm:text-5xl lg:text-[4.5rem] lg:leading-[1.05]"
            >
              Homes deserve a more thoughtful introduction.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: 0.12, ease }}
              className="mt-6 max-w-[24rem] text-[15px] leading-[1.75] text-[#526057]"
            >
              Property should feel considered, transparent, and personal. We bring homes, owners, and
              buyers together without unnecessary noise.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.2, ease }}
              className="mt-8 text-[10px] uppercase tracking-[0.2em] text-[#082B1D]/40"
            >
              Private residences · Verified homes · Thoughtful service
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, delay: 0.08, ease }}
            className="relative lg:-mt-4"
          >
            <div className="group relative h-[380px] overflow-hidden rounded-[3px] sm:h-[460px] lg:h-[600px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.image}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={current.image}
                    alt={current.alt}
                    fill
                    className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.015]"
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    priority={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Photo caption — no border */}
            <aside className="relative z-10 mx-3 -mt-12 max-w-[13.5rem] bg-[#FAF8F2] px-5 py-4 shadow-[0_14px_40px_rgba(8,43,29,0.1)] sm:absolute sm:bottom-8 sm:left-6 sm:mx-0 sm:mt-0 sm:max-w-[14rem]">
              <p className="font-serif text-xl leading-none text-[#B89545]">{current.n}</p>
              <p className="mt-2.5 text-[10px] uppercase tracking-[0.18em] text-[#082B1D]/55">
                {current.label}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#526057]">{current.annotation}</p>
            </aside>
          </motion.div>
        </div>

        {/* Principles — whitespace only, no lines/boxes */}
        <div className="mt-20 grid gap-12 sm:mt-24 sm:grid-cols-3 sm:gap-10 lg:gap-16">
          {principles.map((item, index) => {
            const isActive = active === index;
            return (
              <motion.button
                key={item.n}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease }}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                className="group w-full rounded-sm bg-transparent p-0 text-left outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#B89545]/40"
              >
                <span
                  className={cn(
                    "font-serif text-[1.35rem] leading-none transition-colors duration-300",
                    isActive ? "text-[#B89545]" : "text-[#B89545]/70 group-hover:text-[#B89545]",
                  )}
                >
                  {item.n}
                </span>
                <h3
                  className={cn(
                    "mt-3 font-serif text-[1.4rem] text-[#082B1D] transition-transform duration-300 sm:text-[1.55rem]",
                    isActive && "translate-x-[3px]",
                    "group-hover:translate-x-[3px]",
                  )}
                >
                  {item.title}
                </h3>
                <p
                  className={cn(
                    "mt-2.5 max-w-[16rem] text-sm leading-relaxed transition-opacity duration-300",
                    isActive ? "text-[#526057] opacity-100" : "text-[#526057]/80 group-hover:opacity-100",
                  )}
                >
                  {item.copy}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* Quote — whitespace separation only */}
        <motion.blockquote
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.65, ease }}
          className="mx-auto mt-20 max-w-2xl text-center sm:mt-24"
        >
          <p className="font-serif text-[1.75rem] italic font-normal leading-[1.3] text-[#082B1D] sm:text-[2.35rem] sm:leading-[1.28]">
            “A house deserves a careful introduction.”
          </p>
          <footer className="mt-5 text-[10px] uppercase tracking-[0.28em] text-[#B89545]">
            Bharwana Estates
          </footer>
        </motion.blockquote>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="relative w-full min-h-svh overflow-hidden -mt-[88px] md:-mt-[96px]">
        <Image
          src="/hero.jpeg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/55 via-forest/45 to-forest/75" />
        <div className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center px-4 pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex w-full flex-col items-center"
          >
            <Image src="/logo.png" alt="Bharwana Estates Dealer" width={92} height={92} className="h-[92px] w-[92px] object-contain" />
            <p className="mt-2 font-display text-sm tracking-crest text-gold">BHARWANA</p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl text-ivory sm:text-5xl sm:leading-[1.08]">
              Homes held with the gravity of a family name.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-ivory/75 sm:text-base">
              Direct-owner residences and Dealer-verified stock, presented as a brochure, not a marketplace stall.
            </p>
            <div className="mt-8 w-full">
              <HeroSearch />
            </div>
          </motion.div>
        </div>
      </section>

      <FeaturedSection />

      <WhyBharwanaSection />
    </>
  );
}
