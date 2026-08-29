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
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { users as seedUsers } from "@/lib/mock-data/users";
import type { User, UserRole } from "@/lib/types";
import { delay } from "@/lib/utils";

const SESSION_KEY = "bharwana_user_session";
const USERS_KEY = "bharwana_registered_users";
const PENDING_GOOGLE_KEY = "bharwana_pending_google_signup";

export type GoogleSignupDraft = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
};

type StoredAccount = User & { password: string };

type GoogleLoginResult =
  | { ok: true; isNewUser: false; user: User }
  | { ok: true; isNewUser: true; draft: GoogleSignupDraft }
  | { ok: false; error: string };

interface MockAuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  loginWithGoogle: () => Promise<GoogleLoginResult>;
  completeGoogleSignup: (input: {
    draft: GoogleSignupDraft;
    role: UserRole;
    agencyName?: string;
    registrationNumber?: string;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  register: (input: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    role?: UserRole;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  loginAs: (user: User) => void;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
}

const MockAuthContext = createContext<MockAuthContextValue | undefined>(undefined);

function readRegistered(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRegistered(accounts: StoredAccount[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
}

function toPublicUser(account: StoredAccount | User): User {
  const { id, fullName, email, phone, role, avatarUrl } = account;
  return { id, fullName, email, phone, role, avatarUrl };
}

/** Demo passwords for seed users (frontend-only). */
const SEED_PASSWORDS: Record<string, string> = {
  "imran@bharwana.example": "owner123",
  "nadia.q@example.com": "owner123",
  "ahmed.khan@example.com": "buyer123",
  "sara.malik@example.com": "buyer123",
  "omar.sheikh@bharwana.example": "sales123",
  "hina.raza@bharwana.example": "sales123",
  "kamran.dealer@example.com": "dealer123",
};

function findExistingAccount(email: string) {
  const normalized = email.trim().toLowerCase();
  const registered = readRegistered();
  return (
    registered.find((item) => item.email.toLowerCase() === normalized) ??
    seedUsers.find((item) => item.email.toLowerCase() === normalized) ??
    null
  );
}

function readPendingGoogle(): GoogleSignupDraft | null {
  try {
    const raw = sessionStorage.getItem(PENDING_GOOGLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleSignupDraft;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

function writePendingGoogle(draft: GoogleSignupDraft | null) {
  if (draft) sessionStorage.setItem(PENDING_GOOGLE_KEY, JSON.stringify(draft));
  else sessionStorage.removeItem(PENDING_GOOGLE_KEY);
}

function resolveGoogleAccount(firebaseUser: FirebaseUser):
  | { type: "existing"; user: User }
  | { type: "new"; draft: GoogleSignupDraft } {
  const email = (firebaseUser.email ?? "").trim().toLowerCase();
  const existing = findExistingAccount(email);

  if (existing) {
    return {
      type: "existing",
      user: {
        ...toPublicUser(existing),
        fullName: firebaseUser.displayName?.trim() || toPublicUser(existing).fullName,
        avatarUrl: firebaseUser.photoURL ?? toPublicUser(existing).avatarUrl,
      },
    };
  }

  return {
    type: "new",
    draft: {
      id: firebaseUser.uid,
      fullName: firebaseUser.displayName?.trim() || email.split("@")[0] || "Guest",
      email,
      phone: firebaseUser.phoneNumber ?? "",
      avatarUrl: firebaseUser.photoURL ?? undefined,
    },
  };
}

function googleAuthErrorMessage(code: string) {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in was cancelled. Keep the popup open and choose an account.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google popup. Allow popups for bharwanaestates.com, then try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google sign-in. In Firebase → Authentication → Settings, add bharwanaestates.com and www.bharwanaestates.com.";
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled in Firebase. Enable Google under Authentication → Sign-in method.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/network-request-failed":
      return "Network error during Google sign-in. Check your connection and try again.";
    default:
      return code
        ? `Could not sign in with Google (${code}).`
        : "Could not sign in with Google. Try again.";
  }
}

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  const persist = useCallback((next: User | null) => {
    setUser(next);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    async function boot() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as User;
          if (parsed?.id && parsed?.email) setUser(parsed);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }

      if (!isFirebaseConfigured()) {
        if (!cancelled) setIsReady(true);
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        if (!cancelled) setIsReady(true);
        return;
      }

      // Consume any leftover redirect result (legacy), then keep session in sync.
      try {
        const redirected = await getRedirectResult(auth);
        if (!cancelled && redirected?.user) {
          const resolved = resolveGoogleAccount(redirected.user);
          if (resolved.type === "existing") {
            persist(resolved.user);
          } else {
            writePendingGoogle(resolved.draft);
          }
        }
      } catch (error) {
        console.error("Google redirect result failed", error);
      }

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (cancelled) return;
        if (firebaseUser) {
          const email = (firebaseUser.email ?? "").trim().toLowerCase();
          if (!email) {
            setIsReady(true);
            return;
          }
          const resolved = resolveGoogleAccount(firebaseUser);
          if (resolved.type === "existing") {
            writePendingGoogle(null);
            persist(resolved.user);
          } else {
            const pending = readPendingGoogle();
            if (pending?.email === email) {
              persist(null);
            }
          }
        }
        setIsReady(true);
      });
    }

    void boot();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [persist]);

  const loginAs = useCallback(
    (next: User) => {
      persist(toPublicUser(next));
    },
    [persist],
  );

  const loginAsRole = useCallback(
    (role: UserRole) => {
      const match = seedUsers.find((item) => item.role === role);
      if (match) persist(match);
    },
    [persist],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();

      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth();
        if (auth) {
          try {
            const credential = await signInWithEmailAndPassword(auth, normalized, password);
            const firebaseUser = credential.user;
            const registered = readRegistered();
            const existing =
              registered.find((item) => item.email.toLowerCase() === normalized) ??
              seedUsers.find((item) => item.email.toLowerCase() === normalized);

            const nextUser: User = existing
              ? {
                  ...toPublicUser(existing),
                  fullName: firebaseUser.displayName?.trim() || toPublicUser(existing).fullName,
                  avatarUrl: firebaseUser.photoURL ?? toPublicUser(existing).avatarUrl,
                }
              : {
                  id: firebaseUser.uid,
                  fullName: firebaseUser.displayName?.trim() || normalized.split("@")[0] || "Member",
                  email: normalized,
                  phone: firebaseUser.phoneNumber ?? "",
                  role: "HOUSE_OWNER",
                  avatarUrl: firebaseUser.photoURL ?? undefined,
                };

            if (!existing) {
              writeRegistered([...registered, { ...nextUser, password: "" }]);
            }

            persist(nextUser);
            return { ok: true as const, user: nextUser };
          } catch (error) {
            const code =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: string }).code)
                : "";
            if (
              code === "auth/too-many-requests" ||
              code === "auth/user-disabled" ||
              code === "auth/invalid-email"
            ) {
              return {
                ok: false as const,
                error:
                  code === "auth/too-many-requests"
                    ? "Too many attempts. Try again later."
                    : code === "auth/user-disabled"
                      ? "This account has been disabled."
                      : "Invalid email or password",
              };
            }
            // Fall through to local demo accounts when Firebase user is missing
          }
        }
      }

      await delay(0);
      const registered = readRegistered();
      const fromRegister = registered.find((item) => item.email.toLowerCase() === normalized);
      if (fromRegister) {
        if (fromRegister.password !== password) {
          return { ok: false as const, error: "Invalid email or password" };
        }
        const publicUser = toPublicUser(fromRegister);
        persist(publicUser);
        return { ok: true as const, user: publicUser };
      }

      const seed = seedUsers.find((item) => item.email.toLowerCase() === normalized);
      if (seed && SEED_PASSWORDS[seed.email] === password) {
        persist(seed);
        return { ok: true as const, user: seed };
      }

      return { ok: false as const, error: "Invalid email or password" };
    },
    [persist],
  );

  const loginWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      return {
        ok: false as const,
        error: "Google sign-in is not ready on this deploy. Firebase env vars are missing.",
      };
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      return { ok: false as const, error: "Google sign-in is unavailable right now." };
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      const result = await signInWithPopup(auth, provider);
      const email = (result.user.email ?? "").trim().toLowerCase();
      if (!email) return { ok: false as const, error: "Google account did not return an email." };

      const resolved = resolveGoogleAccount(result.user);
      if (resolved.type === "existing") {
        persist(resolved.user);
        writePendingGoogle(null);
        return { ok: true as const, isNewUser: false as const, user: resolved.user };
      }

      writePendingGoogle(resolved.draft);
      return { ok: true as const, isNewUser: true as const, draft: resolved.draft };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      console.error("Google sign-in failed", error);
      return { ok: false as const, error: googleAuthErrorMessage(code) };
    }
  }, [persist]);

  const completeGoogleSignup = useCallback(
    async (input: {
      draft: GoogleSignupDraft;
      role: UserRole;
      agencyName?: string;
      registrationNumber?: string;
    }) => {
      const email = input.draft.email.trim().toLowerCase();
      if (findExistingAccount(email)) {
        return { ok: false as const, error: "An account with this email already exists." };
      }

      const registered = readRegistered();
      const account: StoredAccount = {
        id: input.draft.id,
        fullName: input.draft.fullName.trim(),
        email,
        phone: input.draft.phone.trim(),
        role: input.role,
        password: "",
        avatarUrl: input.draft.avatarUrl,
      };
      writeRegistered([...registered, account]);
      const publicUser = toPublicUser(account);
      persist(publicUser);
      writePendingGoogle(null);
      return { ok: true as const, user: publicUser };
    },
    [persist],
  );

  const register = useCallback(
    async (input: {
      fullName: string;
      email: string;
      phone: string;
      password: string;
      role?: UserRole;
    }) => {
      const email = input.email.trim().toLowerCase();
      const registered = readRegistered();
      if (
        registered.some((item) => item.email.toLowerCase() === email) ||
        seedUsers.some((item) => item.email.toLowerCase() === email)
      ) {
        return { ok: false as const, error: "An account with this email already exists" };
      }

      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth();
        if (auth) {
          try {
            const credential = await createUserWithEmailAndPassword(auth, email, input.password);
            if (input.fullName.trim()) {
              await updateProfile(credential.user, { displayName: input.fullName.trim() });
            }
            const account: StoredAccount = {
              id: credential.user.uid,
              fullName: input.fullName.trim(),
              email,
              phone: input.phone.trim(),
              role: input.role ?? "HOUSE_OWNER",
              password: "",
              avatarUrl: credential.user.photoURL ?? undefined,
            };
            writeRegistered([...registered, account]);
            const publicUser = toPublicUser(account);
            persist(publicUser);
            return { ok: true as const, user: publicUser };
          } catch (error) {
            const code =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: string }).code)
                : "";
            if (code === "auth/email-already-in-use") {
              return { ok: false as const, error: "An account with this email already exists" };
            }
            if (code === "auth/weak-password") {
              return { ok: false as const, error: "Password should be at least 6 characters" };
            }
            console.error("Firebase register failed", error);
            return { ok: false as const, error: "Could not create account. Try again." };
          }
        }
      }

      await delay(0);
      const account: StoredAccount = {
        id: `u-${Date.now()}`,
        fullName: input.fullName.trim(),
        email,
        phone: input.phone.trim(),
        role: input.role ?? "HOUSE_OWNER",
        password: input.password,
      };
      writeRegistered([...registered, account]);
      const publicUser = toPublicUser(account);
      persist(publicUser);
      return { ok: true as const, user: publicUser };
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null);
    writePendingGoogle(null);
    const auth = getFirebaseAuth();
    if (auth) void signOut(auth).catch(() => undefined);
  }, [persist]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isReady,
      login,
      loginWithGoogle,
      completeGoogleSignup,
      register,
      loginAs,
      loginAsRole,
      logout,
    }),
    [user, isReady, login, loginWithGoogle, completeGoogleSignup, register, loginAs, loginAsRole, logout],
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error("useMockAuth must be used within MockAuthProvider");
  }
  return context;
}
