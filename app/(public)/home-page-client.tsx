"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { HeroSearch } from "@/components/properties/hero-search";
import { FeaturedSection } from "@/components/properties/featured-grid";
import type { FeaturedSettings } from "@/lib/featured-shared";
import type { Property, PropertyCategory } from "@/lib/types";

const HomeBelowFold = dynamic(
  () => import("@/app/(public)/home-below-fold").then((mod) => mod.HomeBelowFold),
  { ssr: true },
);

export function HomePageClient({
  initialFeaturedSettings,
  initialFeaturedByCategory,
}: {
  initialFeaturedSettings: FeaturedSettings;
  initialFeaturedByCategory: Record<PropertyCategory, Property[]>;
}) {
  const [featuredCategory, setFeaturedCategory] = useState<PropertyCategory>("HOME");

  return (
    <>
      {/* Pull hero under the sticky navbar — must match --site-header-height */}
      <section className="relative w-full min-h-svh overflow-hidden -mt-16 md:-mt-[96px] xl:-mt-[108px]">
        <Image
          src="/hero.webp"
          alt="Multan residences presented by Bharwana Estates"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/55 via-forest/45 to-forest/75" />
        <div className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center px-4 pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
          <div className="flex w-full flex-col items-center">
            <Image
              src="/logo.webp"
              alt="Bharwana Estates"
              width={128}
              height={128}
              className="h-[128px] w-[128px] object-contain sm:h-[140px] sm:w-[140px]"
              priority
            />
            <h1 className="mt-5 max-w-3xl font-serif text-4xl text-ivory sm:text-5xl sm:leading-[1.08]">
              Homes Held With The Gravity Of A Family Name.
            </h1>
            <p className="type-subheading-on-dark">
              Direct-owner residences and Dealer-verified stock, presented as a brochure, not a marketplace stall.
            </p>
            <div className="mt-8 w-full">
              <HeroSearch
                featuredCategory={featuredCategory}
                onFeaturedCategoryChange={setFeaturedCategory}
              />
            </div>
          </div>
        </div>
      </section>

      <FeaturedSection
        category={featuredCategory}
        onCategoryChange={setFeaturedCategory}
        initialSettings={initialFeaturedSettings}
        initialFeaturedByCategory={initialFeaturedByCategory}
      />

      <HomeBelowFold />
    </>
  );
}
