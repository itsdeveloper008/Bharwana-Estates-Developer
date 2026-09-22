import { NextResponse } from "next/server";
import { getAdminAuth, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import {
  sendPhoneVerificationCode,
  toolkitErrorMessage,
} from "@/lib/firebase/identity-toolkit";
import {
  PHONE_ALREADY_REGISTERED_CODE,
  PHONE_ALREADY_REGISTERED_MESSAGE,
  PHONE_NOT_REGISTERED_CODE,
  PHONE_NOT_REGISTERED_MESSAGE,
} from "@/lib/phone-auth-errors";
import { isValidPhoneE164, normalizePhoneE164 } from "@/lib/phone-format";

export const runtime = "nodejs";

type Purpose = "reset" | "signup";

/**
 * Send Firebase phone SMS via server (browser → our API → Identity Toolkit).
 * Avoids client calls to identitytoolkit.googleapis.com that fail on restricted networks.
 */
export async function POST(request: Request) {
  try {
    let body: { phone?: string; recaptchaToken?: string; purpose?: Purpose };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const phone = normalizePhoneE164(String(body.phone ?? ""));
    const recaptchaToken = String(body.recaptchaToken ?? "").trim();
    const purpose: Purpose = body.purpose === "signup" ? "signup" : "reset";

    if (!isValidPhoneE164(phone) || !/^\+923\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid Pakistani mobile number (10 digits starting with 3)." },
        { status: 400 },
      );
    }
    if (!recaptchaToken) {
      return NextResponse.json({ error: "Security check missing. Refresh and try again." }, { status: 400 });
    }

    if (purpose === "reset") {
      if (!isFirebaseAdminConfigured()) {
        return NextResponse.json(
          { error: "Phone reset is temporarily unavailable. Try again later." },
          { status: 503 },
        );
      }
      try {
        await getAdminAuth().getUserByPhoneNumber(phone);
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        if (code === "auth/user-not-found") {
          return NextResponse.json(
            {
              error: PHONE_NOT_REGISTERED_MESSAGE,
              code: PHONE_NOT_REGISTERED_CODE,
            },
            { status: 404 },
          );
        }
        console.error("[api/auth/phone/send-code] lookup failed", error);
        return NextResponse.json(
          { error: "Could not verify this number right now. Try again in a moment." },
          { status: 503 },
        );
      }
    }

    if (purpose === "signup" && isFirebaseAdminConfigured()) {
      try {
        await getAdminAuth().getUserByPhoneNumber(phone);
        return NextResponse.json(
          {
            error: PHONE_ALREADY_REGISTERED_MESSAGE,
            code: PHONE_ALREADY_REGISTERED_CODE,
          },
          { status: 409 },
        );
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        if (code !== "auth/user-not-found") {
          console.warn("[api/auth/phone/send-code] signup lookup skipped", error);
        }
      }
    }

    try {
      const { sessionInfo } = await sendPhoneVerificationCode(phone, recaptchaToken);
      return NextResponse.json({ ok: true, sessionInfo, phone });
    } catch (error) {
      console.error("[api/auth/phone/send-code] toolkit failed", error);
      return NextResponse.json({ error: toolkitErrorMessage(error) }, { status: 502 });
    }
  } catch (error) {
    console.error("[api/auth/phone/send-code] unexpected", error);
    return NextResponse.json({ error: "Could not send code. Try again later." }, { status: 500 });
  }
}
