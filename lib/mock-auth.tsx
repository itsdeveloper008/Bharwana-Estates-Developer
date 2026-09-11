"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EmailAuthProvider,
  FacebookAuthProvider,
  GoogleAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  getRedirectResult,
  linkWithCredential,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePhoneNumber,
  updateProfile,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured, logFirebaseConfigDiagnostics } from "@/lib/firebase/client";
import { createDeletionRequest, purgeUserOwnedData } from "@/lib/firestore/deletion";
import {
  createUserDocWithRetry,
  getUserDoc,
  updateUserEmail,
  updateUserPhone,
  type UserDocInput,
} from "@/lib/firestore/users";
import { firestoreErrorMessage } from "@/lib/firestore/errors";
import { users as seedUsers } from "@/lib/mock-data/users";
import { isValidPhoneE164, normalizePhoneE164 } from "@/lib/phone-format";
import { firebaseErrorParts, phoneAuthErrorMessage } from "@/lib/phone-auth-errors";
import type { User, UserRole } from "@/lib/types";
import { authEmailFromLoginIdentifier, isSyntheticPhoneEmail } from "@/lib/user-display";
import { delay } from "@/lib/utils";

function shouldPreferOAuthRedirect(): boolean {
  if (typeof window === "undefined") return false;
  const narrow = window.innerWidth > 0 && window.innerWidth < 768;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return narrow || mobileUa;
}
const SESSION_KEY = "bharwana_user_session";
const USERS_KEY = "bharwana_registered_users";
const PENDING_GOOGLE_KEY = "bharwana_pending_google_signup";
const PENDING_REGISTER_KEY = "bharwana_pending_register_profile";
const GOOGLE_RETURN_KEY = "bharwana_google_auth_return";

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
  | { ok: true; redirecting: true }
  | { ok: false; error: string };

type PhoneLoginResult =
  | { ok: true; isNewUser: false; user: User }
  | { ok: true; isNewUser: true; draft: GoogleSignupDraft }
  | { ok: false; error: string };

export type AccountAuthMethod = "password" | "google" | "facebook" | "phone";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: string; needsReauth?: boolean; authMethod?: AccountAuthMethod };

