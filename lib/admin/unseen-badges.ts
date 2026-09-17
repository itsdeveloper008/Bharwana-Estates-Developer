import type { AdminModule } from "@/lib/admin/modules";

/** Modules that show unseen-count badges in the admin sidebar. */
export type AdminBadgeModule = Extract<
  AdminModule,
  "submissions" | "inquiries" | "users" | "dealers"
>;

export const ADMIN_BADGE_MODULES: AdminBadgeModule[] = [
  "submissions",
  "inquiries",
  "users",
  "dealers",
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

/** Seed "now" once so existing backlog does not all light up as unread. */
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

export function countUnseenSubmissions(
  properties: { status: string; createdAt?: string; statusUpdatedAt?: string }[],
  lastViewedAt: string | null,
): number {
  return properties.filter((property) => {
    if (property.status !== "PENDING_APPROVAL") return false;
    const stamp = property.statusUpdatedAt || property.createdAt;
    return createdAfter(stamp, lastViewedAt);
  }).length;
}

export function countUnseenInquiries(
  inquiries: { createdAt?: string }[],
  lastViewedAt: string | null,
): number {
  return inquiries.filter((item) => createdAfter(item.createdAt, lastViewedAt)).length;
}

export function countUnseenUsers(
  users: { createdAt?: string; role?: string }[],
  lastViewedAt: string | null,
): number {
  return users.filter((user) => {
    if (user.role === "ADMIN") return false;
    return createdAfter(user.createdAt, lastViewedAt);
  }).length;
}

export function countUnseenDealers(
  developers: { status: string; createdAt?: string }[],
  lastViewedAt: string | null,
): number {
  return developers.filter((developer) => {
    if (developer.status !== "PENDING_REVIEW") return false;
    return createdAfter(developer.createdAt, lastViewedAt);
  }).length;
}
