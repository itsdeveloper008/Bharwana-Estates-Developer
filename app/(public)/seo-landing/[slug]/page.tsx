import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLandingView } from "@/components/seo/seo-landing-view";
import {
  getSeoLanding,
  matchLandingProperties,
  SEO_LANDINGS,
} from "@/content/seo-landings";
import { breadcrumbJsonLd, itemListJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { fetchPublicProperties } from "@/lib/server/properties";

// Must be a literal for Next 16 static analysis; keep in sync with SEO_REVALIDATE_SECONDS.
export const revalidate = 300;

export function generateStaticParams() {
  return SEO_LANDINGS.map((landing) => ({ slug: landing.slug }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const landing = getSeoLanding(params.slug);
  if (!landing) return { title: "Not found" };
  const properties = matchLandingProperties(await fetchPublicProperties(250), landing.filter);
  if (properties.length === 0) return { title: "Not found", robots: { index: false, follow: false } };
  return {
    title: landing.title,
    description: landing.description,
    alternates: { canonical: absoluteUrl(`/${landing.slug}`) },
    openGraph: {
      title: landing.title,
      description: landing.description,
      url: absoluteUrl(`/${landing.slug}`),
      images: [{ url: absoluteUrl("/og-default.jpg"), width: 1200, height: 630, alt: landing.title }],
    },
  };
}

export default async function SeoLandingPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const landing = getSeoLanding(params.slug);
  if (!landing) notFound();

  const all = await fetchPublicProperties(250);
  const properties = matchLandingProperties(all, landing.filter);
  if (properties.length === 0) notFound();

  const related = landing.relatedSlugs
    .map((slug) => getSeoLanding(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => matchLandingProperties(all, item.filter).length > 0);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Properties", path: "/properties" },
          { name: landing.h1, path: `/${landing.slug}` },
        ])}
      />
      <JsonLd data={itemListJsonLd(landing.h1, properties)} />
      <SeoLandingView landing={landing} properties={properties} related={related} />
    </>
  );
}
