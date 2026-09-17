import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

/** Public site origin for Auth continue URLs. */
export function getPublicSiteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://bharwanaestates.com";
}

/**
 * Continue URL after the password-reset action.
 * Must match Firebase Console → Authentication → Templates → Action URL host,
 * and land on our custom handler that reads `oobCode`.
 */
export function passwordResetActionCodeSettings() {
  const origin = getPublicSiteOrigin();
  return {
    url: `${origin}/reset-password`,
    handleCodeInApp: false as const,
  };
}

export async function sendPasswordResetLink(email: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Password reset is unavailable right now.");
  await sendPasswordResetEmail(auth, email, passwordResetActionCodeSettings());
}
