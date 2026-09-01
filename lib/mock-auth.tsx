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
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  updateProfile,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { createUserDocWithRetry, getUserDoc, type UserDocInput } from "@/lib/firestore/users";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { users as seedUsers } from "@/lib/mock-data/users";
import { isValidPhoneE164, normalizePhoneE164 } from "@/lib/phone-format";
import type { User, UserRole } from "@/lib/types";
import { delay } from "@/lib/utils";

const SESSION_KEY = "bharwana_user_session";
const USERS_KEY = "bharwana_registered_users";
const PENDING_GOOGLE_KEY = "bharwana_pending_google_signup";
const PENDING_REGISTER_KEY = "bharwana_pending_register_profile";

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

type PhoneLoginResult =
  | { ok: true; isNewUser: false; user: User }
  | { ok: true; isNewUser: true; draft: GoogleSignupDraft }
  | { ok: false; error: string };

interface MockAuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  loginWithGoogle: () => Promise<GoogleLoginResult>;
  sendPhoneOtp: (
    phone: string,
    verifier: RecaptchaVerifier,
  ) => Promise<{ ok: true; confirmation: ConfirmationResult } | { ok: false; error: string }>;
  verifyPhoneOtp: (
    confirmation: ConfirmationResult,
    code: string,
  ) => Promise<PhoneLoginResult>;
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
    agencyName?: string;
    registrationNumber?: string;
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
  const { id, fullName, email, phone, role, avatarUrl, savedPropertyIds } = account;
  return { id, fullName, email, phone, role, avatarUrl, savedPropertyIds };
}

/** Demo passwords for local-only dev when Firebase is not configured. */
const SEED_PASSWORDS: Record<string, string> = {};

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

type PendingRegisterProfile = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  agencyName?: string;
  registrationNumber?: string;
};

function readPendingRegister(): PendingRegisterProfile | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REGISTER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingRegisterProfile;
  } catch {
    return null;
  }
}

function writePendingRegister(profile: PendingRegisterProfile | null) {
  if (profile) sessionStorage.setItem(PENDING_REGISTER_KEY, JSON.stringify(profile));
  else sessionStorage.removeItem(PENDING_REGISTER_KEY);
}

function phoneAuthErrorMessage(code: string) {
  switch (code) {
    case "auth/invalid-phone-number":
      return "That phone number looks invalid. Use format +92 3XX XXXXXXX.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "auth/captcha-check-failed":
      return "Security check failed. Refresh the page and try again.";
    case "auth/invalid-verification-code":
      return "Incorrect code. Check the SMS and try again.";
    case "auth/code-expired":
      return "Code expired. Request a new one.";
    case "auth/missing-verification-code":
      return "Enter the 6-digit code from your SMS.";
    case "auth/quota-exceeded":
      return "SMS limit reached. Try again later or use email sign-in.";
    case "auth/operation-not-allowed":
      return "Phone sign-in is disabled for this Firebase project. Enable Phone under Authentication → Sign-in method.";
    default:
      return code ? `Could not verify phone (${code}).` : "Could not verify phone. Try again.";
  }
}

function emailAuthErrorMessage(code: string) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Sign in instead, or use a different email.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again later.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/operation-not-allowed":
      return "Email sign-in is disabled for this Firebase project.";
    default:
      return code ? `Could not complete sign-in (${code}).` : "Could not complete sign-in. Try again.";
  }
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

async function loadFirestoreUser(firebaseUser: FirebaseUser): Promise<User | null> {
  try {
    return await getUserDoc(firebaseUser.uid);
  } catch (error) {
    console.error("Could not load user profile", error);
    return null;
  }
}

async function repairMissingProfile(
  firebaseUser: FirebaseUser,
  defaults: Partial<UserDocInput> = {},
): Promise<User | null> {
  try {
    await firebaseUser.getIdToken(true);
    const email = (defaults.email ?? firebaseUser.email ?? "").trim().toLowerCase();
    if (!email) return null;
    return await createUserDocWithRetry(firebaseUser.uid, {
      fullName: defaults.fullName?.trim() || firebaseUser.displayName?.trim() || email.split("@")[0] || "Member",
      email,
      phone: defaults.phone?.trim() || firebaseUser.phoneNumber || "",
      role: defaults.role ?? "BUYER",
      avatarUrl: defaults.avatarUrl ?? firebaseUser.photoURL ?? undefined,
      agencyName: defaults.agencyName,
      registrationNumber: defaults.registrationNumber,
    });
  } catch (error) {
    console.error("Could not repair missing user profile", error);
    return null;
  }
}

