"use client";

/**
 * Firebase-free auth context + hook.
 * Navbar / cards import from here so the homepage critical path never loads firebase/auth.
 * The real provider lives in mock-auth.tsx and mounts after idle via ProvidersFull.
 */
import { createContext, useContext } from "react";
import type { User, UserRole } from "@/lib/types";

export type GoogleSignupDraft = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
};

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

/** Opaque Firebase types — keep this module free of firebase/* runtime imports. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecaptchaVerifierLike = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConfirmationResultLike = any;

export interface MockAuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isReady: boolean;
  pendingGoogleSignup: GoogleSignupDraft | null;
  login: (email: string, password: string) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
  loginWithGoogle: () => Promise<GoogleLoginResult>;
  loginWithFacebook: () => Promise<GoogleLoginResult>;
  consumeGoogleReturn: () => boolean;
  cancelPendingOAuthSignup: () => Promise<void>;
  sendPhoneOtp: (
    phone: string,
    verifier: RecaptchaVerifierLike,
  ) => Promise<
    | { ok: true; confirmation: ConfirmationResultLike }
    | { ok: false; error: string; code?: string }
  >;
  verifyPhoneOtp: (
    confirmation: ConfirmationResultLike,
    code: string,
  ) => Promise<PhoneLoginResult>;
  sendPhoneResetOtp: (
    phone: string,
    recaptchaToken: string,
  ) => Promise<
    | { ok: true; sessionInfo: string }
    | { ok: false; error: string; code?: string }
  >;
  verifyPhoneResetOtp: (
    sessionInfo: string,
    code: string,
  ) => Promise<{ ok: true; idToken: string } | { ok: false; error: string }>;
  sendChangePhoneOtp: (
    phone: string,
    verifier: RecaptchaVerifierLike,
  ) => Promise<{ ok: true; verificationId: string; phone: string } | { ok: false; error: string }>;
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
    skipCommit?: boolean;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
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
  hasPasswordProvider: () => boolean;
  linkEmailPassword: (input: {
    email?: string;
    password: string;
    profile?: User;
  }) => Promise<{ ok: true; user: User } | { ok: false; error: string }>;
}

export const MockAuthContext = createContext<MockAuthContextValue | undefined>(undefined);

/**
 * Safe before deferred ProvidersFull mounts (homepage first paint).
 * isReady must stay false so OwnerGate/DealerGate wait — true caused early
 * “no user” redirects and a white/empty flash on reload.
 */
export const BOOTSTRAP_AUTH: MockAuthContextValue = {
  user: null,
  isAuthenticated: false,
  isReady: false,
  pendingGoogleSignup: null,
  login: async () => ({ ok: false, error: "App is still loading." }),
  loginWithGoogle: async () => ({ ok: false, error: "App is still loading." }),
  loginWithFacebook: async () => ({ ok: false, error: "App is still loading." }),
  consumeGoogleReturn: () => false,
  cancelPendingOAuthSignup: async () => undefined,
  sendPhoneOtp: async () => ({ ok: false, error: "App is still loading." }),
  verifyPhoneOtp: async () => ({ ok: false, error: "App is still loading." }),
  sendPhoneResetOtp: async () => ({ ok: false, error: "App is still loading." }),
  verifyPhoneResetOtp: async () => ({ ok: false, error: "App is still loading." }),
  sendChangePhoneOtp: async () => ({ ok: false, error: "App is still loading." }),
  confirmChangePhone: async () => ({ ok: false, error: "App is still loading." }),
  completeGoogleSignup: async () => ({ ok: false, error: "App is still loading." }),
  adoptSession: () => undefined,
  register: async () => ({ ok: false, error: "App is still loading." }),
  loginAs: () => undefined,
  loginAsRole: () => undefined,
  logout: () => undefined,
  deleteAccount: async () => ({ ok: false, error: "App is still loading." }),
  reauthenticateForDeletion: async () => ({ ok: false, error: "App is still loading." }),
  submitDeletionRequest: async () => ({ ok: false, error: "App is still loading." }),
  getAccountAuthMethod: () => null,
  hasPasswordProvider: () => false,
  linkEmailPassword: async () => ({ ok: false, error: "App is still loading." }),
};

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  return context ?? BOOTSTRAP_AUTH;
}
