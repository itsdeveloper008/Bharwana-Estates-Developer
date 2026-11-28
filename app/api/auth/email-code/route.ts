import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendPasswordCodeEmail } from "@/lib/email/resend";
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { passwordMeetsPolicy } from "@/lib/password-policy";
import { clientIp, enforce } from "@/lib/rate-limit";
import {
  clearWrongCodes,
  guardState,
  guardTarget,
  lockedMessage,
  recordWrongCode,
} from "@/lib/server/code-guard";
import { isSyntheticPhoneEmail } from "@/lib/user-display";

export const runtime = "nodejs";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;

type Body = {
  action?: string;
  email?: string;
  purpose?: string;
  idToken?: string;
  code?: string;
  newPassword?: string;
};

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${email}:${code}`).digest("hex");

const codeDoc = (email: string) =>
  getAdminDb()
    .collection("emailPasswordCodes")
    .doc(createHash("sha256").update(email).digest("hex"));

/** Change password is for the signed-in account only: the token must belong to this email. */
async function signedInUid(idToken: string | undefined, email: string): Promise<string | null> {
  try {
    const decoded = await getAdminAuth().verifyIdToken(String(idToken ?? ""));
    return String(decoded.email ?? "").toLowerCase() === email ? decoded.uid : null;
  } catch {
    return null;
  }
}

/**
 * Forgot password / Change password by email code (app). The code goes only to the
 * email the account was registered with; three wrong codes lock that email for two hours.
 * - send:   { email, purpose: "reset" | "change", idToken? }
 * - check:  { email, code, purpose, idToken? }  the code is right (kept for verify)
 * - verify: { email, code, newPassword, purpose, idToken? }
 */
export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return fail("Password codes are unavailable right now. Try again later.", 503);
    }
    const body = (await request.json().catch(() => ({}))) as Body;
    const email = guardTarget(String(body.email ?? ""));
    if (!email || email.startsWith("+") || isSyntheticPhoneEmail(email)) {
      return fail("Enter a valid email address.", 400);
    }
    const purpose = body.purpose === "change" ? "change" : "reset";

    const limited = await enforce([
      ["email-code-ip", clientIp(request), 40, 60 * 60 * 1000],
      ["email-code-email", email, 15, 60 * 60 * 1000],
    ]);
    if (limited) return limited;

    const lock = await guardState(email);
    if (lock.blockedUntil) {
      return fail(lockedMessage(lock.blockedUntil), 423, { blockedUntil: lock.blockedUntil, triesLeft: 0 });
    }

    if (body.action === "send") {
      let uid: string;
      try {
        uid = (await getAdminAuth().getUserByEmail(email)).uid;
      } catch {
        return fail("No account uses this email. Check it, or use the one you signed up with.", 404);
      }
      if (purpose === "change" && (await signedInUid(body.idToken, email)) !== uid) {
        return fail("Enter the email of the account you are signed in to.", 403);
      }

      const doc = codeDoc(email);
      const previous = await doc.get();
      const sentAt = Number(previous.get("sentAt") ?? 0);
      if (Date.now() - sentAt < RESEND_AFTER_MS) {
        const wait = Math.ceil((sentAt + RESEND_AFTER_MS - Date.now()) / 1000);
        return fail(`Wait ${wait} seconds before asking for another code.`, 429);
      }

      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const sendId = randomUUID();
      const now = Date.now();
      await doc.set({ uid, purpose, codeHash: hashCode(email, code), sentAt: now, expiresAt: now + CODE_TTL_MS });
      const result = await sendPasswordCodeEmail({ to: email, code, purpose, sendId });
      if (!result.sent) {
        await doc.delete();
        return fail("We couldn't send the email just now. Try again in a moment.", 502);
      }
      return NextResponse.json({ ok: true, triesLeft: lock.triesLeft });
    }

    if (body.action === "check" || body.action === "verify") {
      const code = String(body.code ?? "").trim();
      const newPassword = String(body.newPassword ?? "");
      if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code from the email.", 400);
      if (body.action === "verify" && !passwordMeetsPolicy(newPassword)) {
        return fail("Password needs a capital letter, a small letter, a number and a symbol (like ! or #).", 400);
      }

      const doc = codeDoc(email);
      const snap = await doc.get();
      if (!snap.exists || Number(snap.get("expiresAt") ?? 0) < Date.now() || snap.get("purpose") !== purpose) {
        return fail("That code has expired. Ask for a new one.", 410);
      }
      const uid = String(snap.get("uid"));
      if (purpose === "change" && (await signedInUid(body.idToken, email)) !== uid) {
        return fail("Enter the email of the account you are signed in to.", 403);
      }

      const expected = Buffer.from(String(snap.get("codeHash")), "hex");
      const given = Buffer.from(hashCode(email, code), "hex");
      if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
        const state = await recordWrongCode(email);
        if (state.blockedUntil) {
          await doc.delete();
          return fail(lockedMessage(state.blockedUntil), 423, state);
        }
        return fail(
          `Wrong code. ${state.triesLeft} ${state.triesLeft === 1 ? "try" : "tries"} left.`,
          400,
          state,
        );
      }

      // The code is right: the app may now ask for the new password.
      if (body.action === "check") return NextResponse.json({ ok: true });

      await getAdminAuth().updateUser(uid, { password: newPassword });
      await Promise.all([doc.delete(), clearWrongCodes(email)]);
      return NextResponse.json({ ok: true });
    }

    return fail("Invalid request.", 400);
  } catch (error) {
    console.error("[api/auth/email-code] failed", error);
    return fail("Something went wrong. Try again in a moment.", 500);
  }
}
