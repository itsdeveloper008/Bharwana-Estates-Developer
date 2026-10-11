/** User-facing Firebase Phone Auth error messages + diagnostics. */

export const PHONE_ALREADY_REGISTERED_CODE = "auth/phone-number-already-exists";
export const PHONE_ALREADY_REGISTERED_MESSAGE =
  "This phone number is already registered. Please sign in instead.";

export const PHONE_NOT_REGISTERED_CODE = "auth/phone-number-not-found";
export const PHONE_NOT_REGISTERED_MESSAGE =
  "This phone number is not registered. Please sign up instead.";

export const NETWORK_AUTH_ERROR_MESSAGE =
  "Could not reach Firebase / reCAPTCHA. Check your internet, disable ad blockers for this site, or try another browser/network. You can also sign in with email.";

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

export function isNetworkAuthError(code: string, rawMessage = ""): boolean {
  const normalized = code.toLowerCase();
  const message = rawMessage.toLowerCase();
  if (normalized === "auth/network-request-failed") return true;
  if (message.includes("err_connection_closed")) return true;
  if (message.includes("network-request-failed")) return true;
  if (message.includes("failed to fetch") && message.includes("identitytoolkit")) return true;
  return false;
}

export function isPhoneAlreadyRegisteredError(code: string, rawMessage = ""): boolean {
  const normalized = code.toLowerCase();
  if (
    normalized === "auth/phone-number-already-exists" ||
    normalized === "auth/credential-already-in-use" ||
    normalized === "auth/account-exists-with-different-credential"
  ) {
    return true;
  }
  const message = rawMessage.toLowerCase();
  return (
    message.includes("phone_number_exists") ||
    message.includes("phone number already") ||
    message.includes("already registered") ||
    message.includes("already in use by another account") ||
    message.includes("phone number is already")
  );
}

function isDevDiagnosticsEnabled() {
  return process.env.NODE_ENV === "development";
}

/** Strip phone numbers and other PII before any diagnostic logging. */
function sanitizeAuthExtra(extra?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!extra) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extra)) {
    const lower = key.toLowerCase();
    if (
      lower.includes("phone") ||
      lower === "e164" ||
      lower.includes("email") ||
      lower.includes("token") ||
      lower.includes("password")
    ) {
      out[key] = typeof value === "string" && value.length > 0 ? "[redacted]" : Boolean(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** Dev-only Auth diagnostics — never attach payloads to window or log PII in production. */
export function logFirebaseAuthError(context: string, error: unknown, extra?: Record<string, unknown>) {
  if (!isDevDiagnosticsEnabled()) return;
  const parts = firebaseErrorParts(error);
  console.error(`[${context}] Firebase Auth failure`, {
    context,
    code: parts.code,
    message: parts.message,
    ...sanitizeAuthExtra(extra),
  });
}

/**
 * After a network retry still fails - track frequency / browser / network class.
 * Does not change the user-facing message. Dev-only; no PII.
 */
export function logPersistentNetworkAuthFailure(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  if (!isDevDiagnosticsEnabled()) return;
  const parts = firebaseErrorParts(error);
  console.error(`[${context}] Persistent phone-auth network failure`, {
    event: "phone_auth_network_request_failed_after_retry",
    context,
    code: parts.code || "auth/network-request-failed",
    message: parts.message,
    ...sanitizeAuthExtra(extra),
  });
}

function messageHints(rawMessage: string): string {
  const message = rawMessage.toLowerCase();

  // Already-registered must win over broad "phone number" / recaptcha substring matches.
  if (
    message.includes("phone_number_exists") ||
    message.includes("phone number already") ||
    message.includes("already registered") ||
    message.includes("already in use by another account") ||
    message.includes("phone number is already")
  ) {
    return PHONE_ALREADY_REGISTERED_MESSAGE;
  }

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
    message.includes("could not connect to the recaptcha") ||
    message.includes("reload to get a recaptcha") ||
    message.includes("recaptcha") ||
    message.includes("captcha") ||
    message.includes("app credential") ||
    message.includes("already been rendered")
  ) {
    return "Could not reach the security check (reCAPTCHA). Disable ad blockers for this site, allow google.com / recaptcha.net, refresh, then try again - or sign in with email.";
  }
  if (message.includes("api key") || message.includes("api_key") || message.includes("identity toolkit")) {
    return "Phone sign-in is blocked by API key settings. Ask the project owner to allow Identity Toolkit API on the Firebase web key.";
  }
  if (message.includes("app check") || message.includes("appcheck")) {
    return "Phone sign-in is blocked by App Check. Ask the project owner to review Firebase App Check enforcement.";
  }
  if (
    message.includes("quota") ||
    message.includes("too many") ||
    message.includes("error code: 39") ||
    message.includes("error-code:-39") ||
    message.includes("error code:-39")
  ) {
    return "SMS temporarily blocked (Firebase rate limit / anti-abuse). Wait about an hour, try a different number or network, or use a Firebase test phone number. You can also sign in with email.";
  }
  if (message.includes("invalid phone") || message.includes("invalid-phone")) {
    return "That phone number looks invalid. Use a Pakistani mobile starting with 3 (10 digits).";
  }
  return "";
}

export function phoneAuthErrorMessage(code: string, rawMessage = "") {
  if (isPhoneAlreadyRegisteredError(code, rawMessage)) {
    return PHONE_ALREADY_REGISTERED_MESSAGE;
  }

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
      return "Could not reach the security check (reCAPTCHA). Disable ad blockers for this site, refresh, then try again - or sign in with email.";
    case "auth/invalid-verification-code":
      return "Incorrect code. Check the SMS and try again.";
    case "auth/code-expired":
      return "Code expired. Request a new one.";
    case "auth/missing-verification-code":
      return "Enter the 6-digit code from your SMS.";
    case "auth/quota-exceeded":
    case "auth/error-code:-39":
      // Identity Toolkit maps QuotaExceeded / anti-abuse to opaque "Error code: 39" + HTTP 503.
      return "SMS temporarily blocked (Firebase rate limit / anti-abuse). Wait about an hour, try a different number or network, or use a Firebase test phone number. You can also sign in with email.";
    case "auth/network-request-failed":
      return NETWORK_AUTH_ERROR_MESSAGE;
    case "auth/app-not-authorized":
      return "This domain is not authorized for phone auth. Add it under Firebase Authentication → Settings → Authorized domains.";
    case "auth/argument-error":
      return "Phone auth setup failed (often reCAPTCHA). Refresh and try again.";
    case "auth/credential-already-in-use":
    case "auth/account-exists-with-different-credential":
    case "auth/phone-number-already-exists":
      return PHONE_ALREADY_REGISTERED_MESSAGE;
    case "auth/provider-already-linked":
      return "A phone number is already linked to this account. Try updating again.";
    case "auth/requires-recent-login":
      return "For security, sign out and sign back in, then try again.";
    case "auth/internal-error":
      // Never surface the raw code - not user-actionable.
      return "Something went wrong sending your code. Please try again in a moment, or sign in with email instead.";
    default:
      if (code.includes("error-code:-39") || code.includes("error-code:39")) {
        return "SMS temporarily blocked (Firebase rate limit / anti-abuse). Wait about an hour, try a different number or network, or use a Firebase test phone number. You can also sign in with email.";
      }
      return "Something went wrong with phone verification. Please try again, or sign in with email instead.";
  }
}
