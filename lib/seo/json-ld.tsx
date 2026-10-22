import { ORGANIZATION, SITE_NAME, SITE_ORIGIN, absoluteUrl } from "@/lib/seo/site";
import { propertyPath } from "@/lib/seo/slug";
import type { Property } from "@/lib/types";

/** Escape `<` so JSON-LD cannot break out of the script tag. */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "RealEstateAgent"],
    name: ORGANIZATION.name,
    url: ORGANIZATION.url,
    telephone: ORGANIZATION.telephone,
    email: ORGANIZATION.email,
    logo: ORGANIZATION.logo,
    image: ORGANIZATION.logo,
    sameAs: ORGANIZATION.sameAs,
    areaServed: ORGANIZATION.areaServed,
    address: {
      "@type": "PostalAddress",
      streetAddress: "House #F698, Buch Villas Phase 2",
      addressLocality: "Multan",
      addressCountry: "PK",
      postalCode: "60000",
    },
  };
}

export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_ORIGIN,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/properties?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function itemListJsonLd(
  name: string,
  properties: Property[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: properties.length,
    itemListElement: properties.slice(0, 48).map((property, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(propertyPath(property)),
      name: property.title,
    })),
  };
}

export function realEstateListingJsonLd(property: Property): Record<string, unknown> {
  const url = absoluteUrl(propertyPath(property));
  const images = property.images.length > 0 ? property.images.slice(0, 8) : undefined;
  const listing: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description?.slice(0, 5000) || property.title,
    url,
    datePosted: property.createdAt,
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "PKR",
      availability:
        property.status === "PUBLISHED" || property.status === "RESERVED"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.city,
      addressCountry: "PK",
    },
  };
  if (images?.length) listing.image = images;
  if (property.latitude && property.longitude) {
    listing.geo = {
      "@type": "GeoCoordinates",
      latitude: property.latitude,
      longitude: property.longitude,
    };
  }
  if (property.youtubeVideoId) {
    listing.video = {
      "@type": "VideoObject",
      name: property.title,
      embedUrl: `https://www.youtube.com/embed/${property.youtubeVideoId}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${property.youtubeVideoId}/hqdefault.jpg`,
      uploadDate: property.createdAt,
    };
  }
  return listing;
}
