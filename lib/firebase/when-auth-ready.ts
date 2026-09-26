"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

/**
 * Wait until Firebase Auth has a signed-in user and an ID token is available,
 * then start a subscription. Prevents Firestore permission-denied races when
 * listeners attach before `request.auth` exists.
 *
 * Returns an unsubscribe that tears down both the auth listener and the inner
 * subscription returned from `start`.
 */
export function whenFirebaseUserReady(
  start: (user: User) => (() => void) | void | null,
  onUnsigned?: () => void,
): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    onUnsigned?.();
    return () => undefined;
  }

  let cancelled = false;
  let innerCleanup: (() => void) | undefined;

  const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
    innerCleanup?.();
    innerCleanup = undefined;
    if (cancelled) return;

    if (!firebaseUser) {
      onUnsigned?.();
      return;
    }

    void firebaseUser
      .getIdToken()
      .then(() => {
        if (cancelled || auth.currentUser?.uid !== firebaseUser.uid) return;
        const cleanup = start(firebaseUser);
        if (typeof cleanup === "function") innerCleanup = cleanup;
      })
      .catch(() => {
        if (!cancelled) onUnsigned?.();
      });
  });

  return () => {
    cancelled = true;
    innerCleanup?.();
    unsubAuth();
  };
}
