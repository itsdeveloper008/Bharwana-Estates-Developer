import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * One-shot admin grant endpoint. Remove after use.
 * POST /api/admin/bootstrap-grant?secret=...
 */
const EXPECTED_SECRET = "bharwana-grant-20260930-xq";
const FALLBACK_UID = "xGQIIX0VBlfjPuFLxLkrRBV4Bhn2";
const EMAIL = "info@bharwanaestates.com";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret") ?? "";
    if (secret !== EXPECTED_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({ error: "Firebase Admin not configured" }, { status: 500 });
    }

    const auth = getAdminAuth();
    const db = getAdminDb();

    let uid = FALLBACK_UID;
    let email = EMAIL;
    let fullName = "Bharwana Admin";

    try {
      const byEmail = await auth.getUserByEmail(EMAIL);
      uid = byEmail.uid;
      email = (byEmail.email ?? EMAIL).toLowerCase();
      fullName = byEmail.displayName || fullName;
    } catch {
      try {
        const byUid = await auth.getUser(FALLBACK_UID);
        uid = byUid.uid;
        email = (byUid.email ?? EMAIL).toLowerCase();
        fullName = byUid.displayName || fullName;
      } catch {
        // Keep fallback UID/email; still write allow-list docs.
      }
    }

    const now = new Date().toISOString();
    await db.collection("admins").doc(uid).set(
      {
        email,
        fullName,
        role: "super_admin",
        permissions: [],
        active: true,
        updatedAt: now,
      },
      { merge: true },
    );

    const usersRef = db.collection("users").doc(uid);
    const existing = await usersRef.get();
    await usersRef.set(
      {
        email,
        fullName,
        role: "ADMIN",
        phone: existing.exists ? (existing.data()?.phone ?? "") : "",
        savedPropertyIds: existing.exists ? (existing.data()?.savedPropertyIds ?? []) : [],
        updatedAt: now,
        ...(existing.exists ? {} : { createdAt: now }),
      },
      { merge: true },
    );

    const adminSnap = await db.collection("admins").doc(uid).get();
    const userSnap = await db.collection("users").doc(uid).get();

    return NextResponse.json({
      ok: true,
      uid,
      email,
      admin: adminSnap.data() ?? null,
      userRole: userSnap.data()?.role ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Grant failed";
    console.error("[bootstrap-grant]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
