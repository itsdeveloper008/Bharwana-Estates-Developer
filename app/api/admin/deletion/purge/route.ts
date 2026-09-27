import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/admin/require-super-admin";
import { getAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

/**
 * Purge Firestore data for a user (deletion-request Process).
 * Admin SDK so deletion staff are not blocked by cross-module client rules.
 */
export async function POST(request: Request) {
  try {
    const authz = await requireAdminModule(request, "deletion");
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    let body: { uid?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const uid = String(body.uid ?? "").trim();
    if (!uid) {
      return NextResponse.json({ error: "Missing uid." }, { status: 400 });
    }

    const db = getAdminDb();
    const [propertySnap, inquirySnap, developerSnap, transactionSnap] = await Promise.all([
      db.collection("properties").where("ownerUserId", "==", uid).get(),
      db.collection("inquiries").where("buyerId", "==", uid).get(),
      db.collection("developers").where("dealerUserId", "==", uid).get(),
      db.collection("transactions").get().catch(() => null),
    ]);

    const developerIds = developerSnap.docs.map((d) => d.id);
    const batchOps: Promise<unknown>[] = [];

    if (transactionSnap) {
      for (const doc of transactionSnap.docs) {
        if (developerIds.includes(String(doc.data().developerId ?? ""))) {
          batchOps.push(doc.ref.update({ dealerDeleted: true }));
        }
      }
    }

    for (const doc of developerSnap.docs) {
      batchOps.push(
        doc.ref.update({
          accountDeleted: true,
          dealerUserId: null,
          updatedAt: FieldValue.serverTimestamp(),
        }),
      );
    }
    for (const doc of propertySnap.docs) {
      batchOps.push(doc.ref.delete());
    }
    for (const doc of inquirySnap.docs) {
      batchOps.push(doc.ref.delete());
    }
    batchOps.push(db.collection("users").doc(uid).delete().catch(() => undefined));

    await Promise.all(batchOps);

    return NextResponse.json({
      ok: true,
      deletedProperties: propertySnap.size,
      deletedInquiries: inquirySnap.size,
      flaggedDevelopers: developerSnap.size,
    });
  } catch (error) {
    console.error("[api/admin/deletion/purge]", error);
    return NextResponse.json({ error: "Could not purge user data." }, { status: 500 });
  }
}
