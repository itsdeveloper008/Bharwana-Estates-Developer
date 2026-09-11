/** User-facing Firebase Phone Auth error messages + diagnostics. */

export function firebaseErrorParts(error: unknown): {
  code: string;
  message: string;
  customData?: unknown;
  serverResponse?: unknown;
} {
  if (!error || typeof error !== "object") return { code: "", message: "" };
  const err = error as {
    code?: string;
    message?: string;
    customData?: { serverResponse?: unknown; [key: string]: unknown };
    serverResponse?: unknown;
  };
  const code = String(err.code ?? "");
  const message = String(err.message ?? "");
  const customData = err.customData;
  const serverResponse = err.customData?.serverResponse ?? err.serverResponse;
  return { code, message, customData, serverResponse };
}

/** Log the full Auth error so auth/internal-error is diagnosable. */
export function logFirebaseAuthError(context: string, error: unknown, extra?: Record<string, unknown>) {
  const parts = firebaseErrorParts(error);
  console.error(`[${context}] Firebase Auth failure`, {
    code: parts.code,
    message: parts.message,
    customData: parts.customData,
    serverResponse: parts.serverResponse,
    ...extra,
    raw: error,
  });
}

function messageHints(rawMessage: string): string {
  const message = rawMessage.toLowerCase();
  if (message.includes("billing") || message.includes("billing_not_enabled")) {
    return "Phone sign-in requires the Firebase Blaze plan. Ask the project owner to enable billing in Firebase Console.";
  }
  if (
    message.includes("sms unable to be sent") ||
    message.includes("region") ||
    message.includes("blocked region")
  ) {
    return "SMS is not enabled for Pakistan (+92) on this Firebase project. Add PK under Authentication → Settings → SMS region policy.";
  }
  if (
    message.includes("recaptcha") ||
    message.includes("captcha") ||
    message.includes("app credential") ||
    message.includes("already been rendered")
  ) {
    return "Security check failed. Refresh the page and try again.";
  }
  if (message.includes("api key") || message.includes("api_key") || message.includes("identity toolkit")) {
    return "Phone sign-in is blocked by API key settings. Ask the project owner to allow Identity Toolkit API on the Firebase web key.";
  }
  if (message.includes("app check") || message.includes("appcheck")) {
    return "Phone sign-in is blocked by App Check. Ask the project owner to review Firebase App Check enforcement.";
  }
  if (message.includes("quota") || message.includes("too many")) {
    return "SMS limit reached. Try again later or use email sign-in.";
  }
  if (message.includes("invalid phone") || message.includes("phone number")) {
    return "That phone number looks invalid. Use a Pakistani mobile starting with 3 (10 digits).";
  }
  return "";
}

export function phoneAuthErrorMessage(code: string, rawMessage = "") {
  const fromMessage = messageHints(rawMessage);
  if (fromMessage) return fromMessage;

  if (code === "auth/billing-not-enabled") {
    return "Phone sign-in requires the Firebase Blaze plan. Ask the project owner to enable billing in Firebase Console.";
  }
  if (code === "auth/operation-not-allowed") {
    const regionHint = messageHints(rawMessage);
    if (regionHint) return regionHint;
    return "Phone sign-in is disabled for this Firebase project. Enable Phone under Authentication → Sign-in method.";
  }

  switch (code) {
    case "auth/invalid-phone-number":
    case "auth/missing-phone-number":
      return "That phone number looks invalid. Use a Pakistani mobile starting with 3 (10 digits).";
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
    case "auth/network-request-failed":
      return "Could not reach Firebase Auth. Check your internet, disable ad blockers for this site, or try another browser/network.";
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
    case "auth/internal-error":
      // Never surface the raw code — not user-actionable.
      return "Something went wrong sending your code. Please try again in a moment, or sign in with email instead.";
    default:
      return "Something went wrong with phone verification. Please try again, or sign in with email instead.";
  }
}
