import { NextResponse } from "next/server";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { passwordMeetsPolicy } from "@/lib/password-policy";

export const runtime = "nodejs";

/** OTP-backed reset tokens must be fresher than this (seconds). */
const MAX_AUTH_AGE_SECONDS = 5 * 60;

/**
 * After phone OTP signs the client into Firebase Auth, the client sends a fresh
 * ID token + new password. We verify the token server-side and update the password
 * with the Admin SDK — no app session is created.
 */
export async function POST(request: Request) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: "Password reset is temporarily unavailable. Try again later." },
        { status: 503 },
      );
    }

    let body: { idToken?: string; newPassword?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const idToken = String(body.idToken ?? "").trim();
    const newPassword = String(body.newPassword ?? "");

    if (!idToken) {
      return NextResponse.json({ error: "Missing authentication token." }, { status: 400 });
    }
    if (!passwordMeetsPolicy(newPassword)) {
      return NextResponse.json(
        { error: "Password does not meet all requirements." },
        { status: 400 },
      );
    }

    const auth = getAdminAuth();
    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken, true);
    } catch (error) {
      console.error("[api/auth/phone-reset-password] verifyIdToken failed", error);
      return NextResponse.json(
        { error: "Session expired. Request a new verification code." },
        { status: 401 },
      );
    }

    const authTime = typeof decoded.auth_time === "number" ? decoded.auth_time : 0;
    const ageSeconds = Math.floor(Date.now() / 1000) - authTime;
    if (!authTime || ageSeconds < 0 || ageSeconds > MAX_AUTH_AGE_SECONDS) {
      return NextResponse.json(
        { error: "Verification expired. Request a new code and try again." },
        { status: 401 },
      );
    }

    // Require a phone-authenticated session (OTP proof).
    const phone =
      typeof decoded.phone_number === "string" ? decoded.phone_number : "";
    if (!phone || !/^\+923\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Phone verification is required to reset this password." },
        { status: 403 },
      );
    }

    try {
      await auth.updateUser(decoded.uid, { password: newPassword });
    } catch (error) {
      console.error("[api/auth/phone-reset-password] updateUser failed", error);
      return NextResponse.json(
        { error: "Could not update password. Try again in a moment." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/auth/phone-reset-password] unexpected", error);
    return NextResponse.json(
      { error: "Could not reset password. Try again later." },
      { status: 500 },
    );
  }
}
