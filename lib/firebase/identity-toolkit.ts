/**
 * Server-side Identity Toolkit helpers.
 * Used when the browser cannot reach identitytoolkit.googleapis.com (common on
 * restricted PK networks) — Vercel still can, so we proxy phone OTP from API routes.
 */

import dns from "node:dns";

// Prefer IPv4 — some runtimes hit flaky IPv6 routes to Google APIs.
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  /* older Node */
}

const IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v1";

function apiKey(): string {
  const key = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "").trim();
  if (!key) {
    throw Object.assign(new Error("Firebase API key is not configured."), {
      code: "auth/invalid-api-key",
    });
  }
  return key;
}

async function toolkitFetch<T>(
  path: string,
  init?: RequestInit,
  attempts = 3,
): Promise<T> {
  const key = apiKey();
  const url = `${IDENTITY_TOOLKIT_BASE}${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
  let lastNetworkError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as T & {
        error?: { message?: string; code?: number };
      };
      if (!response.ok) {
        const message = data.error?.message || `Identity Toolkit HTTP ${response.status}`;
        // Preserve Firebase's real code — do not mark API errors as network failures.
        throw Object.assign(new Error(message), {
          code: message,
          status: response.status,
          toolkit: data.error,
        });
      }
      return data;
    } catch (error) {
      // HTTP / toolkit errors are final — never rewrite as network-request-failed.
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
      ) {
        throw error;
      }

      lastNetworkError = error;
      const causeCode =
        error &&
        typeof error === "object" &&
        "cause" in error &&
        (error as { cause?: { code?: string } }).cause &&
        typeof (error as { cause?: { code?: string } }).cause === "object"
          ? String((error as { cause: { code?: string } }).cause.code ?? "")
          : "";
      const ownCode =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code ?? "")
          : "";
      const retryable =
        error instanceof TypeError ||
        ["ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "ENOTFOUND"].includes(ownCode) ||
        ["ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "ENOTFOUND"].includes(causeCode);
      if (!retryable || attempt === attempts) break;
      await new Promise((r) => setTimeout(r, 250 * attempt));
    }
  }

  throw lastNetworkError instanceof Error
    ? Object.assign(lastNetworkError, { code: "auth/network-request-failed" })
    : Object.assign(new Error("Could not reach Firebase Auth."), {
        code: "auth/network-request-failed",
      });
}

export type RecaptchaParams = {
  siteKey: string;
};

export async function fetchRecaptchaParams(): Promise<RecaptchaParams> {
  const data = await toolkitFetch<{
    recaptchaSiteKey?: string;
    recaptchaSitekey?: string;
  }>("/recaptchaParams");
  const siteKey = data.recaptchaSiteKey || data.recaptchaSitekey || "";
  if (!siteKey) {
    throw Object.assign(new Error("reCAPTCHA site key missing from Firebase."), {
      code: "auth/internal-error",
    });
  }
  return { siteKey };
}

export async function sendPhoneVerificationCode(
  phoneNumber: string,
  recaptchaToken: string,
): Promise<{ sessionInfo: string }> {
  const data = await toolkitFetch<{ sessionInfo?: string }>("/accounts:sendVerificationCode", {
    method: "POST",
    body: JSON.stringify({
      phoneNumber,
      recaptchaToken,
    }),
  });
  if (!data.sessionInfo) {
    throw Object.assign(new Error("Firebase did not return a verification session."), {
      code: "auth/internal-error",
    });
  }
  return { sessionInfo: data.sessionInfo };
}

export type PhoneSignInResult = {
  idToken: string;
  refreshToken?: string;
  localId: string;
  phoneNumber?: string;
  isNewUser?: boolean;
};

export async function signInWithPhoneCode(
  sessionInfo: string,
  code: string,
): Promise<PhoneSignInResult> {
  const data = await toolkitFetch<{
    idToken?: string;
    refreshToken?: string;
    localId?: string;
    phoneNumber?: string;
    isNewUser?: boolean;
  }>("/accounts:signInWithPhoneNumber", {
    method: "POST",
    body: JSON.stringify({ sessionInfo, code }),
  });
  if (!data.idToken || !data.localId) {
    throw Object.assign(new Error("Incorrect code. Check the SMS and try again."), {
      code: "auth/invalid-verification-code",
    });
  }
  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
    phoneNumber: data.phoneNumber,
    isNewUser: data.isNewUser,
  };
}

export function toolkitErrorMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  const message = error instanceof Error ? error.message : String(error ?? "");
  const upper = `${code} ${message}`.toUpperCase();

  if (
    upper.includes("TOO_MANY_ATTEMPTS") ||
    upper.includes("TOO_MANY_REQUESTS") ||
    upper.includes("QUOTA_EXCEEDED") ||
    upper.includes("QUOTA")
  ) {
    return "SMS temporarily blocked (too many attempts). Wait about an hour, try a different number, or use email reset.";
  }
  if (
    upper.includes("INVALID_APP_CREDENTIAL") ||
    upper.includes("MISSING_RECAPTCHA") ||
    upper.includes("CAPTCHA_CHECK_FAILED") ||
    (upper.includes("CAPTCHA") && !upper.includes("RECAPTCHA_PARAMS"))
  ) {
    return "Security check failed. Refresh the page and try again.";
  }
  if (
    upper.includes("INVALID_PHONE") ||
    upper.includes("INVALID_SESSION") ||
    upper.includes("SESSION_EXPIRED")
  ) {
    return "Code expired or invalid. Request a new one.";
  }
  if (upper.includes("INVALID_CODE") || upper.includes("INVALID_VERIFICATION")) {
    return "Incorrect code. Check the SMS and try again.";
  }
  if (
    upper.includes("NETWORK-REQUEST-FAILED") ||
    upper.includes("NETWORK_REQUEST_FAILED") ||
    upper.includes("FETCH FAILED") ||
    upper.includes("ECONN") ||
    upper.includes("UND_ERR_CONNECT")
  ) {
    return "Could not reach Firebase from the server. Try again in a moment.";
  }
  return "Could not send or verify the SMS code. Try again, or use email reset.";
}
