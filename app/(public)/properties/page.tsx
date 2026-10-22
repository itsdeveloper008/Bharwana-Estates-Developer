import type { Metadata } from "next";
import { Suspense } from "react";
import { PropertiesExplorer } from "@/components/properties/properties-explorer";
import { itemListJsonLd, JsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { fetchPublicProperties, SEO_REVALIDATE_SECONDS } from "@/lib/server/properties";
import { toSeoSafeProperty } from "@/lib/server/seo-safe-property";

export const revalidate = SEO_REVALIDATE_SECONDS;

type SearchParams = Record<string, string | string[] | undefined>;

function hasFacetParams(searchParams: SearchParams): boolean {
  const keys = Object.keys(searchParams).filter((key) => {
    const value = searchParams[key];
    if (value == null) return false;
    if (Array.isArray(value)) return value.some((item) => String(item).trim() !== "");
    return String(value).trim() !== "";
  });
  if (keys.length === 0) return false;
  if (keys.length === 1 && keys[0] === "city") {
    const city = Array.isArray(searchParams.city) ? searchParams.city[0] : searchParams.city;
    return Boolean(city && city.toLowerCase() !== "multan");
  }
  return true;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const faceted = hasFacetParams(searchParams);
  const cityOnly =
    Object.keys(searchParams).length === 1 &&
    String(Array.isArray(searchParams.city) ? searchParams.city[0] : searchParams.city || "")
      .toLowerCase() === "multan";

  return {
    title: "Properties",
    description: "Browse published homes, plots, and commercial property on Bharwana Estates.",
    alternates: {
      canonical: cityOnly ? absoluteUrl("/properties-in-multan") : absoluteUrl("/properties"),
    },
    robots: faceted && !cityOnly ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function PropertiesPage() {
  const initial = (await fetchPublicProperties()).map(toSeoSafeProperty);

  return (
    <>
      {initial.length > 0 ? <JsonLd data={itemListJsonLd("Properties", initial)} /> : null}
      <Suspense fallback={<div className="px-6 py-20 text-sm text-muted-foreground">Loading the collection…</div>}>
        <PropertiesExplorer initialProperties={initial} />
      </Suspense>
    </>
  );
}
