"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { FeaturedSettings } from "@/lib/featured-shared";
import type { Property, PropertyCategory } from "@/lib/types";

const HeroSearch = dynamic(
  () => import("@/components/properties/hero-search").then((mod) => mod.HeroSearch),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto h-[22rem] w-full max-w-5xl rounded-3xl bg-ivory/20 sm:h-[16rem]"
        aria-hidden
      />
    ),
  },
);

const FeaturedSection = dynamic(
  () => import("@/components/properties/featured-grid").then((mod) => mod.FeaturedSection),
  { ssr: true },
);

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
      {/* Full-bleed under the fixed navbar (header is out of flow — no negative margin). */}
      <section className="relative w-full min-h-svh overflow-hidden">
        {/* Native <img> for LCP — avoids next/image client runtime on the critical path */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.webp"
          alt="Multan residences presented by Bharwana Estates"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest/55 via-forest/45 to-forest/75" />
        <div className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center px-4 pb-16 pt-28 text-center sm:pb-20 sm:pt-32">
          <div className="flex w-full flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.webp"
              alt="Bharwana Estates"
              width={128}
              height={128}
              fetchPriority="high"
              decoding="async"
              className="h-[128px] w-[128px] object-contain sm:h-[140px] sm:w-[140px]"
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
