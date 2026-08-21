import { delay } from "@/lib/utils";
import { properties as seedProperties } from "@/lib/mock-data/properties";
import type { ListingType, Property, PropertyFilters } from "@/lib/types";

export function filtersFromSearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): PropertyFilters {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(key) ?? undefined;
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const listingType = get("listingType");
  const minPrice = get("minPrice");
  const maxPrice = get("maxPrice");
  const bedrooms = get("beds");
  const bathrooms = get("baths");
  const minArea = get("minArea");
  return {
    query: get("q") || undefined,
    city: get("city") || undefined,
    listingType:
      listingType === "DIRECT_OWNER" || listingType === "BUSINESS"
        ? (listingType as ListingType)
        : undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    bathrooms: bathrooms ? Number(bathrooms) : undefined,
    minArea: minArea ? Number(minArea) : undefined,
  };
}

const PUBLIC_STATUSES: Property["status"][] = ["PUBLISHED", "RESERVED"];

export function filterProperties(
  items: Property[],
  filters: PropertyFilters = {},
  options: { includeUnlisted?: boolean } = {},
) {
  return items.filter((property) => {
    if (!options.includeUnlisted && !PUBLIC_STATUSES.includes(property.status)) {
      return false;
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const haystack = `${property.title} ${property.address} ${property.city} ${property.description}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.city && property.city !== filters.city) return false;
    if (filters.listingType && filters.listingType !== "ALL" && property.listingType !== filters.listingType) {
      return false;
    }
    if (filters.minPrice && property.price < filters.minPrice) return false;
    if (filters.maxPrice && property.price > filters.maxPrice) return false;
    if (filters.bedrooms && property.bedrooms < filters.bedrooms) return false;
    if (filters.bathrooms && property.bathrooms < filters.bathrooms) return false;
    if (filters.minArea && property.areaSqft < filters.minArea) return false;
    if (filters.bounds) {
      const { north, south, east, west } = filters.bounds;
      if (
        property.latitude > north ||
        property.latitude < south ||
        property.longitude > east ||
        property.longitude < west
      ) {
        return false;
      }
    }
    return true;
  });
}

export async function getProperties(filters: PropertyFilters = {}): Promise<Property[]> {
  // TODO: replace with real backend call
  await delay(0);
  return filterProperties(seedProperties, filters);
}

export async function getAllProperties(): Promise<Property[]> {
  // TODO: replace with real backend call
  await delay(0);
  return seedProperties;
}

export async function getPropertyById(id: string): Promise<Property | undefined> {
  // TODO: replace with real backend call
  await delay(0);
  return seedProperties.find((property) => property.id === id);
}

export async function getFeaturedProperties(): Promise<Property[]> {
  // TODO: replace with real backend call
  await delay(0);
  return seedProperties.filter((property) => property.status === "PUBLISHED").slice(0, 6);
}

export async function getPropertiesByOwner(ownerUserId: string): Promise<Property[]> {
  // TODO: replace with real backend call
  await delay(0);
  return seedProperties.filter((property) => property.ownerUserId === ownerUserId);
}
