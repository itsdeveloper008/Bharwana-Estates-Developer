/** User-facing Firebase Phone Auth error messages. */

export function phoneAuthErrorMessage(code: string, rawMessage = "") {
  const message = rawMessage.toLowerCase();
  if (code === "auth/billing-not-enabled" || message.includes("billing")) {
    return "Phone sign-in requires the Firebase Blaze plan. Ask the project owner to enable billing in Firebase Console.";
  }
  if (
    code === "auth/operation-not-allowed" &&
    (message.includes("region") || message.includes("sms unable to be sent"))
  ) {
    return "SMS is not enabled for Pakistan (+92) on this Firebase project. Add PK under Authentication → Settings → SMS region policy.";
  }
  if (message.includes("recaptcha") || message.includes("already been rendered")) {
    return "Security check failed to load. Refresh the page and try again.";
  }
  switch (code) {
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "That phone number looks invalid. Use format +92 3XX XXXXXXX.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
      return "Security check failed. Refresh the page and try again. If this persists, confirm this domain is listed under Firebase Authentication → Settings → Authorized domains.";
    case "auth/invalid-verification-code":
      return "Incorrect code. Check the SMS and try again.";
    case "auth/code-expired":
      return "Code expired. Request a new one.";
    case "auth/missing-verification-code":
      return "Enter the 6-digit code from your SMS.";
    case "auth/quota-exceeded":
      return "SMS limit reached. Try again later or use email sign-in.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is disabled for this Firebase project. Enable Phone under Authentication → Sign-in method.";
    case "auth/network-request-failed":
      return "Could not reach Firebase Auth. Disable ad blockers for this site, try another network or browser, and stay on https://bharwanaestates.com.";
    case "auth/app-not-authorized":
      return "This domain is not authorized for phone auth. Add it under Firebase Authentication → Settings → Authorized domains.";
    case "auth/argument-error":
      return "Phone auth setup failed (often reCAPTCHA). Refresh and try again.";
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
    case "auth/phone-number-already-exists":
      return "This number is already in use by another account.";
    case "auth/provider-already-linked":
      return "A phone number is already linked to this account. Try updating again.";
    case "auth/requires-recent-login":
      return "For security, sign out and sign back in, then try again.";
    default:
      return code
        ? `Could not complete phone verification (${code}).`
        : "Could not complete phone verification. Try again.";
  }
}

export function firebaseErrorParts(error: unknown): { code: string; message: string } {
  if (!error || typeof error !== "object") return { code: "", message: "" };
  const code = "code" in error ? String((error as { code?: string }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: string }).message ?? "") : "";
  return { code, message };
}
