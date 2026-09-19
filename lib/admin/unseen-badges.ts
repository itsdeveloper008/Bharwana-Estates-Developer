import type { AdminModule } from "@/lib/admin/modules";

/**
 * Modules that show count badges in the admin sidebar.
 *
 * Two badge styles:
 * - Queue (status): submissions, dealers, deletion — count items awaiting action;
 *   clears when the queue is processed, not when the page is opened.
 * - Unseen (timestamp): inquiries, users, newsletter — count items created after
 *   this admin last opened that module (localStorage baseline per admin uid).
 */
export type AdminBadgeModule = Extract<
  AdminModule,
  "submissions" | "inquiries" | "users" | "dealers" | "newsletter" | "deletion"
>;

export const ADMIN_BADGE_MODULES: AdminBadgeModule[] = [
  "submissions",
  "inquiries",
  "users",
  "dealers",
  "newsletter",
  "deletion",
];

const VIEWED_KEY = "bharwana_admin_module_last_viewed_v1";
export const ADMIN_MODULE_VIEWED_EVENT = "bharwana:admin-module-viewed";

type ViewedMap = Record<string, Partial<Record<AdminBadgeModule, string>>>;

function readMap(): ViewedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ViewedMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: ViewedMap) {
  try {
    localStorage.setItem(VIEWED_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(ADMIN_MODULE_VIEWED_EVENT));
  } catch {
    /* ignore */
  }
}

export function getAdminModuleLastViewedAt(
  adminUid: string,
  badgeModule: AdminBadgeModule,
): string | null {
  return readMap()[adminUid]?.[badgeModule] ?? null;
}

/** Seed "now" once so existing backlog does not all light up as unread for unseen-style modules. */
export function ensureAdminModuleBaselines(adminUid: string): void {
  if (typeof window === "undefined" || !adminUid) return;
  const map = readMap();
  const current = { ...(map[adminUid] ?? {}) };
  let changed = false;
  const now = new Date().toISOString();
  for (const badgeModule of ADMIN_BADGE_MODULES) {
    if (!current[badgeModule]) {
      current[badgeModule] = now;
      changed = true;
    }
  }
  if (!changed) return;
  map[adminUid] = current;
  writeMap(map);
}

export function markAdminModuleViewed(adminUid: string, badgeModule: AdminBadgeModule): void {
  if (typeof window === "undefined" || !adminUid) return;
  const map = readMap();
  map[adminUid] = {
    ...(map[adminUid] ?? {}),
    [badgeModule]: new Date().toISOString(),
  };
  writeMap(map);
}

function createdAfter(iso: string | undefined, lastViewedAt: string | null): boolean {
  if (!iso || !lastViewedAt) return false;
  return iso > lastViewedAt;
}

/** Queue: all listings waiting for approve/reject. */
export function countPendingSubmissions(
  properties: { status: string }[],
): number {
  return properties.filter((property) => property.status === "PENDING_APPROVAL").length;
}

/** Unseen: inquiries created after this admin last opened Inquiries. */
export function countUnseenInquiries(
  inquiries: { createdAt?: string }[],
  lastViewedAt: string | null,
): number {
  return inquiries.filter((item) => createdAfter(item.createdAt, lastViewedAt)).length;
}

/** Unseen: non-admin user profiles created after this admin last opened Users. */
export function countUnseenUsers(
  users: { createdAt?: string; role?: string }[],
  lastViewedAt: string | null,
): number {
  return users.filter((user) => {
    if (user.role === "ADMIN") return false;
    return createdAfter(user.createdAt, lastViewedAt);
  }).length;
}

/** Queue: dealer agencies awaiting approval. */
export function countPendingDealers(
  developers: { status: string }[],
): number {
  return developers.filter((developer) => developer.status === "PENDING_REVIEW").length;
}

/** Unseen: newsletter emails subscribed after this admin last opened Newsletter. */
export function countUnseenNewsletter(
  signups: { subscribedAt?: string }[],
  lastViewedAt: string | null,
): number {
  return signups.filter((item) => createdAfter(item.subscribedAt, lastViewedAt)).length;
}

/** Queue: account deletion requests still awaiting admin action. */
export function countPendingDeletions(
  requests: { status: string }[],
): number {
  return requests.filter((request) => request.status === "PENDING").length;
}
