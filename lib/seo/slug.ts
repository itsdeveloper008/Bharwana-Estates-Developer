/** URL-safe slug from free text. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

/** Public property path: /property/<slug>-<id> */
export function propertyPath(property: { id: string; title: string; city?: string }): string {
  const base = slugify([property.title, property.city].filter(Boolean).join(" "));
  const slug = base || "property";
  return `/property/${slug}-${property.id}`;
}

/**
 * Resolve `/property/[param]` — supports legacy bare ids and slug-id URLs.
 * App ids are `p-<timestamp>`; Firestore auto-ids are typically 20 alphanumeric chars.
 */
export function parsePropertyParam(param: string): { id: string; slug: string | null } {
  const decoded = decodeURIComponent(param).trim();
  if (!decoded) return { id: "", slug: null };

  // Created listings: p-1791974264754 (hyphenated — must win before the generic pattern).
  const appId = decoded.match(/^(.*)-(p-\d{10,})$/);
  if (appId) {
    return { slug: appId[1] || null, id: appId[2] };
  }

  // Firestore auto-ids (no hyphens, typically 20 chars).
  const match = decoded.match(/^(.*)-([A-Za-z0-9]{16,})$/);
  if (match) {
    return { slug: match[1] || null, id: match[2] };
  }
  return { id: decoded, slug: null };
}
