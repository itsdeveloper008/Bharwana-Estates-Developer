import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PropertyDetailGate } from "./property-detail-gate";
import { breadcrumbJsonLd, JsonLd, realEstateListingJsonLd } from "@/lib/seo/json-ld";
import { parsePropertyParam, propertyPath } from "@/lib/seo/slug";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME } from "@/lib/seo/site";
import {
  fetchPropertyByIdAnyStatus,
  isIndexableProperty,
  SEO_REVALIDATE_SECONDS,
} from "@/lib/server/properties";
import { propertyCoverImage } from "@/lib/property-images";

export const revalidate = SEO_REVALIDATE_SECONDS;

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
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

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const parsed = parsePropertyParam(params.id);
  if (!parsed.id) notFound();

  const property = await fetchPropertyByIdAnyStatus(parsed.id);
  if (!property) {
    return <PropertyDetailGate id={parsed.id} />;
  }

  const canonicalPath = propertyPath(property);
  const expectedParam = canonicalPath.replace(/^\/property\//, "");
  if (params.id !== expectedParam) {
    permanentRedirect(canonicalPath);
  }

  return (
    <>
      {isIndexableProperty(property) ? (
        <>
          <JsonLd
            data={breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Properties", path: "/properties" },
              { name: property.title, path: canonicalPath },
            ])}
          />
          <JsonLd data={realEstateListingJsonLd(property)} />
        </>
      ) : null}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-6 text-sm text-muted-foreground sm:px-6">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <a href="/" className="hover:text-forest">
              Home
            </a>
          </li>
          <li aria-hidden>/</li>
          <li>
            <a href="/properties" className="hover:text-forest">
              Properties
            </a>
          </li>
          <li aria-hidden>/</li>
          <li className="truncate text-forest">{property.title}</li>
        </ol>
      </nav>
      <PropertyDetailGate id={property.id} initial={property} />
      <p className="sr-only">
        {SITE_NAME} listing in {property.city}
      </p>
    </>
  );
}
