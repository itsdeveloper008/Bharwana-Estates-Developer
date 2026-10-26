import { normalizeFeatureTags, normalizeHighlightKeys } from "@/lib/property-features";
import { isPersistedPropertyImageUrl } from "@/lib/property-images";
import type { Property, PropertyHighlightKey, PropertyStatusHistoryEntry } from "@/lib/types";
import { isYouTubeVideoId } from "@/lib/youtube";

function createdAtIso(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (value && typeof value === "object" && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      // fall through
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (value && typeof value === "object" && "_seconds" in value) {
    const seconds = Number((value as { _seconds: number })._seconds);
    if (Number.isFinite(seconds)) return new Date(seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

/** Map a Firestore property document (Admin or client shape) to `Property`. */
export function mapPropertyRecord(id: string, data: Record<string, unknown>): Property {
  const category = data.category ? (data.category as Property["category"]) : undefined;
  const rawHighlights = Array.isArray(data.highlightSpecs)
    ? (data.highlightSpecs as PropertyHighlightKey[])
    : undefined;
  const rawTags = Array.isArray(data.featureTags) ? (data.featureTags as string[]) : undefined;
  const images = Array.isArray(data.images)
    ? (data.images as string[]).filter((url) => typeof url === "string" && isPersistedPropertyImageUrl(url))
    : [];

  return {
    id,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    listingType: (data.listingType as Property["listingType"]) ?? "DIRECT_OWNER",
    purpose: data.purpose === "RENT" ? "RENT" : "SALE",
    category,
    subtype: data.subtype ? String(data.subtype) : undefined,
    status: (data.status as Property["status"]) ?? "PUBLISHED",
    price: Number(data.price ?? 0),
    areaSqft: Number(data.areaSqft ?? 0),
    areaValue:
      data.areaValue != null && Number.isFinite(Number(data.areaValue))
        ? Number(data.areaValue)
        : undefined,
    areaUnit: (() => {
      const raw = data.areaUnit;
      if (raw === "sqft" || raw === "marla" || raw === "kanal" || raw === "sq_yard" || raw === "acre") {
        return raw;
      }
      return undefined;
    })(),
    bedrooms: Number(data.bedrooms ?? 0),
    bathrooms: Number(data.bathrooms ?? 0),
    address: String(data.address ?? ""),
    city: String(data.city ?? ""),
    latitude: Number(data.latitude ?? 0),
    longitude: Number(data.longitude ?? 0),
    images,
    coverThumb: typeof data.coverThumb === "string" && isPersistedPropertyImageUrl(data.coverThumb) ? data.coverThumb : undefined,
    coverThumbSource: typeof data.coverThumbSource === "string" ? data.coverThumbSource : undefined,
    highlightSpecs: normalizeHighlightKeys(rawHighlights, category),
    featureTags: normalizeFeatureTags(rawTags),
    ownerUserId: data.ownerUserId ? String(data.ownerUserId) : undefined,
    developerId: data.developerId ? String(data.developerId) : undefined,
    contactPhone: data.contactPhone ? String(data.contactPhone) : undefined,
    youtubeVideoId: isYouTubeVideoId(data.youtubeVideoId) ? data.youtubeVideoId : undefined,
    createdAt: createdAtIso(data.createdAt),
    rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
    statusUpdatedAt: data.statusUpdatedAt ? createdAtIso(data.statusUpdatedAt) : undefined,
    statusHistory: Array.isArray(data.statusHistory)
      ? (data.statusHistory as PropertyStatusHistoryEntry[])
          .map((entry) => {
            const mapped: PropertyStatusHistoryEntry = {
              status: entry.status,
              at: createdAtIso(entry.at),
            };
            if (entry.reason) mapped.reason = String(entry.reason);
            if (entry.by) mapped.by = String(entry.by);
            return mapped;
          })
      : undefined,
  };
}

export function propertyLastModifiedIso(data: Record<string, unknown>, fallback: string): string {
  if (data.statusUpdatedAt) return createdAtIso(data.statusUpdatedAt);
  if (data.updatedAt) return createdAtIso(data.updatedAt);
  if (data.createdAt) return createdAtIso(data.createdAt);
  return fallback;
}
