import { delay } from "@/lib/utils";
import { properties as seedProperties } from "@/lib/mock-data/properties";
import type {
  ListingPurpose,
  ListingType,
  Property,
  PropertyCategory,
  PropertyFilters,
} from "@/lib/types";

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
  const maxArea = get("maxArea");
  const intent = get("intent");
  const category = get("category");
  const subtype = get("subtype");
  // Always filter by purpose. Missing intent matches the Buy UI default (SALE),
  // so Sell and Rent listings never mix when browsing /properties or /map.
  const purpose: ListingPurpose =
    intent === "rental" || intent === "rent" ? "RENT" : "SALE";
  const nearLat = get("lat");
  const nearLng = get("lng");
  return {
    query: get("q") || undefined,
    city: get("city") || undefined,
    listingType:
      listingType === "DIRECT_OWNER" || listingType === "BUSINESS"
        ? (listingType as ListingType)
        : undefined,
    purpose,
    category:
      category === "HOME" || category === "PLOTS" || category === "COMMERCIAL"
        ? (category as PropertyCategory)
        : undefined, // missing / "all" → All Properties (every category)
    subtype: subtype || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    bedrooms: bedrooms ? Number(bedrooms) : undefined,
    bathrooms: bathrooms ? Number(bathrooms) : undefined,
    minArea: minArea ? Number(minArea) : undefined,
    maxArea: maxArea ? Number(maxArea) : undefined,
    nearLat: nearLat && Number.isFinite(Number(nearLat)) ? Number(nearLat) : undefined,
    nearLng: nearLng && Number.isFinite(Number(nearLng)) ? Number(nearLng) : undefined,
  };
}

/** Approximate km between two WGS84 points (for place-scoped listing filters). */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
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
    const haystack =
      `${property.title} ${property.address} ${property.city} ${property.description}`.toLowerCase();
    const q = filters.query?.toLowerCase();
    const textMatch = q ? haystack.includes(q) : false;
    const hasNear =
      filters.nearLat != null &&
      filters.nearLng != null &&
      Number.isFinite(filters.nearLat) &&
      Number.isFinite(filters.nearLng);
    if (hasNear) {
      const nearKm = distanceKm(
        filters.nearLat!,
        filters.nearLng!,
        property.latitude,
        property.longitude,
      );
      // Place pin scope (~4 km) or text match — pins, list, and count stay aligned.
      if (nearKm > 4 && !textMatch) return false;
    } else if (q && !textMatch) {
      return false;
    }
    if (filters.city && property.city !== filters.city) return false;
    if (filters.listingType && filters.listingType !== "ALL" && property.listingType !== filters.listingType) {
      return false;
    }
    if (filters.purpose) {
      const purpose = property.purpose === "RENT" ? "RENT" : "SALE";
      if (purpose !== filters.purpose) return false;
    }
    if (filters.category && (property.category ?? "HOME") !== filters.category) return false;
    if (filters.subtype && property.subtype !== filters.subtype) return false;
    if (filters.minPrice && property.price < filters.minPrice) return false;
    if (filters.maxPrice && property.price > filters.maxPrice) return false;
    if (filters.bedrooms && property.bedrooms < filters.bedrooms) return false;
    if (filters.bathrooms && property.bathrooms < filters.bathrooms) return false;
    if (filters.minArea && property.areaSqft < filters.minArea) return false;
    if (filters.maxArea && property.areaSqft > filters.maxArea) return false;
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
