"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Landmark, Scale, ShieldCheck, UserRound } from "lucide-react";
import { HeroSearch } from "@/components/properties/hero-search";
import { FeaturedGrid } from "@/components/properties/featured-grid";
import { Button } from "@/components/ui/button";

const reasons = [
  {
    icon: UserRound,
    title: "Direct from the owner",
    copy: "Private residences listed without a developer’s margin. You speak to the household that lives there.",
  },
  {
    icon: ShieldCheck,
    title: "Developer verified",
    copy: "Business inventory is checked for NOC, possession, and a named sales steward.",
  },
  {
    icon: Scale,
    title: "A single floor",
    copy: "Owner homes and project stock sit in one collection, so the comparison is honest.",
  },
  {
    icon: Landmark,
    title: "Quiet counsel",
    copy: "A sales desk that moves at the pace of a viewing, not a funnel.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative min-h-[92vh] overflow-hidden">
        <Image
          src="/hero.jpeg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/55 via-forest/45 to-forest/75" />
        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex w-full flex-col items-center"
          >
            <Image src="/logo.png" alt="Bharwana Estates Developer" width={92} height={92} className="h-[92px] w-[92px] object-contain" />
            <p className="mt-2 font-display text-sm tracking-crest text-gold">BHARWANA</p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl text-ivory sm:text-5xl sm:leading-[1.08]">
              Homes held with the gravity of a family name.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-ivory/75 sm:text-base">
              Direct-owner residences and developer-verified stock, presented as a brochure, not a marketplace stall.
            </p>
            <div className="mt-8 w-full">
              <HeroSearch />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Featured</p>
            <h2 className="mt-2 font-serif text-4xl">On the floor this season</h2>
          </div>
          <Button variant="outline" asChild>
            <Link href="/properties">All residences</Link>
          </Button>
        </div>
        <FeaturedGrid />
      </section>

      <section className="bg-forest py-20 text-ivory">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Why Bharwana</p>
          <h2 className="mt-3 max-w-xl font-serif text-4xl text-ivory">A calmer way to change houses.</h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((reason) => (
              <div key={reason.title}>
                <reason.icon className="h-6 w-6 text-gold" />
                <h3 className="mt-4 font-serif text-2xl text-ivory">{reason.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory/70">{reason.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
