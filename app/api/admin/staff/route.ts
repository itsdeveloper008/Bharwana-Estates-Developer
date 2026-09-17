import { NextResponse } from "next/server";
import { ALL_ADMIN_MODULES, normalizePermissions, type AdminModule } from "@/lib/admin/modules";
import { requireSuperAdmin, staffDocFromData } from "@/lib/admin/require-super-admin";
import { staffApiErrorResponse } from "@/lib/admin/staff-api-error";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authz = await requireSuperAdmin(request);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const snap = await getAdminDb().collection("admins").where("role", "==", "staff").get();
    const staff = snap.docs.map((d) => staffDocFromData(d.id, d.data() as Record<string, unknown>));
    staff.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return NextResponse.json({ staff });
  } catch (error) {
    return staffApiErrorResponse("GET /api/admin/staff", error, 500, "Could not list staff.");
  }
}

export async function POST(request: Request) {
  // Outer try/catch so Admin SDK / jose ESM crashes still return JSON (not a bare Next 500).
  try {
    const authz = await requireSuperAdmin(request);
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    let body: {
      fullName?: string;
      email?: string;
      password?: string;
      permissions?: string[];
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const permissions = normalizePermissions(body.permissions);

    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (!email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (permissions.length === 0) {
      return NextResponse.json({ error: "Select at least one module permission." }, { status: 400 });
    }
    // Never allow Staff module via permissions array.
    const safePerms = permissions.filter((p): p is AdminModule =>
      (ALL_ADMIN_MODULES as readonly string[]).includes(p),
    );

    const auth = getAdminAuth();
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: false,
      disabled: false,
    });

    const now = new Date().toISOString();
    const doc = {
      role: "staff" as const,
      permissions: safePerms,
      fullName,
      email,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdBy: authz.caller.uid,
    };

    await getAdminDb().collection("admins").doc(userRecord.uid).set(doc);

    // Lightweight profile for display — not marketplace ADMIN.
    await getAdminDb()
      .collection("users")
      .doc(userRecord.uid)
      .set(
        {
          fullName,
          email,
          phone: "",
          role: "INDIVIDUAL",
          savedPropertyIds: [],
          createdAt: now,
          updatedAt: now,
          adminStaff: true,
        },
        { merge: true },
      );

    return NextResponse.json({
      staff: staffDocFromData(userRecord.uid, doc),
    });
  } catch (error: unknown) {
    return staffApiErrorResponse(
      "POST /api/admin/staff",
      error,
      500,
      "Could not create staff member.",
    );
  }
}
