import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/admin/require-super-admin";
import { isDeliverableUserEmail, sendDealerRejectionEmail, type SendResult } from "@/lib/email/resend";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { DeveloperStatus, DeveloperStatusHistoryEntry } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = { params: { id: string } };

async function resolveDealerRecipient(input: {
  dealerUserId: string;
  firestoreEmail: string;
  firestoreName: string;
}): Promise<{ to: string; recipientName: string }> {
  let to = input.firestoreEmail;
  let recipientName = input.firestoreName;

  if (isDeliverableUserEmail(to)) {
    return { to, recipientName };
  }

  // Firestore may hold a synthetic phone email or be empty; Auth often has the real address.
  try {
    const authUser = await getAdminAuth().getUser(input.dealerUserId);
    if (isDeliverableUserEmail(authUser.email)) {
      to = authUser.email!;
    }
    if (!recipientName.trim() && authUser.displayName?.trim()) {
      recipientName = authUser.displayName.trim();
    }
  } catch (error) {
    console.warn("[api/admin/developers/reject] Auth email lookup failed", {
      dealerUserId: input.dealerUserId,
      error,
    });
  }

  return { to, recipientName };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const authz = await requireAdminModule(request, "dealers");
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }

    const developerId = context.params.id?.trim();
    if (!developerId) {
      return NextResponse.json({ error: "Missing dealer id." }, { status: 400 });
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
    const ref = db.collection("developers").doc(developerId);
    const by = authz.caller.fullName || authz.caller.email || "Admin";

    const claim = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        return { ok: false as const, status: 404 as const, error: "Dealer not found." };
      }

      const data = snap.data() as Record<string, unknown>;
      const at = new Date().toISOString();
      const previousStatus = String(data.status ?? "");
      // Leaving REJECTED (approve/resubmit) should start a new email cycle. Defensive if stamps linger.
      const isFreshRejectionCycle = previousStatus !== "REJECTED";
      const previousHistory = Array.isArray(data.statusHistory)
        ? (data.statusHistory as DeveloperStatusHistoryEntry[])
        : [];
      const historyEntry: DeveloperStatusHistoryEntry = {
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
      const shouldEmail = isFreshRejectionCycle || !alreadySent;
      const emailClaimAt = shouldEmail
        ? isFreshRejectionCycle || !existingClaim
          ? at
          : existingClaim
        : existingClaim || at;

      const update: Record<string, unknown> = {
        status: "REJECTED" satisfies DeveloperStatus,
        rejectionReason: reason,
        statusUpdatedAt: at,
        statusHistory,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (shouldEmail) {
        update.rejectionEmailClaimedAt = emailClaimAt;
        if (isFreshRejectionCycle && alreadySent) {
          update.rejectionEmailSentAt = FieldValue.delete();
        }
      }

      tx.update(ref, update);

      return {
        ok: true as const,
        data,
        shouldEmail,
        emailClaimAt,
        isFreshRejectionCycle,
      };
    });

    if (!claim.ok) {
      return NextResponse.json({ error: claim.error }, { status: claim.status });
    }

    // Email is best-effort — never fail the reject action if Resend is down.
    let emailStatus: "sent" | "skipped" | "failed" | "duplicate" = "skipped";
    if (!claim.shouldEmail) {
      emailStatus = "duplicate";
      console.info("[api/admin/developers/reject] skipping email (already sent for this rejection)", {
        developerId,
      });
    } else {
      try {
        const dealerUserId = claim.data.dealerUserId ? String(claim.data.dealerUserId) : "";
        let to = "";
        let recipientName = "";

        if (dealerUserId) {
          const userSnap = await db.collection("users").doc(dealerUserId).get();
          if (userSnap.exists) {
            const userData = userSnap.data() as Record<string, unknown>;
            to = String(userData.email ?? "");
            recipientName = String(userData.fullName ?? "");
          }
          const resolved = await resolveDealerRecipient({
            dealerUserId,
            firestoreEmail: to,
            firestoreName: recipientName,
          });
          to = resolved.to;
          recipientName = resolved.recipientName;
        } else {
          console.warn("[api/admin/developers/reject] no dealerUserId on developer doc", {
            developerId,
          });
        }

        const emailResult: SendResult = await sendDealerRejectionEmail({
          to,
          recipientName,
          companyName: String(claim.data.companyName ?? "Agency"),
          reason,
          entityId: `${developerId}-${claim.emailClaimAt}`,
        });

        if (emailResult.sent) {
          emailStatus = "sent";
          await ref
            .update({
              rejectionEmailSentAt: new Date().toISOString(),
            })
            .catch((error) => {
              console.error("[api/admin/developers/reject] could not stamp rejectionEmailSentAt", error);
            });
        } else if ("skipped" in emailResult && emailResult.skipped) {
          emailStatus = "skipped";
          console.warn("[api/admin/developers/reject] email skipped", {
            developerId,
            dealerUserId: dealerUserId || null,
            to: to || null,
            reason: emailResult.reason,
          });
        } else {
          emailStatus = "failed";
          console.error("[api/admin/developers/reject] email failed (reject still committed)", {
            developerId,
            dealerUserId: dealerUserId || null,
            to: to || null,
            error: "error" in emailResult ? emailResult.error : "unknown",
          });
        }
      } catch (error) {
        emailStatus = "failed";
        console.error("[api/admin/developers/reject] email threw (reject still committed)", {
          developerId,
          error,
        });
      }
    }

    return NextResponse.json({ ok: true, email: emailStatus });
  } catch (error) {
    console.error("[api/admin/developers/reject]", error);
    return NextResponse.json({ error: "Could not reject dealer." }, { status: 500 });
  }
}
