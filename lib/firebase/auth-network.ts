"use client";

/**
 * Tracks recent Firebase Auth / Identity Toolkit network failures so UI can
 * distinguish "rules rejected you" from "token refresh could not reach Google"
 * (common with ad blockers / restricted networks → ERR_CONNECTION_CLOSED on
 * identitytoolkit.googleapis.com).
 */

export const AUTH_NETWORK_CONNECTION_MESSAGE =
  "Connection issue — Firebase Auth could not refresh your session. Check your network, disable ad blockers/VPN for this site, then refresh.";

const AUTH_NETWORK_WINDOW_MS = 90_000;

let lastAuthNetworkFailureAt = 0;
let lastAuthNetworkDetail = "";

export function noteAuthNetworkFailure(detail?: string) {
  lastAuthNetworkFailureAt = Date.now();
  lastAuthNetworkDetail = (detail ?? "").slice(0, 240);
  if (typeof console !== "undefined") {
    console.warn("[Firebase Auth] Network/token refresh failure", lastAuthNetworkDetail || detail);
  }
}

export function clearAuthNetworkFailure() {
  lastAuthNetworkFailureAt = 0;
  lastAuthNetworkDetail = "";
}

export function recentAuthNetworkFailure(withinMs = AUTH_NETWORK_WINDOW_MS): boolean {
  if (!lastAuthNetworkFailureAt) return false;
  return Date.now() - lastAuthNetworkFailureAt < withinMs;
}

export function authNetworkFailureDetail(): string {
  return lastAuthNetworkDetail;
}

export function isLikelyAuthNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: string }).code).toLowerCase() : "";
  const message =
    "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message.toLowerCase()
      : String(error).toLowerCase();
  if (code === "auth/network-request-failed" || code === "auth/timeout") return true;
  if (message.includes("err_connection_closed")) return true;
  if (message.includes("network-request-failed")) return true;
  if (message.includes("failed to fetch")) return true;
  if (message.includes("identitytoolkit")) return true;
  if (message.includes("connection closed")) return true;
  return false;
}

/**
 * Force-refresh the Firebase ID token so Firestore gets a current Auth context.
 * Records network failures for clearer permission-denied messaging.
 */
export async function forceRefreshIdToken(
  user: { getIdToken: (force?: boolean) => Promise<string> },
): Promise<{ ok: true; token: string } | { ok: false; error: unknown }> {
  try {
    const token = await user.getIdToken(true);
    clearAuthNetworkFailure();
    return { ok: true, token };
  } catch (error) {
    if (isLikelyAuthNetworkError(error)) {
      noteAuthNetworkFailure(
        error instanceof Error ? error.message : "getIdToken(true) failed",
      );
    } else {
      noteAuthNetworkFailure(
        error instanceof Error ? error.message : "getIdToken(true) failed",
      );
    }
    return { ok: false, error };
  }
}
