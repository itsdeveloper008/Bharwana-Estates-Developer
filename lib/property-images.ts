/** Listing cover / gallery URLs — only our Storage (and Unsplash seed) hosts. */

const STORAGE_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "images.unsplash.com",
]);

export function isAllowedPropertyImageUrl(url: string): boolean {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return false;
  // Local previews before upload — never persist these to Firestore.
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const host = parsed.hostname.toLowerCase();
    if (STORAGE_HOSTS.has(host)) return true;
    if (host.endsWith(".firebasestorage.app")) return true;
    return false;
  } catch {
    return false;
  }
}

/** HTTPS Storage download URLs safe to save in Firestore. */
export function isPersistedPropertyImageUrl(url: string): boolean {
  const trimmed = url?.trim() ?? "";
  if (!trimmed.startsWith("https://")) return false;
  return isAllowedPropertyImageUrl(trimmed);
}

/** First usable cover photo, skipping Bitly / QR / random external URLs. */
export function propertyCoverImage(images: string[] | undefined): string | null {
  for (const image of images ?? []) {
    if (typeof image !== "string") continue;
    if (isPersistedPropertyImageUrl(image)) return image;
    if (image.startsWith("data:") || image.startsWith("blob:")) return image;
  }
  return null;
}
