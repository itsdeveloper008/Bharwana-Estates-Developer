import { NextResponse } from "next/server";
import { signInWithPhoneCode, toolkitErrorMessage } from "@/lib/firebase/identity-toolkit";

export const runtime = "nodejs";

/**
 * Confirm SMS code via server. Returns Firebase idToken for Admin password update
 * without requiring the browser to call Identity Toolkit.
 */
export async function POST(request: Request) {
  try {
    let body: { sessionInfo?: string; code?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const sessionInfo = String(body.sessionInfo ?? "").trim();
    const code = String(body.code ?? "").trim();

    if (!sessionInfo) {
      return NextResponse.json({ error: "Request a new code, then try again." }, { status: 400 });
    }
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
    }

    try {
      const result = await signInWithPhoneCode(sessionInfo, code);
      return NextResponse.json({
        ok: true,
        idToken: result.idToken,
        phone: result.phoneNumber ?? null,
        uid: result.localId,
      });
    } catch (error) {
      console.error("[api/auth/phone/verify-code] toolkit failed", error);
      const message = toolkitErrorMessage(error);
      const status =
        message.toLowerCase().includes("incorrect") || message.toLowerCase().includes("expired")
          ? 400
          : 502;
      return NextResponse.json({ error: message }, { status });
    }
  } catch (error) {
    console.error("[api/auth/phone/verify-code] unexpected", error);
    return NextResponse.json({ error: "Could not verify code. Try again later." }, { status: 500 });
  }
}
