import { NextResponse } from "next/server";
import { ALL_ADMIN_MODULES, normalizePermissions, type AdminModule } from "@/lib/admin/modules";
import { requireSuperAdmin, staffDocFromData } from "@/lib/admin/require-super-admin";
import { staffApiErrorResponse } from "@/lib/admin/staff-api-error";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

type Ctx = { params: { uid: string } };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const authz = await requireSuperAdmin(request);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const { uid } = context.params;
    if (!uid || uid === authz.caller.uid) {
      return NextResponse.json({ error: "Invalid staff member." }, { status: 400 });
    }

    let body: {
      fullName?: string;
      permissions?: string[];
      active?: boolean;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection("admins").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }
    const existing = snap.data() as Record<string, unknown>;
    if (existing.role !== "staff") {
      return NextResponse.json({ error: "Only staff accounts can be edited here." }, { status: 400 });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (typeof body.fullName === "string" && body.fullName.trim().length >= 2) {
      patch.fullName = body.fullName.trim();
    }

    if (body.permissions !== undefined) {
      const perms = normalizePermissions(body.permissions).filter((p): p is AdminModule =>
        (ALL_ADMIN_MODULES as readonly string[]).includes(p),
      );
      if (perms.length === 0) {
        return NextResponse.json({ error: "Select at least one module permission." }, { status: 400 });
      }
      patch.permissions = perms;
    }

    if (typeof body.active === "boolean") {
      patch.active = body.active;
      await getAdminAuth().updateUser(uid, { disabled: !body.active });
    }

    if (typeof patch.fullName === "string") {
      try {
        await getAdminAuth().updateUser(uid, { displayName: String(patch.fullName) });
      } catch {
        /* non-fatal */
      }
    }

    await ref.set(patch, { merge: true });
    const next = await ref.get();
    return NextResponse.json({
      staff: staffDocFromData(uid, next.data() as Record<string, unknown>),
    });
  } catch (error) {
    return staffApiErrorResponse("PATCH /api/admin/staff/[uid]", error, 500, "Could not update staff.");
  }
}

export async function DELETE(request: Request, context: Ctx) {
  try {
    const authz = await requireSuperAdmin(request);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const { uid } = context.params;
    if (!uid || uid === authz.caller.uid) {
      return NextResponse.json({ error: "Invalid staff member." }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection("admins").doc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }
    if ((snap.data() as Record<string, unknown>).role !== "staff") {
      return NextResponse.json({ error: "Only staff accounts can be deleted here." }, { status: 400 });
    }

    await getAdminAuth().deleteUser(uid);
    await ref.delete();
    try {
      await db.collection("users").doc(uid).delete();
    } catch {
      /* optional profile cleanup */
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return staffApiErrorResponse("DELETE /api/admin/staff/[uid]", error, 500, "Could not delete staff.");
  }
}
