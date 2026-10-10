"use client";

import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PropertyCard } from "@/components/properties/property-card";
import { Button } from "@/components/ui/button";
import {
  categoryToFeaturedKey,
  fetchPropertiesByIds,
  resolveFeaturedList,
  subscribeFeaturedSettings,
  type FeaturedSettings,
  EMPTY_FEATURED,
} from "@/lib/firestore/featured";
import { useMockStore } from "@/lib/mock-store";
import { PROPERTY_CATEGORIES } from "@/lib/property-taxonomy";
import type { Property, PropertyCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_TABS: { id: PropertyCategory; label: string }[] = PROPERTY_CATEGORIES.map((item) => ({
  id: item.id,
  label: item.pluralLabel,
}));

function viewAllHref(category: PropertyCategory) {
  const params = new URLSearchParams({ intent: "buy", category });
  return `/properties?${params.toString()}`;
}

function fallbackPublished(
  properties: Property[],
  category: PropertyCategory,
  limit = 6,
): Property[] {
  return properties
    .filter(
      (property) =>
        property.status === "PUBLISHED" && (property.category ?? "HOME") === category,
    )
    .slice(0, limit);
}

export function FeaturedGrid({
  category,
  settings,
}: {
  category: PropertyCategory;
  settings: FeaturedSettings;
}) {
  const { properties, propertiesLoading } = useMockStore();
  const [picked, setPicked] = useState<Property[]>([]);
  const [loadingPicks, setLoadingPicks] = useState(true);

  const idsKey = settings[categoryToFeaturedKey(category)].join("|");
  const ids = useMemo(
    () => settings[categoryToFeaturedKey(category)],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey tracks content
    [idsKey, category],
  );

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) {
      setPicked([]);
      setLoadingPicks(false);
      return;
    }
    setLoadingPicks(true);
    void fetchPropertiesByIds(ids)
      .then((list) => {
        if (cancelled) return;
        const byId = new Map(list.map((property) => [property.id, property]));
        setPicked(resolveFeaturedList(ids, byId, category));
      })
      .catch(() => {
        if (!cancelled) setPicked([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPicks(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids, category]);

  const featured = useMemo(() => {
    if (ids.length > 0) return picked;
    // Fallback only when admin has not picked anything for this category.
    return fallbackPublished(properties, category, 6);
  }, [ids.length, picked, properties, category]);

  if ((loadingPicks || propertiesLoading) && featured.length === 0) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading featured homes…</p>
      </div>
    );
  }

  if (featured.length === 0) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Featured listings will appear here when residences are published.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[28rem]">
      <AnimatePresence mode="wait">
        <motion.div
          key={category}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {featured.map((property, index) => (
            <PropertyCard key={property.id} property={property} priority={index < 2} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function FeaturedSection({
  category,
  onCategoryChange,
}: {
  category: PropertyCategory;
  onCategoryChange: (next: PropertyCategory) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 28]);
  const [settings, setSettings] = useState<FeaturedSettings>({ ...EMPTY_FEATURED });

  useEffect(() => {
    const unsub = subscribeFeaturedSettings(setSettings);
    return () => unsub?.();
  }, []);

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
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="type-eyebrow">Featured</p>
            <h2 className="mt-2 font-serif text-4xl text-forest">Properties</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onCategoryChange(tab.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  category === tab.id
                    ? "bg-forest text-ivory"
                    : "border border-forest/15 bg-white/80 text-forest hover:border-gold/40",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <FeaturedGrid category={category} settings={settings} />
        <div className="mt-10 flex justify-center pb-2 sm:mt-12">
          <Button asChild className="rounded-full px-8">
            <Link href={viewAllHref(category)}>View All Properties</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
