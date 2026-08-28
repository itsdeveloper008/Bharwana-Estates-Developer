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

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const configuredAuthDomain = (process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "").trim();
const projectAuthDomain = projectId ? `${projectId}.firebaseapp.com` : "";

/** Same-origin authDomain on live + /__/auth proxy (next.config) avoids missing-initial-state. */
function resolveAuthDomain() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return configuredAuthDomain || projectAuthDomain;
    }
    return host;
  }
  return configuredAuthDomain || projectAuthDomain;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  get authDomain() {
    return resolveAuthDomain();
  },
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      (configuredAuthDomain || projectAuthDomain) &&
      firebaseConfig.projectId &&
      firebaseConfig.appId &&
      firebaseConfig.storageBucket,
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
      app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
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
        auth = getAuth(firebaseApp);
      }
    }
    return auth;
  } catch (error) {
    console.error("Firebase Auth init failed", error);
    return null;
  }
}
