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
import { fetchPublicProperties, SEO_REVALIDATE_SECONDS } from "@/lib/server/properties";

export const revalidate = SEO_REVALIDATE_SECONDS;

export function generateStaticParams() {
  return SEO_LANDINGS.map((landing) => ({ slug: landing.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const landing = getSeoLanding(params.slug);
  if (!landing) return { title: "Not found" };
  const properties = matchLandingProperties(await fetchPublicProperties(), landing.filter);
  if (properties.length === 0) return { title: "Not found", robots: { index: false, follow: false } };
  return {
    title: landing.title,
    description: landing.description,
    alternates: { canonical: absoluteUrl(`/${landing.slug}`) },
    openGraph: {
      title: landing.title,
      description: landing.description,
      url: absoluteUrl(`/${landing.slug}`),
    },
  };
}

export default async function SeoLandingPage({ params }: { params: { slug: string } }) {
  const landing = getSeoLanding(params.slug);
  if (!landing) notFound();

  const all = await fetchPublicProperties();
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
