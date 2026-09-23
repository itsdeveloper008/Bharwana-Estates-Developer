/** Lightweight local unread tracking for dealer account status (reject/approve). */
const VIEWED_KEY = "bharwana_dealer_account_last_viewed";
export const DEALER_ACCOUNT_VIEWED_EVENT = "bharwana:dealer-account-viewed";

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
    window.dispatchEvent(new Event(DEALER_ACCOUNT_VIEWED_EVENT));
  } catch {
    // ignore
  }
}

export function getDealerAccountLastViewedAt(userId: string): string | null {
  return readMap()[userId] ?? null;
}

export function markDealerAccountViewed(userId: string): void {
  const map = readMap();
  map[userId] = new Date().toISOString();
  writeMap(map);
}

/**
 * Baseline so an already-rejected (or already-active) account does not light
 * the badge on first visit after this feature ships.
 */
export function ensureDealerAccountViewedBaseline(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  const map = readMap();
  if (map[userId]) return;
  map[userId] = new Date().toISOString();
  writeMap(map);
}

export function dealerHasUnreadStatusChange(
  developer: { statusUpdatedAt?: string; status: string } | null | undefined,
  lastViewedAt: string | null,
): boolean {
  if (!developer?.statusUpdatedAt) return false;
  if (developer.status !== "REJECTED" && developer.status !== "ACTIVE") return false;
  if (!lastViewedAt) return false;
  return developer.statusUpdatedAt > lastViewedAt;
}
