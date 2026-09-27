import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/admin/require-super-admin";
import { getAdminDb } from "@/lib/firebase/admin";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";

const PUBLIC_ROLES: UserRole[] = ["INDIVIDUAL", "BUYER", "HOUSE_OWNER", "DEALER"];

/**
 * Create a marketplace user profile on behalf of an owner/dealer
 * (Admin Add Property → Create owner). Uses Admin SDK so staff with
 * properties access are not blocked by hasPerm('users') alone.
 */
export async function POST(request: Request) {
  try {
    let authz = await requireAdminModule(request, "users");
    if (!authz.ok) authz = await requireAdminModule(request, "properties");
    if (!authz.ok) authz = await requireAdminModule(request, "submissions");
    if (!authz.ok) authz = await requireAdminModule(request, "dealers");
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    let body: {
      id?: string;
      fullName?: string;
      email?: string;
      phone?: string;
      role?: UserRole;
      avatarUrl?: string;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const id = String(body.id ?? "").trim();
    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const role = body.role as UserRole;

    if (!id || !fullName || !email) {
      return NextResponse.json({ error: "id, fullName, and email are required." }, { status: 400 });
    }
    if (!PUBLIC_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "Role must be INDIVIDUAL, BUYER, HOUSE_OWNER, or DEALER." },
        { status: 400 },
      );
    }

    const db = getAdminDb();
    const ref = db.collection("users").doc(id);
    const payload: Record<string, unknown> = {
      fullName,
      email,
      phone,
      role,
      savedPropertyIds: [],
      createdAt: FieldValue.serverTimestamp(),
      createdByAdmin: authz.caller.uid,
    };
    if (body.avatarUrl) payload.avatarUrl = String(body.avatarUrl);

    await ref.set(payload, { merge: true });

    return NextResponse.json({
      ok: true,
      user: { id, fullName, email, phone, role, avatarUrl: body.avatarUrl, savedPropertyIds: [] },
    });
  } catch (error) {
    console.error("[api/admin/users POST]", error);
    return NextResponse.json({ error: "Could not create user profile." }, { status: 500 });
  }
}
