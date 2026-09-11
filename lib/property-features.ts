import { Bath, BedDouble, Maximize2, Tag } from "lucide-react";
import { formatArea, formatPrice } from "@/lib/format";
import type { Property, PropertyCategory, PropertyHighlightKey } from "@/lib/types";

export const MAX_FEATURE_TAGS = 6;
export const FEATURE_TAG_MAX_LENGTH = 40;

export const ALL_HIGHLIGHT_KEYS: PropertyHighlightKey[] = [
  "bedrooms",
  "bathrooms",
  "area",
  "price",
];

export function defaultHighlightKeys(category?: PropertyCategory | string): PropertyHighlightKey[] {
  if (category === "PLOTS") return ["area", "price"];
  return ["bedrooms", "bathrooms", "area", "price"];
}

export function normalizeHighlightKeys(
  keys: PropertyHighlightKey[] | undefined,
  category?: PropertyCategory | string,
): PropertyHighlightKey[] {
  const allowed = new Set(defaultHighlightKeys(category));
  const picked = (keys ?? []).filter((key) => allowed.has(key));
  return picked.length > 0 ? picked : defaultHighlightKeys(category);
}

export function normalizeFeatureTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const tag = raw.trim().replace(/\s+/g, " ");
    if (!tag || tag.length > FEATURE_TAG_MAX_LENGTH) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_FEATURE_TAGS) break;
  }
  return out;
}

export type PropertyFeatureDisplay = {
  key: string;
  label: string;
  value: string;
  icon: typeof BedDouble;
};

/** Bold map/detail feature rows — core specs the lister chose to highlight. */
export function propertyHighlightDisplay(property: Property): PropertyFeatureDisplay[] {
  const keys = normalizeHighlightKeys(property.highlightSpecs, property.category);
  const items: PropertyFeatureDisplay[] = [];
  for (const key of keys) {
    if (key === "bedrooms") {
      items.push({
        key,
        label: "Bedrooms",
        value: String(property.bedrooms),
        icon: BedDouble,
      });
    } else if (key === "bathrooms") {
      items.push({
        key,
        label: "Bathrooms",
        value: String(property.bathrooms),
        icon: Bath,
      });
    } else if (key === "area") {
      items.push({
        key,
        label: "Area",
        value: formatArea(property.areaSqft),
        icon: Maximize2,
      });
    } else if (key === "price") {
      items.push({
        key,
        label: "Price",
        value: formatPrice(property.price),
        icon: Tag,
      });
    }
  }
  return items;
}
