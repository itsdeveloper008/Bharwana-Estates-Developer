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
    image: "/why-01.png",
    alt: "A composed modern residence at dusk",
  },
  {
    n: "02",
    label: "Verified before the floor",
    title: "Verified properties",
    copy: "Important property details are reviewed before presentation.",
    annotation: "Every listing earns its place through careful review.",
    image: "/why-02.png",
    alt: "Architectural villa with garden light",
  },
  {
    n: "03",
    label: "Counsel without pressure",
    title: "A quieter process",
    copy: "Clear communication and thoughtful viewings without pressure.",
    annotation: "Viewings that move at the pace of a decision.",
    image: "/why-03.png",
    alt: "Calm interior light in a premium residence",
  },
] as const;

function VisionMissionSection() {
  return (
    <section className="border-t border-forest/5 bg-ivory py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="type-eyebrow">Who we are</p>
          <h2 className="mt-4 font-serif text-[2.25rem] leading-[1.12] text-[#082B1D] sm:text-4xl">
            Building trust, one address at a time.
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-10 sm:mt-16 lg:grid-cols-2 lg:gap-16">
          <motion.article
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5, ease }}
            className="border-t border-[#B89545]/50 pt-8"
          >
            <p className="type-eyebrow">Our vision</p>
            <h3 className="mt-4 font-serif text-2xl text-[#082B1D] sm:text-[1.75rem]">
              A house deserves a careful introduction.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-[#526057] sm:text-[15px] sm:leading-[1.75]">
              We see a market where buying or selling a home feels considered, never hurried, where
              direct-from-owner residences and Dealer-verified stock share one honest floor, and
              families compare with clarity rather than noise.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#526057] sm:text-[15px] sm:leading-[1.75]">
              Equal footing between buyer and owner is not a slogan. It is how every listing earns
              its place on the floor.
            </p>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5, delay: 0.08, ease }}
            className="border-t border-[#B89545]/50 pt-8"
          >
            <p className="type-eyebrow">Our mission</p>
            <h3 className="mt-4 font-serif text-2xl text-[#082B1D] sm:text-[1.75rem]">
              One floor. Honest introductions.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-[#526057] sm:text-[15px] sm:leading-[1.75]">
              Bharwana Estates Dealer exists to place private homes and Dealer-verified residences on
              a single, honest floor. We favour clarity over noise, so every conversation starts
              with the property, not the pitch.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#526057] sm:text-[15px] sm:leading-[1.75]">
              From Lahore to Islamabad and beyond, we offer quiet counsel: clear documents, measured
              site visits, and a presentation that respects the address itself.
            </p>
          </motion.article>
        </div>
      </div>
    </section>
  );
}

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
              className="type-eyebrow"
            >
              Why Bharwana
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, delay: 0.05, ease }}
              className="mt-5 font-serif text-[2.5rem] leading-[1.1] tracking-tight text-[#082B1D] sm:text-5xl lg:text-[4.5rem] lg:leading-[1.05]"
            >
              Homes deserve a more thoughtful introduction.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: 0.12, ease }}
              className="type-subheading max-w-[38rem]"
            >
              Property should feel considered, transparent, and personal. We bring homes, owners, and
              buyers together without unnecessary noise.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.2, ease }}
              className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#526057]"
            >
              <span>Private residences</span>
              <span className="text-gold-700" aria-hidden>
                ·
              </span>
              <span>Verified homes</span>
              <span className="text-gold-700" aria-hidden>
                ·
              </span>
              <span>Thoughtful service</span>
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
                className="group w-full rounded-2xl bg-transparent p-0 text-left outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#B89545]/40"
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
          <footer className="mt-5 type-eyebrow">
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
            <Image src="/logo.png" alt="Bharwana Estates Dealer" width={128} height={128} className="h-[128px] w-[128px] object-contain sm:h-[140px] sm:w-[140px]" />
            <h1 className="mt-5 max-w-3xl font-serif text-4xl text-ivory sm:text-5xl sm:leading-[1.08]">
              Homes held with the gravity of a family name.
            </h1>
            <p className="type-subheading-on-dark">
              Direct-owner residences and Dealer-verified stock, presented as a brochure, not a marketplace stall.
            </p>
            <div className="mt-8 w-full">
              <HeroSearch />
            </div>
          </motion.div>
        </div>
      </section>

      <FeaturedSection />

      <VisionMissionSection />

      <WhyBharwanaSection />
    </>
  );
}
