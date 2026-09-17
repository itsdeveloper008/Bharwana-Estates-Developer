import { NextResponse } from "next/server";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isValidPhoneE164, normalizePhoneE164 } from "@/lib/phone-format";

/**
 * Signup pre-check: is this E.164 phone already tied to a Firebase Auth user?
 * Uses Admin SDK when configured. If Admin is unavailable, returns checkSkipped
 * so the client can continue the OTP flow (verify step still catches existing accounts).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { phone?: string };
    const phone = normalizePhoneE164(String(body.phone ?? ""));
    if (!isValidPhoneE164(phone) || !/^\+923\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({ registered: null, checkSkipped: true });
    }

    try {
      await getAdminAuth().getUserByPhoneNumber(phone);
      return NextResponse.json({ registered: true, checkSkipped: false });
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      if (code === "auth/user-not-found") {
        return NextResponse.json({ registered: false, checkSkipped: false });
      }
      console.error("[api/auth/phone-registered] lookup failed", error);
      return NextResponse.json({ registered: null, checkSkipped: true });
    }
  } catch (error) {
    console.error("[api/auth/phone-registered] bad request", error);
    return NextResponse.json({ registered: null, checkSkipped: true });
  }
}
