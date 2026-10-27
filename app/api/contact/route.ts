import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { sendStaffLeadEmail } from "@/lib/email/resend";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { clientIp, enforce } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Public contact lead intake (BED-SEC-39 / CT-BW-05).
 * Rate-limited; Admin SDK write so Firestore rules can deny anonymous creates.
 */
export async function POST(request: Request) {
  try {
    const blocked = await enforce([["contact-ip", clientIp(request), 5, 3_600_000]]);
    if (blocked) return blocked;

    let body: { name?: string; email?: string; message?: string; phone?: string; propertyId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
    const name = String(body.name ?? "").trim().slice(0, 120);
    const message = String(body.message ?? "").trim().slice(0, 2000);
    const phone = String(body.phone ?? "").trim().slice(0, 20);
    const propertyId = String(body.propertyId ?? "").trim().slice(0, 128);

    if (!email || email.length < 3 || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: "Contact form is temporarily unavailable. Try again later." },
        { status: 503 },
      );
    }

    const payload: Record<string, unknown> = {
      email,
      createdAt: FieldValue.serverTimestamp(),
    };
    if (name) payload.name = name;
    if (message) payload.message = message;
    if (phone) payload.phone = phone;
    if (propertyId) payload.propertyId = propertyId;

    const saved = await getAdminDb().collection("contactMessages").add(payload);
    // Message is saved either way; an email failure is logged by the sender, not surfaced.
    await sendStaffLeadEmail({
      kind: "contact",
      entityId: saved.id,
      rows: [
        ["Name", name],
        ["Phone", phone],
        ["Email", email],
        ["Message", message],
      ],
    }).catch((error) => console.error("[api/contact] lead email", error));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/contact] unexpected", error);
    return NextResponse.json({ error: "Could not send message. Try again later." }, { status: 500 });
  }
}
