import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { sendStaffLeadEmail } from "@/lib/email/resend";
import { getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { parseInquiryNotes } from "@/lib/parse-inquiry-notes";
import { clientIp, enforce } from "@/lib/rate-limit";
import { absoluteUrl } from "@/lib/seo/site";
import { propertyPath } from "@/lib/seo/slug";

export const runtime = "nodejs";

/**
 * Email staff about a just-created inquiry. Only reads the saved doc (no client-supplied
 * content) and marks it `notifiedAt`, so it is safe to call publicly and never double-sends.
 */
export async function POST(request: Request) {
  const blocked = await enforce([["inquiry-notify-ip", clientIp(request), 10, 600_000]]);
  if (blocked) return blocked;
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  const id = String(body.id ?? "").trim();
  if (!id || id.length > 128 || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid inquiry id." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = db.collection("inquiries").doc(id);
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.notifiedAt) return null;
      tx.update(ref, { notifiedAt: FieldValue.serverTimestamp() });
      return snap.data() ?? {};
    });
    if (!claimed) return NextResponse.json({ sent: false });

    const propertyId = String(claimed.propertyId ?? "");
    const property = propertyId ? (await db.collection("properties").doc(propertyId).get()).data() : undefined;
    const title = property ? String(property.title ?? "") : "";
    const notes = parseInquiryNotes(String(claimed.notes ?? ""));

    const result = await sendStaffLeadEmail({
      kind: "inquiry",
      entityId: id,
      propertyTitle: title || undefined,
      propertyUrl: title
        ? absoluteUrl(propertyPath({ id: propertyId, title, city: String(property?.city ?? "") }))
        : undefined,
      rows: notes.fullName
        ? [
            ["Name", notes.fullName],
            ["Phone", notes.phone],
            ["Email", notes.email],
            ["Visit date", notes.visitDate],
            ["Message", notes.message],
          ]
        : [["Details", notes.raw]],
    });
    return NextResponse.json({ sent: result.sent });
  } catch (error) {
    console.error("[api/inquiries/notify]", error);
    return NextResponse.json({ error: "Could not send notification." }, { status: 500 });
  }
}
