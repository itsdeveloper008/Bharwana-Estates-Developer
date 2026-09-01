"use client";

import { ClipboardCheck, Compass, KeyRound, Route } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: Compass,
    title: "Browse & discover",
    description:
      "Direct-from-owner homes and Dealer-verified stock sit on one floor, so you compare with the same clarity.",
  },
  {
    icon: Route,
    title: "Choose your path",
    description:
      "Platform-Assisted keeps a Bharwana steward in the conversation; Direct-to-Seller opens a private line when you prefer it.",
  },
  {
    icon: ClipboardCheck,
    title: "Verified from the start",
    description:
      "Every listing enters a review queue before it publishes. Nothing reaches the floor unvetted.",
  },
  {
    icon: KeyRound,
    title: "Close with confidence",
    description:
      "Sales counsel supports Dealer listings; owner homes proceed with the measured pace of a private introduction.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-cream/60 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">The process</p>
          <h2 className="mt-3 font-serif text-4xl">How a home moves through Bharwana</h2>
          <div className="mt-4 h-px w-14 bg-gold/60" />
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            A quiet path from first look to keys. The same care whether you browse, inquire, or list.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, index) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.07, duration: 0.45 }}
              className="relative border border-forest/10 bg-ivory p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <step.icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
                <span className="font-serif text-2xl text-forest/15">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-5 font-serif text-xl text-forest">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
