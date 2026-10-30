import { matchesCategory } from "@/lib/property-taxonomy";
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

export function clampFeaturedIds(raw: unknown): string[] {
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
    homes: clampFeaturedIds(data.homes),
    plots: clampFeaturedIds(data.plots),
    commercial: clampFeaturedIds(data.commercial),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : undefined,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
  };
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
    if (!matchesCategory(property, category)) continue;
    out.push(property);
    if (out.length >= MAX_FEATURED_PER_CATEGORY) break;
  }
  return out;
}
