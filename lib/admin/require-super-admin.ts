import { ALL_ADMIN_MODULES, normalizePermissions, type AdminDoc, type AdminModule, type AdminPanelRole } from "@/lib/admin/modules";
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export type VerifiedAdminCaller = {
  uid: string;
  email: string;
  adminRole: AdminPanelRole;
  permissions: AdminModule[];
  fullName: string;
};

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

/** Resolve panel role from admins/{uid} + legacy users.role === ADMIN. */
export async function loadAdminCaller(uid: string, emailFallback = ""): Promise<VerifiedAdminCaller | null> {
  const db = getAdminDb();
  const adminSnap = await db.collection("admins").doc(uid).get();
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : null;
  const legacyAdmin = userData?.role === "ADMIN";

  if (adminSnap.exists) {
    const data = adminSnap.data() as Record<string, unknown>;
    const active = data.active !== false;
    if (!active) return null;

    const rawRole = String(data.role ?? "");
    const adminRole: AdminPanelRole =
      rawRole === "staff" ? "staff" : rawRole === "super_admin" ? "super_admin" : "super_admin";

    if (adminRole === "staff") {
      return {
        uid,
        email: String(data.email ?? emailFallback).toLowerCase(),
        adminRole: "staff",
        permissions: normalizePermissions(data.permissions),
        fullName: String(data.fullName ?? data.name ?? "Staff"),
      };
    }

    return {
      uid,
      email: String(data.email ?? emailFallback).toLowerCase(),
      adminRole: "super_admin",
      permissions: [...ALL_ADMIN_MODULES],
      fullName: String(data.fullName ?? data.name ?? userData?.fullName ?? "Admin"),
    };
  }

  if (legacyAdmin) {
    return {
      uid,
      email: String(userData?.email ?? emailFallback).toLowerCase(),
      adminRole: "super_admin",
      permissions: [...ALL_ADMIN_MODULES],
      fullName: String(userData?.fullName ?? "Admin"),
    };
  }

  return null;
}

export async function requireSuperAdmin(
  request: Request,
): Promise<{ ok: true; caller: VerifiedAdminCaller } | { ok: false; status: number; error: string }> {
  if (!isFirebaseAdminConfigured()) {
    return {
      ok: false,
      status: 503,
      error:
        "Staff APIs need Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    };
  }

  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Missing Authorization bearer token." };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const caller = await loadAdminCaller(decoded.uid, decoded.email ?? "");
    if (!caller) {
      return { ok: false, status: 403, error: "Not an admin account." };
    }
    if (caller.adminRole !== "super_admin") {
      return { ok: false, status: 403, error: "Only Super Admins can manage staff." };
    }
    return { ok: true, caller };
  } catch (error) {
    console.error("[requireSuperAdmin]", error);
    const message = error instanceof Error ? error.message : String(error);
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    // Surface Admin SDK / PEM issues clearly (not a bad user token).
    if (
      message.includes("FIREBASE_ADMIN_PRIVATE_KEY") ||
      message.includes("Failed to parse private key") ||
      message.includes("error:1E") ||
      message.includes("DECODER") ||
      code.startsWith("app/")
    ) {
      return {
        ok: false,
        status: 503,
        error: `Firebase Admin credentials error${code ? ` (${code})` : ""}: ${message}`,
      };
    }
    return {
      ok: false,
      status: 401,
      error: code ? `Invalid or expired auth token (${code}).` : "Invalid or expired auth token.",
    };
  }
}

export function staffDocFromData(uid: string, data: Record<string, unknown>): AdminDoc & { uid: string } {
  return {
    uid,
    role: "staff",
    permissions: normalizePermissions(data.permissions),
    fullName: String(data.fullName ?? ""),
    email: String(data.email ?? "").toLowerCase(),
    active: data.active !== false,
    createdAt: data.createdAt ? String(data.createdAt) : undefined,
    updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
    createdBy: data.createdBy ? String(data.createdBy) : undefined,
  };
}
