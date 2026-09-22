import { NextResponse } from "next/server";
import { fetchRecaptchaParams, toolkitErrorMessage } from "@/lib/firebase/identity-toolkit";

export const runtime = "nodejs";

/**
 * Proxy Firebase recaptchaParams so the browser never needs identitytoolkit.googleapis.com.
 */
export async function GET() {
  try {
    const params = await fetchRecaptchaParams();
    return NextResponse.json(params);
  } catch (error) {
    console.error("[api/auth/phone/recaptcha-params]", error);
    return NextResponse.json(
      { error: toolkitErrorMessage(error) },
      { status: 502 },
    );
  }
}
