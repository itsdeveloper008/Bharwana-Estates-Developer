import { ALL_ADMIN_MODULES, normalizePermissions, type AdminDoc, type AdminModule, type AdminPanelRole } from "@/lib/admin/modules";
import {
  getAdminAuth,
  getAdminDb,
  isFirebaseAdminConfigured,
} from "@/lib/firebase/admin";

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

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code ?? "");
  }
  return "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isServiceAccountAuthFailure(error: unknown): boolean {
  const message = errorMessage(error);
  const code = errorCode(error);
  return (
    code === "16" ||
    code === "UNAUTHENTICATED" ||
    message.includes("UNAUTHENTICATED") ||
    message.includes("invalid authentication credentials") ||
    message.includes("Failed to parse private key") ||
    message.includes("FIREBASE_ADMIN_PRIVATE_KEY") ||
    message.includes("error:1E") ||
    message.includes("DECODER") ||
    code.startsWith("app/")
  );
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

    // Deny by default: only explicit allow-listed roles are authorized.
    const rawRole = String(data.role ?? "");
    if (rawRole !== "staff" && rawRole !== "super_admin") {
      return null;
    }
    const adminRole: AdminPanelRole = rawRole;

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

/**
 * Server-side gate for Admin SDK staff routes (`/api/admin/*`).
 * Verifies the caller's Firebase ID token, then loads `admins/{uid}` (or legacy
 * users.role) via the service account — never trusts client-claimed permissions.
 * Do not log token contents; verifyIdToken failures stay in console.error only.
 */
export async function requireVerifiedAdmin(
  request: Request,
): Promise<{ ok: true; caller: VerifiedAdminCaller } | { ok: false; status: number; error: string }> {
  if (!isFirebaseAdminConfigured()) {
    console.error("[requireVerifiedAdmin] Firebase Admin SDK is not configured");
    return {
      ok: false,
      status: 503,
      error: "Admin service is temporarily unavailable.",
    };
  }

  const token = bearerToken(request);
  if (!token) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  let decoded: { uid: string; email?: string };
  try {
    // Reject revoked sessions (e.g. after staff deactivate / password change).
    decoded = await getAdminAuth().verifyIdToken(token, true);
  } catch (error) {
    console.error("[requireVerifiedAdmin] verifyIdToken failed", {
      code: errorCode(error),
      message: errorMessage(error),
      serviceAccountFailure: isServiceAccountAuthFailure(error),
    });
    if (isServiceAccountAuthFailure(error)) {
      return {
        ok: false,
        status: 503,
        error: "Admin service is temporarily unavailable.",
      };
    }
    return {
      ok: false,
      status: 401,
      error: "Invalid or expired session.",
    };
  }

  let caller: VerifiedAdminCaller | null;
  try {
    caller = await loadAdminCaller(decoded.uid, decoded.email ?? "");
  } catch (error) {
    console.error("[requireVerifiedAdmin] loadAdminCaller / Firestore failed", {
      code: errorCode(error),
      message: errorMessage(error),
      serviceAccountFailure: isServiceAccountAuthFailure(error),
    });
    return {
      ok: false,
      status: 503,
      error: "Admin service is temporarily unavailable.",
    };
  }

  if (!caller) {
    return { ok: false, status: 403, error: "Not an admin account." };
  }
  return { ok: true, caller };
}

/** Super-admin only (staff management). */
export async function requireSuperAdmin(
  request: Request,
): Promise<{ ok: true; caller: VerifiedAdminCaller } | { ok: false; status: number; error: string }> {
  const authz = await requireVerifiedAdmin(request);
  if (!authz.ok) return authz;
  if (authz.caller.adminRole !== "super_admin") {
    return { ok: false, status: 403, error: "Only Super Admins can manage staff." };
  }
  return authz;
}

/** Super-admin or staff with the given module permission. */
export async function requireAdminModule(
  request: Request,
  module: AdminModule,
): Promise<{ ok: true; caller: VerifiedAdminCaller } | { ok: false; status: number; error: string }> {
  const authz = await requireVerifiedAdmin(request);
  if (!authz.ok) return authz;
  if (authz.caller.adminRole === "super_admin") return authz;
  if (!authz.caller.permissions.includes(module)) {
    return { ok: false, status: 403, error: `Missing permission for module: ${module}.` };
  }
  return authz;
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
