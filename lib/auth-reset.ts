import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

/** Public site origin for Auth continue URLs. */
export function getPublicSiteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://bharwanaestates.com";
}

/** Continue URL after the password-reset action (custom page handles the oobCode). */
export function passwordResetActionCodeSettings() {
  return {
    url: `${getPublicSiteOrigin()}/login`,
    handleCodeInApp: false as const,
  };
}

export async function sendPasswordResetLink(email: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Password reset is unavailable right now.");
  await sendPasswordResetEmail(auth, email, passwordResetActionCodeSettings());
}
