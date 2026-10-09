"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";
import { PropertyCard } from "@/components/properties/property-card";
import { useMockStore } from "@/lib/mock-store";

export function FeaturedGrid() {
  const { properties, propertiesLoading } = useMockStore();
  const featured = properties.filter((property) => property.status === "PUBLISHED").slice(0, 6);

  // Show listings as soon as any arrive — don't block the whole section on the full snapshot.
  if (featured.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {propertiesLoading
          ? "Loading featured homes…"
          : "Featured listings will appear here when residences are published."}
      </p>
    );
  }

  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {featured.map((property, index) => (
        <motion.div
          key={property.id}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
        >
          <PropertyCard property={property} priority={index < 2} />
        </motion.div>
      ))}
    </div>
  );
}

export function FeaturedSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 28]);

  return (
    <section ref={ref} className="relative overflow-hidden py-20 sm:py-24">
      <motion.div
        style={{ y }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            // Keep the featured wash warm/light through the bottom so it meets forest cleanly -
            // no mid-gray or deep-green fade that bands against the next section.
            background:
              "linear-gradient(135deg, rgba(201,162,75,0.2) 0%, rgba(250,247,240,0.85) 42%, rgba(250,247,240,0.95) 100%)",
          }}
        />
        <Image
          src="/logo.png"
          alt=""
          width={520}
          height={520}
          className="absolute -right-16 bottom-0 h-64 w-64 object-contain opacity-[0.07] sm:h-80 sm:w-80"
        />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10">
          <p className="type-eyebrow">Featured</p>
          <h2 className="mt-2 font-serif text-4xl text-forest">Properties</h2>
        </div>
        <FeaturedGrid />
      </div>
    </section>
  );
}
