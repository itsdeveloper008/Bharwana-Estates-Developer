"use client";

/**
 * Admin panel auth — separate from marketplace `MockAuthProvider` on purpose.
 *
 * Admin sessions live in their own context (`useAdminAuth`) so signing into `/admin`
 * never populates marketplace `user` / owner-dealer desks. Authorization prefers
 * `admins/{uid}` (super_admin | staff + module permissions), with a legacy fallback
 * to `users.role === ADMIN` via `resolveAdminAuthorization`.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from "firebase/auth";
import { ALL_ADMIN_MODULES, type AdminModule } from "@/lib/admin/modules";
import { AdminAuthContext, type AdminSession } from "@/lib/admin-auth-context";
export type { AdminSession } from "@/lib/admin-auth-context";
export { useAdminAuth } from "@/lib/admin-auth-context";
import { forceRefreshIdToken, noteAuthNetworkFailure } from "@/lib/firebase/auth-network";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { resolveAdminAuthorization } from "@/lib/firestore/admin-access";

const NOT_ADMIN_ERROR = "This account does not have admin access.";
const INACTIVE_ERROR = "This staff account has been deactivated.";
const STORAGE_KEY = "bharwana_admin_session_v2";

/** In-memory cache for Soft remounts / Strict Mode. */
let cachedAdminSession: AdminSession | null = null;
let cachedAdminReady = false;

function writeStoredAdmin(session: AdminSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (!session) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode
  }
}

function setAdminCache(session: AdminSession | null, ready = true) {
  cachedAdminSession = session;
  cachedAdminReady = ready;
  writeStoredAdmin(session);
}

function authErrorMessage(code: string): string {
  switch (code) {
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return "Invalid email or password";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return "Could not sign in. Try again.";
  }
}

async function resolveAdminSession(firebaseUser: FirebaseUser): Promise<
  | { ok: true; session: AdminSession }
  | { ok: false; reason: "not_admin" | "inactive" }
> {
  const authResult = await resolveAdminAuthorization(
    firebaseUser.uid,
    firebaseUser.email ?? "",
  );

  if (!authResult.authorized) {
    return { ok: false, reason: authResult.reason === "inactive" ? "inactive" : "not_admin" };
  }

  const profile = authResult.profile;
  return {
    ok: true,
    session: {
      uid: firebaseUser.uid,
      email: profile.email.toLowerCase(),
      fullName: profile.fullName,
      role: "ADMIN",
      adminRole: authResult.adminRole,
      permissions:
        authResult.adminRole === "super_admin" ? [...ALL_ADMIN_MODULES] : authResult.permissions,
      avatarUrl: profile.avatarUrl ?? firebaseUser.photoURL ?? undefined,
    },
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  // Always start null/false so SSR and the first client render match (no localStorage in useState).
  // Session is restored in useEffect below — avoids AdminGate hydration mismatches
  // (server: Loading… vs client: AdminShell from cached localStorage).
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setAdminCache(null, true);
      setAdmin(null);
      setIsReady(true);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setAdminCache(null, true);
      setAdmin(null);
      setIsReady(true);
      return;
    }

    // Never mark ready from localStorage alone — that opens AdminShell / Firestore
    // queries before request.auth exists (permission-denied + hydration races).
    // Soft remount: restore in-memory session only when Auth already has the same user.
    if (cachedAdminSession && cachedAdminReady && auth.currentUser?.uid === cachedAdminSession.uid) {
      setAdmin(cachedAdminSession);
      // Keep isReady false until getIdToken + resolve finish below.
    }

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        try {
          if (!firebaseUser) {
            setAdminCache(null, true);
            if (!cancelled) setAdmin(null);
            return;
          }

          // Prefer a force-refreshed token; if identitytoolkit is blocked, fall back to
          // the cached token so the panel can still load until expiry.
          const refreshed = await forceRefreshIdToken(firebaseUser);
          if (!refreshed.ok) {
            try {
              await firebaseUser.getIdToken(false);
            } catch (tokenError) {
              noteAuthNetworkFailure(
                tokenError instanceof Error ? tokenError.message : "Cached ID token unavailable",
              );
              throw tokenError;
            }
          }

          const resolved = await resolveAdminSession(firebaseUser);
          const session = resolved.ok ? resolved.session : null;
          setAdminCache(session, true);
          if (!cancelled) setAdmin(session);
        } catch (error) {
          console.error("Admin auth state sync failed", error);
          setAdminCache(null, true);
          if (!cancelled) setAdmin(null);
        } finally {
          if (!cancelled) setIsReady(true);
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!isFirebaseConfigured()) {
      return {
        ok: false as const,
        error: "Admin sign-in requires Firebase. Configure NEXT_PUBLIC_FIREBASE_* on this deploy.",
      };
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      return { ok: false as const, error: "Firebase Auth is not available." };
    }

    const normalized = email.trim().toLowerCase();

    try {
      const credential = await signInWithEmailAndPassword(auth, normalized, password);
      const resolved = await resolveAdminSession(credential.user);
      if (!resolved.ok) {
        await signOut(auth);
        setAdminCache(null, true);
        return {
          ok: false as const,
          error: resolved.reason === "inactive" ? INACTIVE_ERROR : NOT_ADMIN_ERROR,
        };
      }

      setAdminCache(resolved.session, true);
      setAdmin(resolved.session);
      setIsReady(true);
      return { ok: true as const };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      return { ok: false as const, error: authErrorMessage(code) };
    }
  }, []);

  const logout = useCallback(() => {
    setAdminCache(null, true);
    setAdmin(null);
    try {
      sessionStorage.removeItem("bharwana_hero_search_v1");
      sessionStorage.removeItem("bharwana_hero_bf_v1");
    } catch {
      // ignore
    }
    const auth = getFirebaseAuth();
    if (auth) void signOut(auth).catch(() => undefined);
  }, []);

  const refreshSession = useCallback(async () => {
    const auth = getFirebaseAuth();
    const firebaseUser = auth?.currentUser;
    if (!firebaseUser) {
      setAdminCache(null, true);
      setAdmin(null);
      return;
    }
    const resolved = await resolveAdminSession(firebaseUser);
    const session = resolved.ok ? resolved.session : null;
    setAdminCache(session, true);
    setAdmin(session);
  }, []);

  const getIdToken = useCallback(async () => {
    const auth = getFirebaseAuth();
    const user = auth?.currentUser;
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const hasModule = useCallback(
    (module: AdminModule) => {
      if (!admin) return false;
      if (admin.adminRole === "super_admin") return true;
      return admin.permissions.includes(module);
    },
    [admin],
  );

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: Boolean(admin),
      isReady,
      isSuperAdmin: admin?.adminRole === "super_admin",
      hasModule,
      login,
      logout,
      refreshSession,
      getIdToken,
    }),
    [admin, isReady, hasModule, login, logout, refreshSession, getIdToken],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}
