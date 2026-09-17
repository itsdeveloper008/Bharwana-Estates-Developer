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
import { ALL_ADMIN_MODULES, type AdminModule, type AdminPanelRole } from "@/lib/admin/modules";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { resolveAdminAuthorization } from "@/lib/firestore/admin-access";

export interface AdminSession {
  uid: string;
  email: string;
  fullName: string;
  /** Legacy marketplace flag - always ADMIN for panel sessions. */
  role: "ADMIN";
  adminRole: AdminPanelRole;
  permissions: AdminModule[];
  avatarUrl?: string;
}

interface AdminAuthContextValue {
  admin: AdminSession | null;
  isAuthenticated: boolean;
  isReady: boolean;
  isSuperAdmin: boolean;
  hasModule: (module: AdminModule) => boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const NOT_ADMIN_ERROR = "This account does not have admin access.";
const INACTIVE_ERROR = "This staff account has been deactivated.";
const STORAGE_KEY = "bharwana_admin_session_v2";

/** In-memory cache for Soft remounts / Strict Mode. */
let cachedAdminSession: AdminSession | null = null;
let cachedAdminReady = false;

function readStoredAdmin(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (
      typeof parsed.uid === "string" &&
      typeof parsed.email === "string" &&
      parsed.role === "ADMIN" &&
      typeof parsed.fullName === "string" &&
      (parsed.adminRole === "super_admin" || parsed.adminRole === "staff") &&
      Array.isArray(parsed.permissions)
    ) {
      return {
        uid: parsed.uid,
        email: parsed.email,
        fullName: parsed.fullName,
        role: "ADMIN",
        adminRole: parsed.adminRole,
        permissions: parsed.permissions as AdminModule[],
        avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : undefined,
      };
    }
  } catch {
    // ignore corrupt cache
  }
  return null;
}

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

function initialAdminSession(): AdminSession | null {
  if (cachedAdminSession) return cachedAdminSession;
  const stored = readStoredAdmin();
  if (stored) {
    cachedAdminSession = stored;
    cachedAdminReady = true;
  }
  return stored;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminSession | null>(initialAdminSession);
  const [isReady, setIsReady] = useState(() => cachedAdminReady || Boolean(initialAdminSession()));

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

    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        try {
          if (!firebaseUser) {
            setAdminCache(null, true);
            if (!cancelled) setAdmin(null);
            return;
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

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
