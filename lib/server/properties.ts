import {
  EMPTY_FEATURED,
  FEATURED_SETTINGS_COLLECTION,
  FEATURED_SETTINGS_DOC,
  MAX_FEATURED_PER_CATEGORY,
  normalizeFeaturedSettings,
  resolveFeaturedList,
  type FeaturedSettings,
} from "@/lib/featured-shared";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { mapPropertyRecord, propertyLastModifiedIso } from "@/lib/server/map-property";
import { matchesCategory } from "@/lib/property-taxonomy";
import type { Property, PropertyCategory } from "@/lib/types";

export const SEO_REVALIDATE_SECONDS = 300;

const PUBLIC_STATUSES = new Set<Property["status"]>(["PUBLISHED", "RESERVED"]);
const INDEXABLE_STATUSES = new Set<Property["status"]>(["PUBLISHED"]);

export type SitemapPropertyRow = {
  id: string;
  title: string;
  city: string;
  lastModified: string;
};

function adminOrNull() {
  if (!isFirebaseAdminConfigured()) return null;
  try {
    return getAdminDb();
  } catch {
    return null;
  }
}

/** Published + reserved marketplace inventory (ISR). Falls back to [] without Admin creds. */
export async function fetchPublicProperties(limitCount = 48): Promise<Property[]> {
  const db = adminOrNull();
  if (!db) return [];

  const snap = await db
    .collection("properties")
    .where("status", "in", ["PUBLISHED", "RESERVED"])
    .limit(limitCount)
    .get();

  return snap.docs.map((doc) => mapPropertyRecord(doc.id, doc.data() as Record<string, unknown>));
}

export async function fetchPublishedPropertyById(id: string): Promise<Property | null> {
  if (!id) return null;
  const db = adminOrNull();
  if (!db) return null;

  const snap = await db.collection("properties").doc(id).get();
  if (!snap.exists) return null;
  const property = mapPropertyRecord(snap.id, snap.data() as Record<string, unknown>);
  if (!PUBLIC_STATUSES.has(property.status)) return null;
  return property;
}

/** Any status (for sold/removed noindex pages). */
export async function fetchPropertyByIdAnyStatus(id: string): Promise<Property | null> {
  if (!id) return null;
  const db = adminOrNull();
  if (!db) return null;
  const snap = await db.collection("properties").doc(id).get();
  if (!snap.exists) return null;
  return mapPropertyRecord(snap.id, snap.data() as Record<string, unknown>);
}

export async function fetchFeaturedSettingsServer(): Promise<FeaturedSettings> {
  const db = adminOrNull();
  if (!db) return { ...EMPTY_FEATURED };
  const snap = await db.collection(FEATURED_SETTINGS_COLLECTION).doc(FEATURED_SETTINGS_DOC).get();
  return normalizeFeaturedSettings(snap.exists ? (snap.data() as Record<string, unknown>) : undefined);
}

export async function fetchFeaturedForHome(): Promise<{
  settings: FeaturedSettings;
  byCategory: Record<PropertyCategory, Property[]>;
  allPublic: Property[];
}> {
  const [settings, allPublic] = await Promise.all([
    fetchFeaturedSettingsServer(),
    fetchPublicProperties(250),
  ]);
  const byId = new Map(allPublic.map((p) => [p.id, p]));
  const categories: PropertyCategory[] = ["HOME", "PLOTS", "COMMERCIAL"];
  const byCategory = {} as Record<PropertyCategory, Property[]>;
  for (const category of categories) {
    const key = category === "PLOTS" ? "plots" : category === "COMMERCIAL" ? "commercial" : "homes";
    const ids = settings[key];
    let list = resolveFeaturedList(ids, byId, category);
    if (list.length === 0) {
      list = allPublic
        .filter((p) => p.status === "PUBLISHED" && matchesCategory(p, category))
        .slice(0, MAX_FEATURED_PER_CATEGORY);
    }
    byCategory[category] = list;
  }
  return { settings, byCategory, allPublic };
}

export async function fetchSitemapProperties(): Promise<SitemapPropertyRow[]> {
  const db = adminOrNull();
  if (!db) return [];
  const snap = await db.collection("properties").where("status", "==", "PUBLISHED").limit(5000).get();
  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      title: String(data.title ?? "Property"),
      city: String(data.city ?? ""),
      lastModified: propertyLastModifiedIso(data, new Date().toISOString()),
    };
  });
}

export function isIndexableProperty(property: Property): boolean {
  return INDEXABLE_STATUSES.has(property.status);
}
