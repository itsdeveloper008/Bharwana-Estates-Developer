import type { ListingPurpose, Property, PropertyCategory } from "@/lib/types";

export type SeoLandingFilter = {
  city?: string;
  purpose?: ListingPurpose;
  category?: PropertyCategory;
  /** Case-insensitive substring match against address + title */
  areaQuery?: string;
};

export type SeoLanding = {
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  filter: SeoLandingFilter;
  relatedSlugs: string[];
};

export const SEO_LANDINGS: SeoLanding[] = [
  {
    slug: "properties-in-multan",
    h1: "Properties in Multan",
    title: "Properties for Sale & Rent in Multan",
    description:
      "Browse verified homes, plots, and commercial property in Multan on Bharwana Estates.",
    intro:
      "Explore published Multan listings from direct owners and verified dealers — houses, plots, and commercial spaces with clear pricing.",
    filter: { city: "Multan" },
    relatedSlugs: [
      "houses-for-sale-in-multan",
      "plots-for-sale-in-multan",
      "commercial-property-in-multan",
      "houses-for-rent-in-multan",
      "dha-multan",
      "buch-villas-multan",
    ],
  },
  {
    slug: "houses-for-sale-in-multan",
    h1: "Houses for Sale in Multan",
    title: "Houses for Sale in Multan",
    description: "Find houses and homes for sale in Multan with verified listings on Bharwana Estates.",
    intro: "Homes for sale across Multan, presented with transparent pricing and location detail.",
    filter: { city: "Multan", purpose: "SALE", category: "HOME" },
    relatedSlugs: ["properties-in-multan", "houses-for-rent-in-multan", "dha-multan", "gulgasht-multan"],
  },
  {
    slug: "plots-for-sale-in-multan",
    h1: "Plots for Sale in Multan",
    title: "Plots for Sale in Multan",
    description: "Residential and other plots for sale in Multan on Bharwana Estates.",
    intro: "Published plot listings in Multan for buyers comparing size, location, and price.",
    filter: { city: "Multan", purpose: "SALE", category: "PLOTS" },
    relatedSlugs: ["properties-in-multan", "dha-multan", "buch-villas-multan"],
  },
  {
    slug: "commercial-property-in-multan",
    h1: "Commercial Property in Multan",
    title: "Commercial Property in Multan",
    description: "Shops, offices, and commercial property in Multan on Bharwana Estates.",
    intro: "Commercial listings in Multan for dealers and investors seeking verified floor space.",
    filter: { city: "Multan", category: "COMMERCIAL" },
    relatedSlugs: ["properties-in-multan", "houses-for-sale-in-multan"],
  },
  {
    slug: "houses-for-rent-in-multan",
    h1: "Houses for Rent in Multan",
    title: "Houses for Rent in Multan",
    description: "Rental homes in Multan from verified listings on Bharwana Estates.",
    intro: "Rentals in Multan with clear monthly pricing and neighbourhood context.",
    filter: { city: "Multan", purpose: "RENT", category: "HOME" },
    relatedSlugs: ["properties-in-multan", "houses-for-sale-in-multan", "gulgasht-multan"],
  },
  {
    slug: "dha-multan",
    h1: "Properties in DHA Multan",
    title: "Properties in DHA Multan",
    description: "Homes and plots in DHA Multan on Bharwana Estates.",
    intro: "Listings in and around DHA Multan — sectors and phases with published pricing.",
    filter: { city: "Multan", areaQuery: "dha" },
    relatedSlugs: ["properties-in-multan", "buch-villas-multan", "houses-for-sale-in-multan"],
  },
  {
    slug: "buch-villas-multan",
    h1: "Properties in Buch Villas Multan",
    title: "Properties in Buch Villas Multan",
    description: "Homes and plots in Buch Villas, Multan on Bharwana Estates.",
    intro: "Published residences and plots in Buch Villas, Multan.",
    filter: { city: "Multan", areaQuery: "buch" },
    relatedSlugs: ["properties-in-multan", "dha-multan", "bosan-road-multan"],
  },
  {
    slug: "bosan-road-multan",
    h1: "Properties on Bosan Road Multan",
    title: "Properties on Bosan Road Multan",
    description: "Listings along Bosan Road, Multan on Bharwana Estates.",
    intro: "Homes and plots near Bosan Road with transparent listing detail.",
    filter: { city: "Multan", areaQuery: "bosan" },
    relatedSlugs: ["properties-in-multan", "gulgasht-multan", "buch-villas-multan"],
  },
  {
    slug: "gulgasht-multan",
    h1: "Properties in Gulgasht Multan",
    title: "Properties in Gulgasht Multan",
    description: "Homes in Gulgasht Colony, Multan on Bharwana Estates.",
    intro: "Published homes in Gulgasht and nearby Multan neighbourhoods.",
    filter: { city: "Multan", areaQuery: "gulgasht" },
    relatedSlugs: ["properties-in-multan", "cantt-multan", "houses-for-sale-in-multan"],
  },
  {
    slug: "cantt-multan",
    h1: "Properties in Multan Cantt",
    title: "Properties in Multan Cantt",
    description: "Homes and plots in Multan Cantonment on Bharwana Estates.",
    intro: "Listings in Multan Cantt with verified presentation and clear pricing.",
    filter: { city: "Multan", areaQuery: "cantt" },
    relatedSlugs: ["properties-in-multan", "gulgasht-multan", "houses-for-sale-in-multan"],
  },
];

export function getSeoLanding(slug: string): SeoLanding | undefined {
  return SEO_LANDINGS.find((item) => item.slug === slug);
}

export function matchLandingProperties(properties: Property[], filter: SeoLandingFilter): Property[] {
  return properties.filter((property) => {
    if (property.status !== "PUBLISHED") return false;
    if (filter.city && property.city.toLowerCase() !== filter.city.toLowerCase()) return false;
    if (filter.purpose && (property.purpose ?? "SALE") !== filter.purpose) return false;
    if (filter.category && (property.category ?? "HOME") !== filter.category) return false;
    if (filter.areaQuery) {
      const hay = `${property.title} ${property.address}`.toLowerCase();
      if (!hay.includes(filter.areaQuery.toLowerCase())) return false;
    }
    return true;
  });
}

export function landingPriceSummary(properties: Property[]): string {
  if (properties.length === 0) return "";
  const prices = properties.map((p) => p.price).filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length === 0) return `${properties.length} published listing${properties.length === 1 ? "" : "s"}.`;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const fmt = (n: number) =>
    n >= 10_000_000
      ? `${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)} crore`
      : n >= 100_000
        ? `${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)} lakh`
        : n.toLocaleString("en-PK");
  if (min === max) return `${properties.length} listings from PKR ${fmt(min)}.`;
  return `${properties.length} listings from PKR ${fmt(min)} to ${fmt(max)}.`;
}
