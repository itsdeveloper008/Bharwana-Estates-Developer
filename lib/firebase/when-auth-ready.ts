"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import {
  forceRefreshIdToken,
  isLikelyAuthNetworkError,
  noteAuthNetworkFailure,
} from "@/lib/firebase/auth-network";
import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * Wait until Firebase Auth has a signed-in user and a freshly refreshed ID
 * token, then start a subscription. Prevents Firestore permission-denied races
 * when listeners attach before `request.auth` exists, and forces a token
 * refresh so a blocked identitytoolkit call is detected before the query.
 *
 * Returns an unsubscribe that tears down both the auth listener and the inner
 * subscription returned from `start`.
 */
export function whenFirebaseUserReady(
  start: (user: User) => (() => void) | void | null,
  onUnsigned?: () => void,
  onTokenRefreshFailed?: (error: unknown) => void,
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    onUnsigned?.();
    return () => undefined;
  }

  let cancelled = false;
  let generation = 0;
  let innerCleanup: (() => void) | undefined;

  const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
    innerCleanup?.();
    innerCleanup = undefined;
    if (cancelled) return;

    const gen = ++generation;

    if (!firebaseUser) {
      onUnsigned?.();
      return;
    }

    void (async () => {
      // Force refresh so we detect blocked identitytoolkit before Firestore reads.
      let refreshed = await forceRefreshIdToken(firebaseUser);
      if (!refreshed.ok && isLikelyAuthNetworkError(refreshed.error)) {
        // One short retry — transient ERR_CONNECTION_CLOSED sometimes recovers.
        await new Promise((r) => setTimeout(r, 700));
        if (cancelled || gen !== generation) return;
        refreshed = await forceRefreshIdToken(firebaseUser);
      }

      if (cancelled || gen !== generation) return;
      if (auth.currentUser?.uid !== firebaseUser.uid) return;

      if (!refreshed.ok) {
        noteAuthNetworkFailure(
          refreshed.error instanceof Error
            ? refreshed.error.message
            : "ID token refresh failed",
        );
        onTokenRefreshFailed?.(refreshed.error);
        return;
      }

      const cleanup = start(firebaseUser);
      if (cancelled || gen !== generation) {
        if (typeof cleanup === "function") cleanup();
        return;
      }
      if (typeof cleanup === "function") innerCleanup = cleanup;
    })();
  });

  return () => {
    cancelled = true;
    generation += 1;
    innerCleanup?.();
    innerCleanup = undefined;
    unsubAuth();
  };
}
