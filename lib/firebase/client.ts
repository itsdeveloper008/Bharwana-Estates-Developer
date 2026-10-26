import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * Opt-in local Firebase Emulator Suite (FORGE-001).
 * Set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=1 in .env.local — never on Vercel production.
 */
const USE_FIREBASE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "1";
const EMULATOR_HOST = (
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "127.0.0.1"
).trim();

/** Vercel env vars were saved with a literal "\\n" suffix - strip that and whitespace. */
function sanitizeFirebaseEnv(value: string | undefined): string {
  return (value ?? "").trim().replace(/\\n$/g, "").replace(/\n$/g, "").trim();
}

const projectId = sanitizeFirebaseEnv(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const configuredAuthDomain = sanitizeFirebaseEnv(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
const projectAuthDomain = projectId ? `${projectId}.firebaseapp.com` : "";
/**
 * Always use `{projectId}.firebaseapp.com` as authDomain.
 * Custom apex (bharwanaestates.com) as authDomain breaks Auth iframe / createAuthUri
 * with auth/invalid-continue-uri when Hosting ownership doesn't match the API key project.
 * Custom domain is still fine as the app origin + Authorized domains + /__/auth rewrite.
 */
const authDomain =
  projectAuthDomain ||
  (configuredAuthDomain.endsWith(".firebaseapp.com") ? configuredAuthDomain : "");

const firebaseConfig = {
  apiKey: sanitizeFirebaseEnv(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain,
  projectId,
  storageBucket: sanitizeFirebaseEnv(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: sanitizeFirebaseEnv(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: sanitizeFirebaseEnv(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

/** Safe continue URI for Identity Toolkit createAuthUri (same Hosting project as the API key). */
export function getFirebaseAuthContinueUri(): string {
  const domain = firebaseConfig.authDomain || projectAuthDomain;
  return domain ? `https://${domain}` : "https://bharwana-estate-developer.firebaseapp.com";
}

export function getFirebaseWebApiKey(): string {
  return firebaseConfig.apiKey;
}

export function getFirebaseProjectId(): string {
  return firebaseConfig.projectId;
}

export const FIREBASE_NOT_CONFIGURED_MESSAGE =
  "Firebase is not configured on this deploy. Add the NEXT_PUBLIC_FIREBASE_* environment variables on the host and redeploy.";

const FIREBASE_ENV_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export function getMissingFirebaseEnvVars(): string[] {
  const env: Record<(typeof FIREBASE_ENV_KEYS)[number], string | undefined> = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  return FIREBASE_ENV_KEYS.filter((key) => {
    if (key === "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") {
      return !sanitizeFirebaseEnv(env[key]) && !sanitizeFirebaseEnv(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    }
    return !sanitizeFirebaseEnv(env[key]);
  });
}

export function logFirebaseConfigDiagnostics(context?: string) {
  if (typeof window === "undefined" || isFirebaseConfigured()) return;
  const missing = getMissingFirebaseEnvVars();
  const prefix = context ? `[Bharwana Firebase · ${context}]` : "[Bharwana Firebase]";
  console.warn(
    `${prefix} Not configured on this deploy.`,
    missing.length > 0 ? `Missing or empty: ${missing.join(", ")}` : "Required values are empty or invalid.",
  );
}

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.storageBucket,
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;
let firestoreEmulatorConnected = false;
let storageEmulatorConnected = false;
let authEmulatorConnected = false;

export function usingFirebaseEmulators(): boolean {
  return USE_FIREBASE_EMULATORS;
}

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  try {
    if (!app) {
      app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
      if (USE_FIREBASE_EMULATORS && typeof window !== "undefined") {
        console.info(
          `[Bharwana Firebase] Emulators enabled → ${EMULATOR_HOST} (auth:9099 firestore:8080 storage:9199)`,
        );
      }
    }
    return app;
  } catch (error) {
    console.error("Firebase app init failed", error);
    return null;
  }
}

export function getDb() {
  if (!isFirebaseConfigured()) return null;
  try {
    if (!db) {
      const firebaseApp = getFirebaseApp();
      if (!firebaseApp) return null;
      db = getFirestore(firebaseApp);
      if (USE_FIREBASE_EMULATORS && !firestoreEmulatorConnected) {
        connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
        firestoreEmulatorConnected = true;
      }
    }
    return db;
  } catch (error) {
    console.error("Firestore init failed", error);
    return null;
  }
}

export function getFirebaseStorage() {
  if (!isFirebaseConfigured()) return null;
  try {
    if (!storage) {
      const firebaseApp = getFirebaseApp();
      if (!firebaseApp) return null;
      storage = getStorage(firebaseApp);
      if (USE_FIREBASE_EMULATORS && !storageEmulatorConnected) {
        connectStorageEmulator(storage, EMULATOR_HOST, 9199);
        storageEmulatorConnected = true;
      }
    }
    return storage;
  } catch (error) {
    console.error("Firebase Storage init failed", error);
    return null;
  }
}

export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) return null;
  try {
    if (!auth) {
      const firebaseApp = getFirebaseApp();
      if (!firebaseApp) return null;
      try {
        auth = initializeAuth(firebaseApp, {
          persistence: [indexedDBLocalPersistence, browserLocalPersistence],
          popupRedirectResolver: browserPopupRedirectResolver,
        });
      } catch {
        auth = getAuth(firebaseApp);
      }
      if (USE_FIREBASE_EMULATORS && !authEmulatorConnected) {
        connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, {
          disableWarnings: true,
        });
        authEmulatorConnected = true;
      }
    }
    return auth;
  } catch (error) {
    console.error("Firebase Auth init failed", error);
    return null;
  }
}
