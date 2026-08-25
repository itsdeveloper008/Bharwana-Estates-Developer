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
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import {
  authenticateAdmin,
  type AdminSession,
} from "@/lib/mock-data/admin-users";
import { delay } from "@/lib/utils";

const STORAGE_KEY = "bharwana_admin_session";

interface AdminAuthContextValue {
  admin: AdminSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

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

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdminSession;
        if (parsed?.email && parsed?.role === "ADMIN") {
          setAdmin(parsed);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsReady(true);
    }
  }, []);

  const persist = useCallback((session: AdminSession | null) => {
    setAdmin(session);
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();

      // Firebase email/password when the project is configured
      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth();
        if (!auth) {
          return { ok: false as const, error: "Firebase Auth is not available." };
        }
        try {
          const credential = await signInWithEmailAndPassword(auth, normalized, password);
          const firebaseUser = credential.user;
          const session: AdminSession = {
            email: (firebaseUser.email ?? normalized).toLowerCase(),
            fullName:
              firebaseUser.displayName?.trim() ||
              firebaseUser.email?.split("@")[0] ||
              "Admin",
            role: "ADMIN",
            avatarUrl: firebaseUser.photoURL ?? undefined,
          };
          persist(session);
          return { ok: true as const };
        } catch (error) {
          const code =
            error && typeof error === "object" && "code" in error
              ? String((error as { code?: string }).code)
              : "";
          return { ok: false as const, error: authErrorMessage(code) };
        }
      }

      // Local mock admins only when Firebase env is missing
      await delay(400);
      const session = authenticateAdmin(normalized, password);
      if (!session) {
        return { ok: false as const, error: "Invalid email or password" };
      }
      persist(session);
      return { ok: true as const };
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null);
    const auth = getFirebaseAuth();
    if (auth) void signOut(auth).catch(() => undefined);
  }, [persist]);

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
