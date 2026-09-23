import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/admin/require-super-admin";
import { sendPropertyRejectionEmail, type SendResult } from "@/lib/email/resend";
import { getAdminDb } from "@/lib/firebase/admin";
import type { PropertyStatus, PropertyStatusHistoryEntry } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

export async function POST(request: Request, context: RouteContext) {
  try {
    const submissions = await requireAdminModule(request, "submissions");
    const authz = submissions.ok
      ? submissions
      : await requireAdminModule(request, "properties");
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const propertyId = context.params.id?.trim();
    if (!propertyId) {
      return NextResponse.json({ error: "Missing property id." }, { status: 400 });
    }

    let body: { reason?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const reason = String(body.reason ?? "").trim();
    if (!reason) {
      return NextResponse.json({ error: "Please provide a reason for rejection." }, { status: 400 });
    }

    const db = getAdminDb();
    const ref = db.collection("properties").doc(propertyId);
    const by = authz.caller.fullName || authz.caller.email || "Admin";

    const claim = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        return { ok: false as const, status: 404 as const, error: "Property not found." };
      }

      const data = snap.data() as Record<string, unknown>;
      const at = new Date().toISOString();
      const previousHistory = Array.isArray(data.statusHistory)
        ? (data.statusHistory as PropertyStatusHistoryEntry[])
        : [];
      const historyEntry: PropertyStatusHistoryEntry = {
        status: "REJECTED",
        reason,
        at,
        by,
      };
      const statusHistory = [...previousHistory, historyEntry].slice(-12);

      const alreadySent =
        typeof data.rejectionEmailSentAt === "string" && Boolean(data.rejectionEmailSentAt);
      const existingClaim =
        typeof data.rejectionEmailClaimedAt === "string" ? data.rejectionEmailClaimedAt : "";
      const emailClaimAt = alreadySent ? existingClaim : existingClaim || at;

      const update: Record<string, unknown> = {
        status: "REJECTED" satisfies PropertyStatus,
        rejectionReason: reason,
        statusUpdatedAt: at,
        statusHistory,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (!alreadySent) {
        update.rejectionEmailClaimedAt = emailClaimAt;
      }

      tx.update(ref, update);

      return {
        ok: true as const,
        data,
        shouldEmail: !alreadySent,
        emailClaimAt,
      };
    });

    if (!claim.ok) {
      return NextResponse.json({ error: claim.error }, { status: claim.status });
    }

    // Email is best-effort — never fail the reject action if Resend is down.
    let emailStatus: "sent" | "skipped" | "failed" | "duplicate" = "skipped";
    if (!claim.shouldEmail) {
      emailStatus = "duplicate";
      console.info("[api/admin/properties/reject] skipping email (already sent for this rejection)", {
        propertyId,
      });
    } else {
      try {
        const ownerUserId = claim.data.ownerUserId ? String(claim.data.ownerUserId) : "";
        const developerId = claim.data.developerId ? String(claim.data.developerId) : "";
        let to = "";
        let recipientName = "";
        let listingsPath: "/owner" | "/dealer" = "/owner";

        if (ownerUserId) {
          const userSnap = await db.collection("users").doc(ownerUserId).get();
          if (userSnap.exists) {
            const userData = userSnap.data() as Record<string, unknown>;
            to = String(userData.email ?? "");
            recipientName = String(userData.fullName ?? "");
            if (String(userData.role ?? "") === "DEALER") listingsPath = "/dealer";
          }
        }

        if (!to && developerId) {
          const developerSnap = await db.collection("developers").doc(developerId).get();
          const dealerUserId = developerSnap.exists
            ? String((developerSnap.data() as Record<string, unknown>).dealerUserId ?? "")
            : "";
          if (dealerUserId) {
            const userSnap = await db.collection("users").doc(dealerUserId).get();
            if (userSnap.exists) {
              const userData = userSnap.data() as Record<string, unknown>;
              to = String(userData.email ?? "");
              recipientName = String(userData.fullName ?? "");
              listingsPath = "/dealer";
            }
          }
        }

        const emailResult: SendResult = await sendPropertyRejectionEmail({
          to,
          recipientName,
          propertyTitle: String(claim.data.title ?? "Listing"),
          reason,
          listingsPath,
          entityId: `${propertyId}-${claim.emailClaimAt}`,
        });

        if (emailResult.sent) {
          emailStatus = "sent";
          await ref
            .update({
              rejectionEmailSentAt: new Date().toISOString(),
            })
            .catch((error) => {
              console.error("[api/admin/properties/reject] could not stamp rejectionEmailSentAt", error);
            });
        } else if ("skipped" in emailResult && emailResult.skipped) {
          emailStatus = "skipped";
          console.warn("[api/admin/properties/reject] email skipped", {
            propertyId,
            reason: emailResult.reason,
          });
        } else {
          emailStatus = "failed";
          console.error("[api/admin/properties/reject] email failed (reject still committed)", {
            propertyId,
            error: "error" in emailResult ? emailResult.error : "unknown",
          });
        }
      } catch (error) {
        emailStatus = "failed";
        console.error("[api/admin/properties/reject] email threw (reject still committed)", {
          propertyId,
          error,
        });
      }
    }

    return NextResponse.json({ ok: true, email: emailStatus });
  } catch (error) {
    console.error("[api/admin/properties/reject]", error);
    return NextResponse.json({ error: "Could not reject property." }, { status: 500 });
  }
}