function draftFromFirebaseUser(firebaseUser: FirebaseUser): GoogleSignupDraft {
  const email = (firebaseUser.email ?? "").trim().toLowerCase();
  const phone = firebaseUser.phoneNumber ?? "";
  const placeholderEmail =
    email || (phone ? `${phone.replace(/\D/g, "")}@phone.bharwana.local` : `${firebaseUser.uid}@phone.bharwana.local`);
  return {
    id: firebaseUser.uid,
    fullName: firebaseUser.displayName?.trim() || "Member",
    email: placeholderEmail,
    phone,
    avatarUrl: firebaseUser.photoURL ?? undefined,
  };
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

      try {
        const redirected = await getRedirectResult(auth);
        if (!cancelled && redirected?.user) {
          const profile = await loadFirestoreUser(redirected.user);
          if (profile) {
            persist(profile);
            writePendingGoogle(null);
          } else {
            writePendingGoogle(draftFromFirebaseUser(redirected.user));
          }
        }
      } catch (error) {
        console.error("Google redirect result failed", error);
      }

      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (cancelled) return;
        void (async () => {
          try {
            if (!firebaseUser) {
              persist(null);
              return;
            }

            const profile = await loadFirestoreUser(firebaseUser);
            if (profile) {
              writePendingGoogle(null);
              persist(profile);
              return;
            }

            const draft = draftFromFirebaseUser(firebaseUser);
            const pending = readPendingGoogle();
            const samePending =
              pending?.id === firebaseUser.uid ||
              (pending?.phone && pending.phone === firebaseUser.phoneNumber);
            if (samePending) {
              persist(null);
            } else {
              writePendingGoogle(draft);
              persist(null);
            }
          } catch (error) {
            console.error("Auth state sync failed", error);
          } finally {
            if (!cancelled) setIsReady(true);
          }
        })();
      });

      window.setTimeout(() => {
        if (!cancelled) setIsReady(true);
      }, 4000);
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
            let profile = await loadFirestoreUser(credential.user);
            if (!profile) {
              const pending = readPendingRegister();
              profile = await repairMissingProfile(credential.user, {
                email: normalized,
                fullName: pending?.email === normalized ? pending.fullName : undefined,
                phone: pending?.email === normalized ? pending.phone : undefined,
                role: pending?.email === normalized ? pending.role : "BUYER",
                agencyName: pending?.email === normalized ? pending.agencyName : undefined,
                registrationNumber:
                  pending?.email === normalized ? pending.registrationNumber : undefined,
              });
            }
            if (!profile) {
              return {
                ok: false as const,
                error:
                  "Your account exists but your profile could not be loaded. Try again in a moment or contact support.",
              };
            }
            persist(profile);
            writePendingRegister(null);
            return { ok: true as const, user: profile };
          } catch (error) {
            const code =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: string }).code)
                : "";
            console.error("Firebase login failed", error);
            return { ok: false as const, error: emailAuthErrorMessage(code) };
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

      const profile = await loadFirestoreUser(result.user);
      if (profile) {
        persist(profile);
        writePendingGoogle(null);
        return { ok: true as const, isNewUser: false as const, user: profile };
      }

      const draft = draftFromFirebaseUser(result.user);
      writePendingGoogle(draft);
      return { ok: true as const, isNewUser: true as const, draft };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: string }).code)
          : "";
      console.error("Google sign-in failed", error);
      return { ok: false as const, error: googleAuthErrorMessage(code) };
    }
  }, [persist]);

  const sendPhoneOtp = useCallback(
    async (phone: string, verifier: RecaptchaVerifier) => {
      if (!isFirebaseConfigured()) {
        return {
          ok: false as const,
          error: "Phone sign-in is not ready on this deploy. Firebase env vars are missing.",
        };
      }
      const auth = getFirebaseAuth();
      if (!auth) {
        return { ok: false as const, error: "Phone sign-in is unavailable right now." };
      }

      const normalized = normalizePhoneE164(phone);
      if (!isValidPhoneE164(normalized)) {
        return { ok: false as const, error: "Enter a valid phone number (e.g. +92 300 1234567)." };
      }

      try {
        const confirmation = await signInWithPhoneNumber(auth, normalized, verifier);
        return { ok: true as const, confirmation };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        console.error("Phone OTP send failed", error);
        return { ok: false as const, error: phoneAuthErrorMessage(code) };
      }
    },
    [],
  );

  const verifyPhoneOtp = useCallback(
    async (confirmation: ConfirmationResult, code: string) => {
      const trimmed = code.trim();
      if (trimmed.length !== 6) {
        return { ok: false as const, error: "Enter the 6-digit code." };
      }

      try {
        const result = await confirmation.confirm(trimmed);
        const profile = await loadFirestoreUser(result.user);
        if (profile) {
          persist(profile);
          writePendingGoogle(null);
          return { ok: true as const, isNewUser: false as const, user: profile };
        }

        const draft = draftFromFirebaseUser(result.user);
        writePendingGoogle(draft);
        return { ok: true as const, isNewUser: true as const, draft };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        console.error("Phone OTP verify failed", error);
        return { ok: false as const, error: phoneAuthErrorMessage(code) };
      }
    },
    [persist],
  );

  const completeGoogleSignup = useCallback(
    async (input: {
      draft: GoogleSignupDraft;
      role: UserRole;
      agencyName?: string;
      registrationNumber?: string;
    }) => {
      const email = input.draft.email.trim().toLowerCase();

      if (isFirebaseConfigured()) {
        try {
          const profile = await createUserDocWithRetry(input.draft.id, {
            fullName: input.draft.fullName,
            email,
            phone: input.draft.phone,
            role: input.role,
            avatarUrl: input.draft.avatarUrl,
            agencyName: input.agencyName,
            registrationNumber: input.registrationNumber,
          });
          persist(profile);
          writePendingGoogle(null);
          return { ok: true as const, user: profile };
        } catch (error) {
          console.error("Google signup profile save failed", error);
          return {
            ok: false as const,
            error: firestoreErrorMessage(error, "Could not save your profile. Try again."),
          };
        }
      }

      const registered = readRegistered();
      if (registered.some((item) => item.email.toLowerCase() === email)) {
        return { ok: false as const, error: "An account with this email already exists." };
      }
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
      agencyName?: string;
      registrationNumber?: string;
    }) => {
      const email = input.email.trim().toLowerCase();
      const role = input.role ?? "HOUSE_OWNER";

      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth();
        if (auth) {
          try {
            const credential = await createUserWithEmailAndPassword(auth, email, input.password);
            await credential.user.getIdToken(true);

            const profileInput: UserDocInput = {
              fullName: input.fullName.trim(),
              email,
              phone: input.phone.trim(),
              role,
              avatarUrl: credential.user.photoURL ?? undefined,
              agencyName: input.agencyName,
              registrationNumber: input.registrationNumber,
            };

            const [, profile] = await Promise.all([
              input.fullName.trim()
                ? updateProfile(credential.user, { displayName: input.fullName.trim() })
                : Promise.resolve(),
              createUserDocWithRetry(credential.user.uid, profileInput),
            ]);

            persist(profile);
            writePendingRegister(null);
            return { ok: true as const, user: profile };
          } catch (error) {
            const code =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: string }).code)
                : "";
            if (code.startsWith("auth/")) {
              console.error("Firebase register failed", error);
              return { ok: false as const, error: emailAuthErrorMessage(code) };
            }
            const currentUser = auth.currentUser;
            if (currentUser?.email?.toLowerCase() === email) {
              writePendingRegister({
                uid: currentUser.uid,
                fullName: input.fullName.trim(),
                email,
                phone: input.phone.trim(),
                role,
                agencyName: input.agencyName,
                registrationNumber: input.registrationNumber,
              });
            }
            console.error("Firebase register profile save failed", error);
            return {
              ok: false as const,
              error: firestoreErrorMessage(
                error,
                "Account was created but your profile could not be saved. Try signing in.",
              ),
            };
          }
        }
      }

      const registered = readRegistered();
      if (
        registered.some((item) => item.email.toLowerCase() === email) ||
        seedUsers.some((item) => item.email.toLowerCase() === email)
      ) {
        return { ok: false as const, error: "An account with this email already exists" };
      }

      await delay(0);
      const account: StoredAccount = {
        id: `u-${Date.now()}`,
        fullName: input.fullName.trim(),
        email,
        phone: input.phone.trim(),
        role,
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
      sendPhoneOtp,
      verifyPhoneOtp,
      completeGoogleSignup,
      register,
      loginAs,
      loginAsRole,
      logout,
    }),
    [user, isReady, login, loginWithGoogle, sendPhoneOtp, verifyPhoneOtp, completeGoogleSignup, register, loginAs, loginAsRole, logout],
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
