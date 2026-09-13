import {
  getFirebaseAuthContinueUri,
  getFirebaseWebApiKey,
  isFirebaseConfigured,
} from "@/lib/firebase/client";

/**
 * Look up sign-in methods without using the current page origin as continueUri.
 * fetchSignInMethodsForEmail uses window.location → auth/invalid-continue-uri when the
 * apex (bharwanaestates.com) is tied to a different Firebase Hosting project than the API key.
 */
export async function fetchSignInMethodsForIdentifier(identifier: string): Promise<string[]> {
  if (!isFirebaseConfigured()) return [];
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) return [];

  const continueUri = getFirebaseAuthContinueUri();
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: identifier.trim().toLowerCase(),
        continueUri,
      }),
    },
  );

  const data = (await response.json()) as {
    error?: { message?: string; code?: number };
    signinMethods?: string[];
  };

  if (!response.ok || data.error) {
    const message = data.error?.message ?? `createAuthUri HTTP ${response.status}`;
    throw Object.assign(new Error(message), {
      code: "auth/invalid-continue-uri",
      customData: data.error,
    });
  }

  return Array.isArray(data.signinMethods) ? data.signinMethods : [];
}
