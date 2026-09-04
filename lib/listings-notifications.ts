/** Lightweight local unread tracking for listing status changes (reject/approve). */
const VIEWED_KEY = "bharwana_listings_last_viewed";
export const LISTINGS_VIEWED_EVENT = "bharwana:listings-viewed";

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, string>) {
  try {
    localStorage.setItem(VIEWED_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(LISTINGS_VIEWED_EVENT));
  } catch {
    // ignore
  }
}

export function getListingsLastViewedAt(userId: string): string | null {
  return readMap()[userId] ?? null;
}

export function markListingsViewed(userId: string): void {
  const map = readMap();
  map[userId] = new Date().toISOString();
  writeMap(map);
}

export function propertyHasUnreadStatusChange(
  property: { statusUpdatedAt?: string; status: string },
  lastViewedAt: string | null,
): boolean {
  if (!property.statusUpdatedAt) return false;
  if (property.status !== "REJECTED" && property.status !== "PUBLISHED") return false;
  if (!lastViewedAt) return true;
  return property.statusUpdatedAt > lastViewedAt;
}
