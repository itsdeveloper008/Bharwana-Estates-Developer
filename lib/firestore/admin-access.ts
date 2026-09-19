import { doc, getDoc } from "firebase/firestore";
import {
  ALL_ADMIN_MODULES,
  normalizePermissions,
  type AdminModule,
  type AdminPanelRole,
} from "@/lib/admin/modules";
import { getDb } from "@/lib/firebase/client";
import { getUserDoc } from "@/lib/firestore/users";
import type { User } from "@/lib/types";

const ADMINS_COLLECTION = "admins";

/**
 * Dual-path admin gate used by both client AdminAuth and server staff APIs:
 * 1. Preferred: document in `admins/{uid}` (role + permissions; client writes denied by rules)
 * 2. Legacy: `users/{uid}.role === "ADMIN"` treated as super-admin
 * Prefer granting via `admins` going forward; do not assume marketplace ADMIN role alone.
 */
export type AdminAuthorizationResult =
  | {
      authorized: true;
      profile: User;
      source: "users.role" | "admins.collection";
      adminRole: AdminPanelRole;
      permissions: AdminModule[];
      active: boolean;
    }
  | {
      authorized: false;
      profile: User | null;
      reason: "missing_profile" | "role_mismatch" | "not_listed" | "inactive";
    };

function profileFromAdminDoc(uid: string, data: Record<string, unknown>, fallbackEmail: string): User {
  return {
    id: uid,
    fullName: String(data.fullName ?? data.name ?? "Admin"),
    email: String(data.email ?? fallbackEmail).toLowerCase(),
    phone: String(data.phone ?? ""),
    role: "ADMIN",
    avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
    savedPropertyIds: [],
  };
}

export async function resolveAdminAuthorization(
  uid: string,
  fallbackEmail = "",
): Promise<AdminAuthorizationResult> {
  const profile = await getUserDoc(uid);
  const db = getDb();

  if (db) {
    const adminSnap = await getDoc(doc(db, ADMINS_COLLECTION, uid));
    if (adminSnap.exists()) {
      const data = adminSnap.data() as Record<string, unknown>;
      if (data.active === false) {
        return {
          authorized: false,
          profile: profile ?? profileFromAdminDoc(uid, data, fallbackEmail),
          reason: "inactive",
        };
      }

      const rawRole = String(data.role ?? "");
      const adminRole: AdminPanelRole = rawRole === "staff" ? "staff" : "super_admin";
      const permissions =
        adminRole === "super_admin" ? [...ALL_ADMIN_MODULES] : normalizePermissions(data.permissions);

      const adminProfile = profile
        ? { ...profile, role: "ADMIN" as const, fullName: String(data.fullName ?? profile.fullName) }
        : profileFromAdminDoc(uid, data, fallbackEmail);

      return {
        authorized: true,
        profile: adminProfile,
        source: "admins.collection",
        adminRole,
        permissions,
        active: true,
      };
    }
  }

  if (profile?.role === "ADMIN") {
    return {
      authorized: true,
      profile,
      source: "users.role",
      adminRole: "super_admin",
      permissions: [...ALL_ADMIN_MODULES],
      active: true,
    };
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("[Bharwana Admin] Authorization denied", {
      uid,
      checkedPaths: [`users/${uid}.role === "ADMIN"`, `admins/${uid} document exists`],
      usersRole: profile?.role ?? null,
      usersDocExists: Boolean(profile),
    });
  }

  if (!profile) {
    return { authorized: false, profile: null, reason: "missing_profile" };
  }

  return { authorized: false, profile, reason: "role_mismatch" };
}
