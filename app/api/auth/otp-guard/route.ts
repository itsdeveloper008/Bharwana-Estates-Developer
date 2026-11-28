import { NextResponse } from "next/server";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { clientIp, limit } from "@/lib/rate-limit";
import {
  clearWrongCodes,
  guardState,
  guardTarget,
  lockedMessage,
  recordWrongCode,
} from "@/lib/server/code-guard";

export const runtime = "nodejs";

/**
 * Three wrong SMS codes lock a phone number for two hours (app + website).
 * Firebase checks the SMS code on the device, so the device reports each result:
 * - check: is this number locked? (before sending a code and before verifying)
 * - fail:  one wrong code
 * - pass:  the code was right; needs the fresh ID token for that same number
 */
export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({ blockedUntil: null, triesLeft: null, checkSkipped: true });
    }
    const body = (await request.json().catch(() => ({}))) as {
      phone?: string;
      action?: string;
      idToken?: string;
    };
    const target = guardTarget(String(body.phone ?? ""));
    if (!target || !target.startsWith("+")) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }

    if (body.action === "fail") {
      const { ok } = await limit("otp-guard-fail", clientIp(request), 30, 60 * 60 * 1000);
      if (!ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
      const state = await recordWrongCode(target);
      return NextResponse.json({
        ...state,
        error: state.blockedUntil ? lockedMessage(state.blockedUntil) : null,
      });
    }

    if (body.action === "pass") {
      try {
        const decoded = await getAdminAuth().verifyIdToken(String(body.idToken ?? ""));
        if (decoded.phone_number !== target) throw new Error("phone mismatch");
      } catch {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      await clearWrongCodes(target);
      return NextResponse.json({ blockedUntil: null, triesLeft: 3 });
    }

    const state = await guardState(target);
    return NextResponse.json({
      ...state,
      error: state.blockedUntil ? lockedMessage(state.blockedUntil) : null,
    });
  } catch (error) {
    console.error("[api/auth/otp-guard] failed", error);
    return NextResponse.json({ blockedUntil: null, triesLeft: null, checkSkipped: true });
  }
}
