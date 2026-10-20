import type { Metadata } from "next";
import { HomePageClient } from "@/app/(public)/home-page-client";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo/site";
import { fetchFeaturedForHome, SEO_REVALIDATE_SECONDS } from "@/lib/server/properties";

export const revalidate = SEO_REVALIDATE_SECONDS;

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — Homes in Multan & Across Pakistan`,
  },
  description:
    "Direct-owner residences and Dealer-verified stock in Multan and across Pakistan — presented with clarity, not noise.",
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title: SITE_NAME,
    description:
      "Direct-owner residences and Dealer-verified stock in Multan and across Pakistan.",
    url: absoluteUrl("/"),
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE), width: 1200, height: 630, alt: SITE_NAME }],
  },
};

export default async function HomePage() {
  const { settings, byCategory } = await fetchFeaturedForHome();

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <HomePageClient
        initialFeaturedSettings={settings}
        initialFeaturedByCategory={byCategory}
      />
    </>
  );
}