interface MockAuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  pendingGoogleSignup: GoogleSignupDraft | null;
  login: (email: string, password: string) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  loginWithGoogle: () => Promise<GoogleLoginResult>;
  loginWithFacebook: () => Promise<GoogleLoginResult>;
  consumeGoogleReturn: () => boolean;
  /** Dismiss incomplete Google/Facebook signup so email/phone login can proceed. */
  cancelPendingOAuthSignup: () => Promise<void>;
  sendPhoneOtp: (
    phone: string,
    verifier: RecaptchaVerifier,
  ) => Promise<{ ok: true; confirmation: ConfirmationResult } | { ok: false; error: string }>;
  verifyPhoneOtp: (
    confirmation: ConfirmationResult,
    code: string,
  ) => Promise<PhoneLoginResult>;
  /** Send OTP to a new number while signed in (does not switch sessions). */
  sendChangePhoneOtp: (
    phone: string,
    verifier: RecaptchaVerifier,
  ) => Promise<{ ok: true; verificationId: string; phone: string } | { ok: false; error: string }>;
  /** Confirm OTP and update Auth + Firestore phone on the current user. */
  confirmChangePhone: (input: {
    verificationId: string;
    code: string;
    phone: string;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  completeGoogleSignup: (input: {
    draft: GoogleSignupDraft;
    role: UserRole;
    agencyName?: string;
    registrationNumber?: string;
    /** When true, save profile but leave app session unset until adoptSession (phone password prompt). */
    skipCommit?: boolean;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  /** Commit an already-created profile into the app session. */
  adoptSession: (user: User) => void;
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
  deleteAccount: () => Promise<DeleteAccountResult>;
  reauthenticateForDeletion: (input?: {
    password?: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  submitDeletionRequest: (note?: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  getAccountAuthMethod: () => AccountAuthMethod | null;
  /** True when the signed-in Firebase user has an email/password provider linked. */
  hasPasswordProvider: () => boolean;
  /** Link a password to the current account (phone users keep their hidden internal email). */
  linkEmailPassword: (input: {
    email?: string;
    password: string;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
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
    case "auth/network-request-failed":
      return "Could not reach Firebase Auth. Check your internet, disable ad blockers for this site, or try another browser/network.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for sign-in. In Firebase → Authentication → Settings → Authorized domains, add localhost (for local testing) and your live domain.";
    default:
      return code ? `Could not complete sign-in (${code}).` : "Could not complete sign-in. Try again.";
  }
}

function googleAuthErrorMessage(code: string) {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Google sign-in did not finish. Keep the Google window open, choose an account, and allow popups for this site.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google popup. Allow popups for this site, then try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Google sign-in. In Firebase → Authentication → Settings, add localhost and your live domain.";
    case "auth/operation-not-allowed":
      return "Google sign-in is disabled in Firebase. Enable Google under Authentication → Sign-in method.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/network-request-failed":
      return "Could not reach Google/Firebase Auth. Check your internet, disable ad blockers, or try another browser/network.";
    case "auth/invalid-continue-uri":
    case "auth/unauthorized-continue-uri":
      return "Google sign-in cannot return to this domain yet. Check Firebase Hosting / authorized domains for this project.";
    default:
      return code
        ? `Could not sign in with Google (${code}).`
        : "Could not sign in with Google. Try again.";
  }
}

function facebookAuthErrorMessage(code: string) {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Facebook sign-in did not finish. Keep the Facebook window open and allow popups for this site.";
    case "auth/popup-blocked":
      return "Your browser blocked the Facebook popup. Allow popups for this site, then try again.";
    case "auth/unauthorized-domain":
      return "This domain is not authorized for Facebook sign-in. In Firebase → Authentication → Settings, add localhost and your live domain.";
    case "auth/operation-not-allowed":
      return "Facebook sign-in is disabled in Firebase. Enable Facebook under Authentication → Sign-in method.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method. Sign in with that method first.";
    case "auth/network-request-failed":
      return "Could not reach Facebook/Firebase Auth. Check your internet, disable ad blockers, or try another browser/network.";
    default:
      return code
        ? `Could not sign in with Facebook (${code}).`
        : "Could not sign in with Facebook. Try again.";
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
  const [pendingGoogleSignup, setPendingGoogleSignup] = useState<GoogleSignupDraft | null>(null);
  const authSyncGenerationRef = useRef(0);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const persist = useCallback((next: User | null) => {
    userRef.current = next;
    setUser(next);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  }, []);

  const setPendingGoogle = useCallback((draft: GoogleSignupDraft | null) => {
    writePendingGoogle(draft);
    setPendingGoogleSignup(draft);
  }, []);

  /** Persist a confirmed session and invalidate any in-flight auth sync that could wipe it. */
  const commitSession = useCallback(
    (profile: User) => {
      authSyncGenerationRef.current += 1;
      setPendingGoogle(null);
      persist(profile);
    },
    [persist, setPendingGoogle],
  );

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let readyTimer: number | undefined;

    async function boot() {
      try {
        const pending = readPendingGoogle();
        if (!cancelled && pending) setPendingGoogleSignup(pending);
      } catch {
        // ignore
      }

      if (!isFirebaseConfigured()) {
        // Mock/local mode only — restore cached session.
        try {
          const raw = localStorage.getItem(SESSION_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as User;
            if (parsed?.id && parsed?.email) setUser(parsed);
          }
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
        logFirebaseConfigDiagnostics("auth");
        if (!cancelled) setIsReady(true);
        return;
      }

      const auth = getFirebaseAuth();
      if (!auth) {
        if (!cancelled) setIsReady(true);
        return;
      }

      // Never leave the UI stuck on "Checking your session…" — Auth network calls can hang
      // (e.g. getProjectConfig ERR_CONNECTION_CLOSED) without rejecting.
      readyTimer = window.setTimeout(() => {
        if (!cancelled) setIsReady(true);
      }, 900);

      const markReady = () => {
        if (cancelled) return;
        if (readyTimer) window.clearTimeout(readyTimer);
        setIsReady(true);
      };

      // Attach listener first — do not await getRedirectResult (it can hang indefinitely).
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (cancelled) return;
        const syncId = ++authSyncGenerationRef.current;
        void (async () => {
          try {
            if (!firebaseUser) {
              if (cancelled || syncId !== authSyncGenerationRef.current) return;
              setPendingGoogle(null);
              persist(null);
              return;
            }

            // Retry once — login/register may still be writing the Firestore profile.
            let profile = await loadFirestoreUser(firebaseUser);
            if (!profile) {
              await delay(350);
              profile = await loadFirestoreUser(firebaseUser);
            }
            if (cancelled || syncId !== authSyncGenerationRef.current) return;

            if (!profile) {
              const providers = firebaseUser.providerData.map((p) => p.providerId);
              if (providers.includes("password")) {
                profile = await repairMissingProfile(firebaseUser);
                if (cancelled || syncId !== authSyncGenerationRef.current) return;
                if (profile) {
                  setPendingGoogle(null);
                  persist(profile);
                  return;
                }
                // Never wipe a password session here — login() may have just committed it.
                if (userRef.current?.id === firebaseUser.uid) return;
                console.error("Password user has Firebase auth but no Firestore profile");
                return;
              }

              // Phone OTP flow owns its role dialog (PhoneOtpSection). Do not set
              // pendingGoogle here or ContinueWithGoogle opens a duplicate modal.
              const isPhoneOnly =
                providers.includes("phone") && !providers.includes("google.com");
              if (isPhoneOnly) {
                if (userRef.current?.id === firebaseUser.uid) return;
                persist(null);
                return;
              }
            }

            if (profile) {
              setPendingGoogle(null);
              persist(profile);
              return;
            }

            // Google user with no profile yet — role completion, not a logged-in session.
            const draft = draftFromFirebaseUser(firebaseUser);
            const pending = readPendingGoogle();
            const samePending =
              pending?.id === firebaseUser.uid ||
              (pending?.phone && pending.phone === firebaseUser.phoneNumber);
            if (!samePending) setPendingGoogle(draft);
            // Don't clear an already-committed session for this uid (login race).
            if (syncId !== authSyncGenerationRef.current) return;
            if (userRef.current?.id === firebaseUser.uid) return;
            persist(null);
          } catch (error) {
            console.error("Auth state sync failed", error);
          } finally {
            if (!cancelled && syncId === authSyncGenerationRef.current) markReady();
          }
        })();
      });

      try {
        // Must await redirect completion — racing a short timeout used to drop the
        // credential and leave users back on /login with no session.
        const redirected = await getRedirectResult(auth);
        if (!cancelled && redirected?.user) {
          try {
            sessionStorage.setItem(
              GOOGLE_RETURN_KEY,
              sessionStorage.getItem(GOOGLE_RETURN_KEY) ||
                `${window.location.pathname}${window.location.search}`,
            );
          } catch {
            /* ignore */
          }
          const profile = await loadFirestoreUser(redirected.user);
          if (profile) {
            persist(profile);
            setPendingGoogle(null);
          } else {
            setPendingGoogle(draftFromFirebaseUser(redirected.user));
          }
          markReady();
        }
      } catch (error) {
        console.error("Google redirect result failed", error);
        markReady();
      }
    }

    void boot();
    return () => {
      cancelled = true;
      if (readyTimer) window.clearTimeout(readyTimer);
      unsubscribe?.();
    };
  }, [persist, setPendingGoogle]);

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
      const normalized = authEmailFromLoginIdentifier(email);

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
            commitSession(profile);
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
        commitSession(publicUser);
        return { ok: true as const, user: publicUser };
      }

      const seed = seedUsers.find((item) => item.email.toLowerCase() === normalized);
      if (seed && SEED_PASSWORDS[seed.email] === password) {
        commitSession(seed);
        return { ok: true as const, user: seed };
      }

      return { ok: false as const, error: "Invalid email or password" };
    },
    [commitSession],
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

    async function finishGoogleUser(firebaseUser: FirebaseUser): Promise<GoogleLoginResult> {
      const email = (firebaseUser.email ?? "").trim().toLowerCase();
      if (!email) return { ok: false as const, error: "Google account did not return an email." };

      const profile = await loadFirestoreUser(firebaseUser);
      if (profile) {
        commitSession(profile);
        return { ok: true as const, isNewUser: false as const, user: profile };
      }

      const draft = draftFromFirebaseUser(firebaseUser);
      setPendingGoogle(draft);
      return { ok: true as const, isNewUser: true as const, draft };
    }

    // Popup only. Redirect to firebaseapp.com authDomain then back to the custom
    // domain drops the session in Chrome (3P storage), so users land on /login unsigned.
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    provider.addScope("email");
    provider.addScope("profile");

    try {
      const result = await signInWithPopup(auth, provider);
      return await finishGoogleUser(result.user);
    } catch (popupError) {
      const code =
        popupError && typeof popupError === "object" && "code" in popupError
          ? String((popupError as { code?: string }).code)
          : "";
      console.error("Google sign-in failed", { code, popupError });
      return { ok: false as const, error: googleAuthErrorMessage(code) };
    }
  }, [commitSession, setPendingGoogle]);

  const loginWithFacebook = useCallback(async () => {
    if (!isFirebaseConfigured()) {
      return {
        ok: false as const,
        error: "Facebook sign-in is not ready on this deploy. Firebase env vars are missing.",
      };
    }
    const auth = getFirebaseAuth();
    if (!auth) {
      return { ok: false as const, error: "Facebook sign-in is unavailable right now." };
    }
    const firebaseAuth = auth;

    async function finishFacebookUser(firebaseUser: FirebaseUser): Promise<GoogleLoginResult> {
      const email = (firebaseUser.email ?? "").trim().toLowerCase();
      if (!email) {
        return {
          ok: false as const,
          error: "Facebook did not share an email. Allow email access, or use Google / email sign-in.",
        };
      }

      const profile = await loadFirestoreUser(firebaseUser);
      if (profile) {
        commitSession(profile);
        return { ok: true as const, isNewUser: false as const, user: profile };
      }

      const draft = draftFromFirebaseUser(firebaseUser);
      setPendingGoogle(draft);
      return { ok: true as const, isNewUser: true as const, draft };
    }

    const provider = new FacebookAuthProvider();
    provider.addScope("email");
    provider.addScope("public_profile");
    provider.setCustomParameters({ display: "popup" });

    async function startFacebookRedirect(): Promise<GoogleLoginResult> {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          GOOGLE_RETURN_KEY,
          `${window.location.pathname}${window.location.search}`,
        );
      }
      await signInWithRedirect(firebaseAuth, provider);
      return { ok: true as const, redirecting: true as const };
    }

    if (shouldPreferOAuthRedirect()) {
      try {
        return await startFacebookRedirect();
      } catch (redirectError) {
        const redirectCode =
          redirectError && typeof redirectError === "object" && "code" in redirectError
            ? String((redirectError as { code?: string }).code)
            : "";
        console.error("Facebook redirect failed", { code: redirectCode, redirectError });
        return { ok: false as const, error: facebookAuthErrorMessage(redirectCode) };
      }
    }

    // Prefer redirect over popup to avoid Chrome COOP / window.closed failures.
    try {
      return await startFacebookRedirect();
    } catch (redirectError) {
      const redirectCode =
        redirectError && typeof redirectError === "object" && "code" in redirectError
          ? String((redirectError as { code?: string }).code)
          : "";
      console.error("Facebook redirect failed; trying popup", { code: redirectCode, redirectError });
      try {
        const result = await signInWithPopup(firebaseAuth, provider);
        return await finishFacebookUser(result.user);
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : redirectCode;
        console.error("Facebook sign-in failed", { code, error });
        return { ok: false as const, error: facebookAuthErrorMessage(code) };
      }
    }
  }, [commitSession, setPendingGoogle]);

  const consumeGoogleReturn = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(GOOGLE_RETURN_KEY);
      if (raw === null) return false;
      sessionStorage.removeItem(GOOGLE_RETURN_KEY);
      return true;
    } catch {
      return false;
    }
  }, []);

  const cancelPendingOAuthSignup = useCallback(async () => {
    setPendingGoogle(null);
    const auth = getFirebaseAuth();
    const firebaseUser = auth?.currentUser;
    if (!firebaseUser) return;
    // Profile was just committed — never tear down a finished signup.
    if (userRef.current?.id === firebaseUser.uid) return;

    // Incomplete social signup (no Firestore profile yet) — sign out so login form works.
    let profile = await loadFirestoreUser(firebaseUser).catch(() => null);
    if (!profile) {
      await delay(500);
      profile = await loadFirestoreUser(firebaseUser).catch(() => null);
    }
    if (!profile) {
      authSyncGenerationRef.current += 1;
      persist(null);
      await signOut(auth).catch(() => undefined);
    }
  }, [persist, setPendingGoogle]);

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
        const rawMessage =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "";
        return { ok: false as const, error: phoneAuthErrorMessage(code, rawMessage) };
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
          commitSession(profile);
          return { ok: true as const, isNewUser: false as const, user: profile };
        }

        const draft = draftFromFirebaseUser(result.user);
        // Do not set pendingGoogle here — PhoneOtpSection owns the role dialog.
        // Setting both causes a duplicate "Choose your role" modal with ContinueWithGoogle.
        return { ok: true as const, isNewUser: true as const, draft };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        console.error("Phone OTP verify failed", error);
        const rawMessage =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "";
        return { ok: false as const, error: phoneAuthErrorMessage(code, rawMessage) };
      }
    },
    [commitSession],
  );

  const sendChangePhoneOtp = useCallback(
    async (phone: string, verifier: RecaptchaVerifier) => {
      if (!user) {
        return { ok: false as const, error: "You must be signed in to change your phone number." };
      }
      if (!isFirebaseConfigured()) {
        return {
          ok: false as const,
          error: "Phone updates need Firebase on this deploy.",
        };
      }
      const auth = getFirebaseAuth();
      const firebaseUser = auth?.currentUser;
      if (!auth || !firebaseUser || firebaseUser.uid !== user.id) {
        return {
          ok: false as const,
          error: "Session expired. Sign in again, then try changing your phone number.",
        };
      }

      const normalized = normalizePhoneE164(phone);
      if (!isValidPhoneE164(normalized)) {
        return { ok: false as const, error: "Enter a valid phone number (e.g. +92 300 1234567)." };
      }
      if (firebaseUser.phoneNumber === normalized || user.phone === normalized) {
        return { ok: false as const, error: "That is already your current phone number." };
      }

      try {
        const provider = new PhoneAuthProvider(auth);
        const verificationId = await provider.verifyPhoneNumber(normalized, verifier);
        return { ok: true as const, verificationId, phone: normalized };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        console.error("Change phone OTP send failed", error);
        const rawMessage =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "";
        return { ok: false as const, error: phoneAuthErrorMessage(code, rawMessage) };
      }
    },
    [user],
  );

  const confirmChangePhone = useCallback(
    async (input: { verificationId: string; code: string; phone: string }) => {
      if (!user) {
        return { ok: false as const, error: "You must be signed in to change your phone number." };
      }
      const trimmed = input.code.trim();
      if (trimmed.length !== 6) {
        return { ok: false as const, error: "Enter the 6-digit code." };
      }

      const auth = getFirebaseAuth();
      const firebaseUser = auth?.currentUser;
      if (!auth || !firebaseUser || firebaseUser.uid !== user.id) {
        return {
          ok: false as const,
          error: "Session expired. Sign in again, then try changing your phone number.",
        };
      }

      const normalized = normalizePhoneE164(input.phone);
      if (!isValidPhoneE164(normalized)) {
        return { ok: false as const, error: "Enter a valid phone number (e.g. +92 300 1234567)." };
      }

      try {
        const credential = PhoneAuthProvider.credential(input.verificationId, trimmed);
        if (firebaseUser.phoneNumber) {
          await updatePhoneNumber(firebaseUser, credential);
        } else {
          await linkWithCredential(firebaseUser, credential);
        }

        try {
          await updateUserPhone(user.id, normalized);
        } catch (firestoreError) {
          console.error("Auth phone updated but Firestore sync failed", firestoreError);
          return {
            ok: false as const,
            error:
              "Phone was verified in Auth, but we could not save it to your profile. Refresh and try again.",
          };
        }

        const nextUser: User = { ...user, phone: normalized };
        commitSession(nextUser);

        try {
          const registered = readRegistered();
          const index = registered.findIndex((item) => item.id === user.id);
          if (index >= 0) {
            registered[index] = { ...registered[index], phone: normalized };
            writeRegistered(registered);
          }
        } catch {
          // local mirror is best-effort
        }

        return { ok: true as const, user: nextUser };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code?: string }).code)
            : "";
        console.error("Change phone confirm failed", error);
        const rawMessage =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "";
        return { ok: false as const, error: phoneAuthErrorMessage(code, rawMessage) };
      }
    },
    [user, commitSession],
  );

  const completeGoogleSignup = useCallback(
    async (input: {
      draft: GoogleSignupDraft;
      role: UserRole;
      agencyName?: string;
      registrationNumber?: string;
      skipCommit?: boolean;
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
          if (input.skipCommit) {
            setPendingGoogle(null);
          } else {
            commitSession(profile);
          }
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
      if (input.skipCommit) {
        setPendingGoogle(null);
      } else {
        commitSession(publicUser);
      }
      return { ok: true as const, user: publicUser };
    },
    [commitSession, setPendingGoogle],
  );

  const adoptSession = useCallback(
    (profile: User) => {
      commitSession(profile);
    },
    [commitSession],
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
      const profileInput: UserDocInput = {
        fullName: input.fullName.trim(),
        email,
        phone: input.phone.trim(),
        role,
        agencyName: input.agencyName,
        registrationNumber: input.registrationNumber,
      };

      async function finishWithProfile(uid: string, firebaseUser?: FirebaseUser) {
        console.info("[register] Writing Firestore profile", { uid, email, role });
        const profile = await createUserDocWithRetry(uid, {
          ...profileInput,
          avatarUrl: firebaseUser?.photoURL ?? undefined,
        });
        console.info("[register] Firestore profile saved", { uid: profile.id });
        if (firebaseUser && profileInput.fullName) {
          void updateProfile(firebaseUser, { displayName: profileInput.fullName }).catch((err) =>
            console.warn("[register] displayName update skipped", err),
          );
        }
        commitSession(profile);
        writePendingRegister(null);
        return { ok: true as const, user: profile };
      }

      if (isFirebaseConfigured()) {
        const auth = getFirebaseAuth();
        if (auth) {
          try {
            console.info("[register] Creating Firebase Auth user", { email });
            const credential = await createUserWithEmailAndPassword(auth, email, input.password);
            console.info("[register] Auth user created", { uid: credential.user.uid });
            return await finishWithProfile(credential.user.uid, credential.user);
          } catch (error) {
            const code =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: string }).code)
                : "";
            console.error("[register] Failed", { code, error });

            // Auth succeeded earlier but profile write failed — complete signup on retry.
            if (code === "auth/email-already-in-use") {
              try {
                console.info("[register] Email exists — signing in to finish profile", { email });
                const credential = await signInWithEmailAndPassword(auth, email, input.password);
                const existing = await loadFirestoreUser(credential.user);
                if (existing) {
                  commitSession(existing);
                  writePendingRegister(null);
                  return { ok: true as const, user: existing };
                }
                return await finishWithProfile(credential.user.uid, credential.user);
              } catch (recoverError) {
                console.error("[register] Could not finish existing Auth account", recoverError);
                return {
                  ok: false as const,
                  error:
                    "This email is already registered. Sign in with your password, or use a different email.",
                };
              }
            }

            if (code.startsWith("auth/")) {
              return { ok: false as const, error: emailAuthErrorMessage(code) };
            }

            const currentUser = auth.currentUser;
            if (currentUser?.email?.toLowerCase() === email) {
              writePendingRegister({
                uid: currentUser.uid,
                fullName: profileInput.fullName,
                email,
                phone: profileInput.phone,
                role,
                agencyName: input.agencyName,
                registrationNumber: input.registrationNumber,
              });
              try {
                return await finishWithProfile(currentUser.uid, currentUser);
              } catch (retryError) {
                console.error("[register] Profile retry failed", retryError);
              }
            }

            return {
              ok: false as const,
              error: firestoreErrorMessage(
                error,
                "Account was created but your profile could not be saved. Try signing in once — we will finish setup.",
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

      const account: StoredAccount = {
        id: `u-${Date.now()}`,
        fullName: profileInput.fullName,
        email,
        phone: profileInput.phone,
        role,
        password: input.password,
      };
      writeRegistered([...registered, account]);
      const publicUser = toPublicUser(account);
      commitSession(publicUser);
      return { ok: true as const, user: publicUser };
    },
    [commitSession],
  );

  const logout = useCallback(() => {
    authSyncGenerationRef.current += 1;
    persist(null);
    setPendingGoogle(null);
    const auth = getFirebaseAuth();
    if (auth) void signOut(auth).catch(() => undefined);
  }, [persist, setPendingGoogle]);

  const getAccountAuthMethod = useCallback((): AccountAuthMethod | null => {
    const auth = getFirebaseAuth();
    const firebaseUser = auth?.currentUser;
    if (!firebaseUser) return null;
    const providers = firebaseUser.providerData.map((p) => p.providerId);
    if (providers.includes("password")) return "password";
    if (providers.includes("google.com")) return "google";
    if (providers.includes("facebook.com")) return "facebook";
    if (providers.includes("phone")) return "phone";
    return firebaseUser.email ? "password" : null;
  }, []);

  const hasPasswordProvider = useCallback((): boolean => {
    const auth = getFirebaseAuth();
    const firebaseUser = auth?.currentUser;
    if (!firebaseUser) return false;
    return firebaseUser.providerData.some((p) => p.providerId === "password");
  }, []);

  const linkEmailPassword = useCallback(
    async (input: { email?: string; password: string }) => {
      if (!user) {
        return { ok: false as const, error: "You must be signed in to add a password." };
      }
      if (!input.password) {
        return { ok: false as const, error: "Enter a password." };
      }

      const requested = (input.email ?? "").trim().toLowerCase();
      // Phone accounts keep their hidden synthetic email; never require a real email in the UI.
      const email =
        requested && !isSyntheticPhoneEmail(requested)
          ? requested
          : user.email.trim().toLowerCase();

      if (!email || !email.includes("@")) {
        return { ok: false as const, error: "Could not link a password to this account. Sign in again and retry." };
      }

      const auth = getFirebaseAuth();
      const firebaseUser = auth?.currentUser;
      if (!auth || !firebaseUser || firebaseUser.uid !== user.id) {
        return {
          ok: false as const,
          error: "Session expired. Sign in again, then try adding a password.",
        };
      }

      if (firebaseUser.providerData.some((p) => p.providerId === "password")) {
        return { ok: false as const, error: "This account already has a password." };
      }

      try {
        const credential = EmailAuthProvider.credential(email, input.password);
        await linkWithCredential(firebaseUser, credential);

        const keepSynthetic = isSyntheticPhoneEmail(email);
        if (!keepSynthetic && email !== user.email.trim().toLowerCase()) {
          try {
            await updateUserEmail(user.id, email);
          } catch (firestoreError) {
            console.error("Password linked but Firestore email sync failed", firestoreError);
            return {
              ok: false as const,
              error: "Password was linked, but we could not save your email to the profile. Refresh and try again.",
            };
          }
        }

        const nextUser: User = keepSynthetic ? { ...user } : { ...user, email };
        commitSession(nextUser);
        return { ok: true as const, user: nextUser };
      } catch (error) {
        const { code } = firebaseErrorParts(error);
        console.error("linkEmailPassword failed", error);
        if (code === "auth/email-already-in-use" || code === "auth/credential-already-in-use") {
          return {
            ok: false as const,
            error: "That email is already used by another account. Use a different email.",
          };
        }
        if (code === "auth/provider-already-linked") {
          return { ok: false as const, error: "This account already has a password." };
        }
        if (code === "auth/requires-recent-login") {
          return {
            ok: false as const,
            error: "For security, sign out, sign back in with phone OTP, then add a password.",
          };
        }
        if (code === "auth/weak-password") {
          return { ok: false as const, error: "Choose a stronger password." };
        }
        if (code === "auth/invalid-email") {
          return { ok: false as const, error: "Could not link a password to this account." };
        }
        return { ok: false as const, error: emailAuthErrorMessage(code) };
      }
    },
    [user, commitSession],
  );

  const clearLocalAccountTraces = useCallback((uid: string, email: string) => {
    try {
      const registered = readRegistered().filter(
        (account) => account.id !== uid && account.email.toLowerCase() !== email.toLowerCase(),
      );
      writeRegistered(registered);

      const savedRaw = localStorage.getItem("bharwana_saved_properties");
      if (savedRaw) {
        const map = JSON.parse(savedRaw) as Record<string, string[]>;
        if (map && typeof map === "object") {
          delete map[uid];
          localStorage.setItem("bharwana_saved_properties", JSON.stringify(map));
        }
      }

      const developersRaw = localStorage.getItem("bharwana_developers_v1");
      if (developersRaw) {
        const developers = JSON.parse(developersRaw) as Array<Record<string, unknown>>;
        if (Array.isArray(developers)) {
          const next = developers.map((developer) =>
            developer.dealerUserId === uid
              ? { ...developer, accountDeleted: true, dealerUserId: undefined }
              : developer,
          );
          const deletedDeveloperIds = new Set(
            next.filter((d) => d.accountDeleted && !d.dealerUserId).map((d) => String(d.id)),
          );
          // Only mark developers we just flipped for this uid
          const markedIds = new Set(
            developers
              .filter((d) => d.dealerUserId === uid)
              .map((d) => String(d.id)),
          );
          localStorage.setItem("bharwana_developers_v1", JSON.stringify(next));

          const txRaw = localStorage.getItem("bharwana_transactions_v1");
          if (txRaw) {
            const transactions = JSON.parse(txRaw) as Array<Record<string, unknown>>;
            if (Array.isArray(transactions)) {
              localStorage.setItem(
                "bharwana_transactions_v1",
                JSON.stringify(
                  transactions.map((tx) =>
                    markedIds.has(String(tx.developerId ?? "")) ||
                    deletedDeveloperIds.has(String(tx.developerId ?? ""))
                      ? { ...tx, dealerDeleted: true }
                      : tx,
                  ),
                ),
              );
            }
          }
        }
      }

      const propertiesRaw = localStorage.getItem("bharwana_properties_v1");
      if (propertiesRaw) {
        const properties = JSON.parse(propertiesRaw) as Array<Record<string, unknown>>;
        if (Array.isArray(properties)) {
          localStorage.setItem(
            "bharwana_properties_v1",
            JSON.stringify(properties.filter((property) => property.ownerUserId !== uid)),
          );
        }
      }
    } catch {
      // ignore local cleanup failures
    }
  }, []);

  const deleteAccount = useCallback(async (): Promise<DeleteAccountResult> => {
    if (!user) return { ok: false, error: "You must be signed in to delete your account." };

    const auth = getFirebaseAuth();
    const firebaseUser = auth?.currentUser;

    try {
      if (isFirebaseConfigured()) {
        await purgeUserOwnedData(user.id);
      }
      clearLocalAccountTraces(user.id, user.email);

      if (firebaseUser && firebaseUser.uid === user.id) {
        await firebaseUser.delete();
      }

      persist(null);
      setPendingGoogle(null);
      return { ok: true };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: string }).code)
          : "";
      if (code === "auth/requires-recent-login") {
        return {
          ok: false,
          error: "For security, please confirm your sign-in again before deleting your account.",
          needsReauth: true,
          authMethod: getAccountAuthMethod() ?? "password",
        };
      }
      console.error(error);
      return {
        ok: false,
        error: firestoreErrorMessage(error, "Could not delete your account. Try again or submit a request."),
      };
    }
  }, [user, persist, clearLocalAccountTraces, getAccountAuthMethod, setPendingGoogle]);

  const reauthenticateForDeletion = useCallback(
    async (input?: { password?: string }) => {
      const auth = getFirebaseAuth();
      const firebaseUser = auth?.currentUser;
      if (!firebaseUser) {
        return { ok: false as const, error: "You must be signed in to continue." };
      }

      const method = getAccountAuthMethod();
      try {
        if (method === "google") {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(firebaseUser, provider);
          return { ok: true as const };
        }
        if (method === "facebook") {
          const provider = new FacebookAuthProvider();
          await reauthenticateWithPopup(firebaseUser, provider);
          return { ok: true as const };
        }
        if (method === "password") {
          const password = input?.password?.trim() ?? "";
          if (!password) return { ok: false as const, error: "Enter your password to continue." };
          const email = firebaseUser.email;
          if (!email) return { ok: false as const, error: "No email on this account." };
          const credential = EmailAuthProvider.credential(email, password);
          await reauthenticateWithCredential(firebaseUser, credential);
          return { ok: true as const };
        }
        return {
          ok: false as const,
          error:
            "Please sign out, sign back in with your phone number, then try deleting again — or submit a deletion request below.",
        };
      } catch (error) {
        const code =
          error && typeof error === "object" && "code" in error
            ? String((error as { code: string }).code)
            : "";
        if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
          return { ok: false as const, error: "That password is incorrect." };
        }
        if (code === "auth/popup-closed-by-user") {
          return { ok: false as const, error: "Sign-in was cancelled." };
        }
        console.error(error);
        return { ok: false as const, error: "Could not confirm your identity. Try again." };
      }
    },
    [getAccountAuthMethod],
  );

  const submitDeletionRequest = useCallback(
    async (note?: string) => {
      if (!user) return { ok: false as const, error: "You must be signed in." };
      try {
        if (!isFirebaseConfigured()) {
          return {
            ok: false as const,
            error: "Deletion requests need Firebase. Email info@bharwanaestate.com instead.",
          };
        }
        await createDeletionRequest({
          uid: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          note,
        });
        return { ok: true as const };
      } catch (error) {
        console.error(error);
        return {
          ok: false as const,
          error: firestoreErrorMessage(error, "Could not submit deletion request."),
        };
      }
    },
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isReady,
      pendingGoogleSignup,
      login,
      loginWithGoogle,
      loginWithFacebook,
      consumeGoogleReturn,
      cancelPendingOAuthSignup,
      sendPhoneOtp,
      verifyPhoneOtp,
      sendChangePhoneOtp,
      confirmChangePhone,
      completeGoogleSignup,
      adoptSession,
      register,
      loginAs,
      loginAsRole,
      logout,
      deleteAccount,
      reauthenticateForDeletion,
      submitDeletionRequest,
      getAccountAuthMethod,
      hasPasswordProvider,
      linkEmailPassword,
    }),
    [
      user,
      isReady,
      pendingGoogleSignup,
      login,
      loginWithGoogle,
      loginWithFacebook,
      consumeGoogleReturn,
      cancelPendingOAuthSignup,
      sendPhoneOtp,
      verifyPhoneOtp,
      sendChangePhoneOtp,
      confirmChangePhone,
      completeGoogleSignup,
      adoptSession,
      register,
      loginAs,
      loginAsRole,
      logout,
      deleteAccount,
      reauthenticateForDeletion,
      submitDeletionRequest,
      getAccountAuthMethod,
      hasPasswordProvider,
      linkEmailPassword,
    ],
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
