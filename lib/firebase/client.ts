import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * On live, authDomain must match the page origin and /__/auth must be proxied
 * (see next.config.mjs). Cross-origin *.firebaseapp.com handlers break Google
 * sign-in in Chrome ("missing initial state").
 */
function resolveAuthDomain() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const configured = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "").trim();
  const fallback = configured || (projectId ? `${projectId}.firebaseapp.com` : "");

  if (typeof window === "undefined") return fallback;

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    // Local: use project auth domain (rewrites still proxy /__/auth in next dev).
    return fallback.includes("firebaseapp.com")
      ? fallback
      : projectId
        ? `${projectId}.firebaseapp.com`
        : fallback;
  }

  return host;
}

function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: resolveAuthDomain(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured() {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey && config.authDomain && config.projectId && config.appId && config.storageBucket,
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

export function getFirebaseApp() {
  if (!isFirebaseConfigured()) return null;
  try {
    if (!app) {
      app = getApps().length ? getApps()[0]! : initializeApp(getFirebaseConfig());
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
        // App already initialized auth in this runtime
        auth = getAuth(firebaseApp);
      }
    }
    return auth;
  } catch (error) {
    console.error("Firebase Auth init failed", error);
    return null;
  }
}
