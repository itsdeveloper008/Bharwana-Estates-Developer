import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { getPropertyDoc } from "@/lib/firestore/properties";
import type { Property, PropertyCategory } from "@/lib/types";

export const FEATURED_SETTINGS_COLLECTION = "siteSettings";
export const FEATURED_SETTINGS_DOC = "featured";
export const MAX_FEATURED_PER_CATEGORY = 6;

export type FeaturedCategoryKey = "homes" | "plots" | "commercial";

export type FeaturedSettings = {
  homes: string[];
  plots: string[];
  commercial: string[];
  updatedAt?: string;
  updatedBy?: string;
};

export const EMPTY_FEATURED: FeaturedSettings = {
  homes: [],
  plots: [],
  commercial: [],
};

export function categoryToFeaturedKey(category: PropertyCategory): FeaturedCategoryKey {
  if (category === "PLOTS") return "plots";
  if (category === "COMMERCIAL") return "commercial";
  return "homes";
}

export function featuredKeyToCategory(key: FeaturedCategoryKey): PropertyCategory {
  if (key === "plots") return "PLOTS";
  if (key === "commercial") return "COMMERCIAL";
  return "HOME";
}

function clampIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const id = item.trim();
    if (!id || out.includes(id)) continue;
    out.push(id);
    if (out.length >= MAX_FEATURED_PER_CATEGORY) break;
  }
  return out;
}

export function normalizeFeaturedSettings(data: Record<string, unknown> | undefined): FeaturedSettings {
  if (!data) return { ...EMPTY_FEATURED };
  return {
    homes: clampIds(data.homes),
    plots: clampIds(data.plots),
    commercial: clampIds(data.commercial),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
  };
}

export function subscribeFeaturedSettings(
  onData: (settings: FeaturedSettings) => void,
  onError?: (error: Error) => void,
): Unsubscribe | null {
  const db = getDb();
  if (!db || !isFirebaseConfigured()) return null;
  const ref = doc(db, FEATURED_SETTINGS_COLLECTION, FEATURED_SETTINGS_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      onData(normalizeFeaturedSettings(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined));
    },
    (error) => onError?.(error),
  );
}

export async function fetchFeaturedSettings(): Promise<FeaturedSettings> {
  const db = getDb();
  if (!db || !isFirebaseConfigured()) return { ...EMPTY_FEATURED };
  const snap = await getDoc(doc(db, FEATURED_SETTINGS_COLLECTION, FEATURED_SETTINGS_DOC));
  return normalizeFeaturedSettings(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined);
}

export async function saveFeaturedSettings(
  settings: Pick<FeaturedSettings, "homes" | "plots" | "commercial">,
  updatedBy?: string,
): Promise<void> {
  const db = getDb();
  if (!db || !isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }
  const payload = {
    homes: clampIds(settings.homes),
    plots: clampIds(settings.plots),
    commercial: clampIds(settings.commercial),
    updatedAt: serverTimestamp(),
    ...(updatedBy ? { updatedBy } : {}),
  };
  await setDoc(doc(db, FEATURED_SETTINGS_COLLECTION, FEATURED_SETTINGS_DOC), payload, { merge: true });
}

/** Load properties by id (parallel getDoc). Missing ids are skipped. Preserves order. */
export async function fetchPropertiesByIds(ids: string[]): Promise<Property[]> {
  if (!isFirebaseConfigured() || ids.length === 0) return [];
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  const loaded = await Promise.all(unique.map((id) => getPropertyDoc(id)));
  const byId = new Map<string, Property>();
  for (const property of loaded) {
    if (property) byId.set(property.id, property);
  }
  return unique.map((id) => byId.get(id)).filter((item): item is Property => Boolean(item));
}

/** Ordered published picks for a category; skips unpublished / missing. */
export function resolveFeaturedList(
  ids: string[],
  byId: Map<string, Property>,
  category: PropertyCategory,
): Property[] {
  const out: Property[] = [];
  for (const id of ids) {
    const property = byId.get(id);
    if (!property) continue;
    if (property.status !== "PUBLISHED") continue;
    const propertyCategory = property.category ?? "HOME";
    if (propertyCategory !== category) continue;
    out.push(property);
    if (out.length >= MAX_FEATURED_PER_CATEGORY) break;
  }
  return out;
}
