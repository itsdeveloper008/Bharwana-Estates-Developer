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
 *
 * Guarantees: when Auth re-emits or this helper is stopped, the previous
 * `start()` cleanup runs first and any in-flight `getIdToken` / `start` work
 * from an older generation is ignored — so superseded listeners cannot paint
 * stale permission-denied errors after a newer subscription succeeded.
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

    void firebaseUser
      .getIdToken()
      .then(() => {
        if (cancelled || gen !== generation) return;
        if (auth.currentUser?.uid !== firebaseUser.uid) return;
        const cleanup = start(firebaseUser);
        if (cancelled || gen !== generation) {
          if (typeof cleanup === "function") cleanup();
          return;
        }
        if (typeof cleanup === "function") innerCleanup = cleanup;
      })
      .catch(() => {
        if (!cancelled && gen === generation) onUnsigned?.();
      });
  });

  return () => {
    cancelled = true;
    generation += 1;
    innerCleanup?.();
    innerCleanup = undefined;
    unsubAuth();
  };
}
