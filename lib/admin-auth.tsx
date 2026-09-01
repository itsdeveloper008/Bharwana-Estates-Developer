"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User as FirebaseUser } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { resolveAdminAuthorization } from "@/lib/firestore/admin-access";

export interface AdminSession {
  uid: string;
  email: string;
  fullName: string;
  role: "ADMIN";
  avatarUrl?: string;
}

interface AdminAuthContextValue {
  admin: AdminSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const NOT_ADMIN_ERROR = "This account does not have admin access.";

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

async function resolveAdminSession(firebaseUser: FirebaseUser): Promise<AdminSession | null> {
  const authResult = await resolveAdminAuthorization(
    firebaseUser.uid,
    firebaseUser.email ?? "",
  );

  if (!authResult.authorized) return null;

  const profile = authResult.profile;
  return {
    uid: firebaseUser.uid,
    email: profile.email.toLowerCase(),
    fullName: profile.fullName,
    role: "ADMIN",
    avatarUrl: profile.avatarUrl ?? firebaseUser.photoURL ?? undefined,
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  const clearUnauthorizedFirebaseSession = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    await signOut(auth).catch(() => undefined);
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem("bharwana_admin_session");
    } catch {
      // ignore
    }

    if (!isFirebaseConfigured()) {
      setAdmin(null);
      setIsReady(true);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setAdmin(null);
      setIsReady(true);
      return;
    }

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        try {
          if (!firebaseUser) {
            if (!cancelled) setAdmin(null);
            return;
          }

          const session = await resolveAdminSession(firebaseUser);
          if (!session) {
            await clearUnauthorizedFirebaseSession();
            if (!cancelled) setAdmin(null);
            return;
          }

          if (!cancelled) setAdmin(session);
        } catch (error) {
          console.error("Admin auth state sync failed", error);
          await clearUnauthorizedFirebaseSession();
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
  }, [clearUnauthorizedFirebaseSession]);

  const login = useCallback(
    async (email: string, password: string) => {
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
        const session = await resolveAdminSession(credential.user);
        if (!session) {
          await signOut(auth);
          return { ok: false as const, error: NOT_ADMIN_ERROR };
        }

        setAdmin(session);
        return { ok: true as const };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        return { ok: false as const, error: authErrorMessage(code) };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setAdmin(null);
    const auth = getFirebaseAuth();
    if (auth) void signOut(auth).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: Boolean(admin),
      isReady,
      login,
      logout,
    }),
    [admin, isReady, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
