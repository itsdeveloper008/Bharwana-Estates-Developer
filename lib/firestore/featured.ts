import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/client";
import { getPropertyDoc } from "@/lib/firestore/properties";
import {
  clampFeaturedIds,
  EMPTY_FEATURED,
  FEATURED_SETTINGS_COLLECTION,
  FEATURED_SETTINGS_DOC,
  normalizeFeaturedSettings,
  type FeaturedSettings,
} from "@/lib/featured-shared";
import type { Property } from "@/lib/types";

export {
  categoryToFeaturedKey,
  EMPTY_FEATURED,
  FEATURED_SETTINGS_COLLECTION,
  FEATURED_SETTINGS_DOC,
  featuredKeyToCategory,
  MAX_FEATURED_PER_CATEGORY,
  normalizeFeaturedSettings,
  resolveFeaturedList,
  type FeaturedCategoryKey,
  type FeaturedSettings,
} from "@/lib/featured-shared";

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
    homes: clampFeaturedIds(settings.homes),
    plots: clampFeaturedIds(settings.plots),
    commercial: clampFeaturedIds(settings.commercial),
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
