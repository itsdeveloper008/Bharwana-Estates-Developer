import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PropertyDetailGate } from "./property-detail-gate";
import { breadcrumbJsonLd, JsonLd, realEstateListingJsonLd } from "@/lib/seo/json-ld";
import { parsePropertyParam, propertyPath } from "@/lib/seo/slug";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo/site";
import {
  fetchPropertyByIdAnyStatus,
  fetchSitemapProperties,
  isIndexableProperty,
} from "@/lib/server/properties";
import { toSeoSafeProperty } from "@/lib/server/seo-safe-property";
import { propertyCoverImage } from "@/lib/property-images";

// Must be a literal for Next 16 static analysis; keep in sync with SEO_REVALIDATE_SECONDS.
export const revalidate = 300;

/** Prerender published listings so JSON-LD / h1 land in static HTML (not only RSC flight). */
export async function generateStaticParams() {
  const rows = await fetchSitemapProperties();
  return rows.map((row) => ({
    id: propertyPath({ id: row.id, title: row.title, city: row.city }).replace(/^\/property\//, ""),
  }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ id: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const { id } = parsePropertyParam(params.id);
  const property = id ? await fetchPropertyByIdAnyStatus(id) : null;
  if (!property) {
    return { title: "Residence", robots: { index: false, follow: true } };
  }

  const path = propertyPath(property);
  const description =
    property.description?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `${property.title} in ${property.city} — Bharwana Estates.`;
  const cover = propertyCoverImage(property.images);
  const indexable = isIndexableProperty(property);

  return {
    title: property.title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: property.title,
      description,
      url: absoluteUrl(path),
      type: "article",
      images: [
        {
          url: cover ? (cover.startsWith("http") ? cover : absoluteUrl(cover)) : absoluteUrl(DEFAULT_OG_IMAGE),
          alt: property.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: property.title,
      description,
    },
  };
}

export default async function PropertyPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const parsed = parsePropertyParam(params.id);
  if (!parsed.id) notFound();

  const property = await fetchPropertyByIdAnyStatus(parsed.id);
  if (!property) notFound();

  const canonicalPath = propertyPath(property);
  const expectedParam = canonicalPath.replace(/^\/property\//, "");
  if (params.id !== expectedParam) {
    permanentRedirect(canonicalPath);
  }

  const safe = toSeoSafeProperty(property);
  const indexable = isIndexableProperty(property);

  return (
    <>
      {indexable ? (
        <>
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Properties", path: "/properties" },
              { name: property.title, path: canonicalPath },
            ])}
          />
          <JsonLd data={realEstateListingJsonLd(safe)} />
        </>
      ) : null}
      <PropertyDetailGate id={property.id} initial={safe} />
      <p className="sr-only">
        {SITE_NAME} listing in {property.city}
      </p>
    </>
  );
}
