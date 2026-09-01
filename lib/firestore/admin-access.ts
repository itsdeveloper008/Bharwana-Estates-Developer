import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { getUserDoc } from "@/lib/firestore/users";
import type { User } from "@/lib/types";

const ADMINS_COLLECTION = "admins";

export type AdminAuthorizationResult =
  | { authorized: true; profile: User; source: "users.role" | "admins.collection" }
  | { authorized: false; profile: User | null; reason: "missing_profile" | "role_mismatch" | "not_listed" };

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

  if (profile?.role === "ADMIN") {
    return { authorized: true, profile, source: "users.role" };
  }

  const db = getDb();
  if (db) {
    const adminSnap = await getDoc(doc(db, ADMINS_COLLECTION, uid));
    if (adminSnap.exists()) {
      const adminProfile = profile
        ? { ...profile, role: "ADMIN" as const }
        : profileFromAdminDoc(uid, adminSnap.data(), fallbackEmail);
      return { authorized: true, profile: adminProfile, source: "admins.collection" };
    }
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
