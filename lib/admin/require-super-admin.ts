import { ALL_ADMIN_MODULES, normalizePermissions, type AdminDoc, type AdminModule, type AdminPanelRole } from "@/lib/admin/modules";
import {
  getAdminAuth,
  getAdminDb,
  isFirebaseAdminConfigured,
  readAdminClientEmail,
  readAdminProjectId,
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

  console.info("[requireSuperAdmin] token received", {
    length: token.length,
    prefix: token.slice(0, 10),
    suffix: token.slice(-10),
    adminProjectId: readAdminProjectId(),
    adminClientEmail: readAdminClientEmail(),
  });

  // Step A — verify the end-user Firebase ID token (local JWT check; does not call Firestore).
  let decoded: { uid: string; email?: string };
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
    console.info("[requireSuperAdmin] verifyIdToken ok", {
      uid: decoded.uid,
      email: decoded.email ?? null,
    });
  } catch (error) {
    console.error("[requireSuperAdmin] verifyIdToken failed", error);
    const message = errorMessage(error);
    const code = errorCode(error);
    if (isServiceAccountAuthFailure(error)) {
      return {
        ok: false,
        status: 503,
        error: `Firebase Admin credentials error while verifying token${code ? ` (${code})` : ""}: ${message}`,
      };
    }
    return {
      ok: false,
      status: 401,
      error: code
        ? `Invalid or expired auth token (${code}): ${message}`
        : `Invalid or expired auth token: ${message}`,
    };
  }

  // Step B — load admin/staff role from Firestore via the service account.
  let caller: VerifiedAdminCaller | null;
  try {
    caller = await loadAdminCaller(decoded.uid, decoded.email ?? "");
  } catch (error) {
    console.error("[requireSuperAdmin] loadAdminCaller / Firestore failed", error);
    const message = errorMessage(error);
    const code = errorCode(error);
    if (isServiceAccountAuthFailure(error)) {
      return {
        ok: false,
        status: 503,
        error:
          `Firebase Admin service account cannot access Firestore (${code || "UNAUTHENTICATED"}). ` +
          `Confirm FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY ` +
          `are copied from the same service-account JSON for project "${readAdminProjectId()}", ` +
          `the key is not revoked, and the SA has Cloud Datastore User (or Firebase Admin). Detail: ${message}`,
      };
    }
    return {
      ok: false,
      status: 503,
      error: `Could not load admin profile from Firestore${code ? ` (${code})` : ""}: ${message}`,
    };
  }

  if (!caller) {
    return { ok: false, status: 403, error: "Not an admin account." };
  }
  if (caller.adminRole !== "super_admin") {
    return { ok: false, status: 403, error: "Only Super Admins can manage staff." };
  }
  return { ok: true, caller };
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
