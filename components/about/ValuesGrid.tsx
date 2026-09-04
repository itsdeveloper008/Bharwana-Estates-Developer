"use client";

import { Handshake, MapPinned, ShieldCheck, Users } from "lucide-react";
import { motion } from "framer-motion";

const values = [
  {
    icon: ShieldCheck,
    title: "Trust & Transparency",
    description:
      "Clear titles, open pricing, and no theatre. What you see on the floor is what we stand behind.",
  },
  {
    icon: MapPinned,
    title: "Local Expertise",
    description:
      "Neighbourhood knowledge that goes beyond a pin on a map, schools, light, and how a street actually lives.",
  },
  {
    icon: Handshake,
    title: "Verified Listings",
    description:
      "Owner homes and Dealer stock are checked before they earn a place in the collection.",
  },
  {
    icon: Users,
    title: "Client-First Service",
    description:
      "Pace set by the viewing, not the funnel. Counsel that stays present from inquiry to keys.",
  },
];

export function ValuesGrid() {
  return (
    <section className="border-t border-forest/5 bg-cream/60 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="type-eyebrow">Why Bharwana</p>
          <h2 className="mt-3 max-w-xl font-serif text-4xl">Values that hold the floor steady.</h2>
          <div className="mt-4 h-px w-14 bg-gold/60" />
        </motion.div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value, index) => (
            <motion.article
              key={value.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06, duration: 0.4 }}
              className="border border-forest/10 bg-ivory p-6"
            >
              <value.icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
              <h3 className="mt-5 font-serif text-xl text-forest">{value.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
