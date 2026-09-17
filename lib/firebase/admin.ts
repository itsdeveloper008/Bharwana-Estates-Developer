import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Prefer REST over gRPC for Firestore on Vercel/serverless - avoids flaky gRPC auth. */
if (!process.env.FIRESTORE_PREFER_REST) {
  process.env.FIRESTORE_PREFER_REST = "true";
}

function readEnv(name: string): string {
  let raw = process.env[name] ?? "";
  raw = raw.trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  return raw;
}

/**
 * Normalize the PEM private key from Vercel / .env.
 * Handles: wrapping quotes, literal `\n` / `\r\n`, and real multiline pastes.
 */
export function readPrivateKey(): string {
  let raw = readEnv("FIREBASE_ADMIN_PRIVATE_KEY");

  // Convert escaped newlines (possibly double-escaped from copy/paste)
  for (let i = 0; i < 3 && (raw.includes("\\n") || raw.includes("\\r")); i += 1) {
    raw = raw.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }

  return raw.replace(/\r\n/g, "\n").trim();
}

export function readAdminProjectId(): string {
  return readEnv("FIREBASE_ADMIN_PROJECT_ID") || readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
}

export function readAdminClientEmail(): string {
  return readEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
}

function adminConfigured(): boolean {
  return Boolean(readAdminProjectId() && readAdminClientEmail() && readPrivateKey());
}

/**
 * Server-only: presence / PEM armor fingerprint - never logs key body bytes.
 */
function logAdminCredentialPresence(phase: string) {
  const projectId = readAdminProjectId();
  const clientEmail = readAdminClientEmail();
  const privateKey = readPrivateKey();
  const lines = privateKey.split("\n").filter(Boolean);
  const firstLine = lines[0] ?? "";
  const lastLine = lines[lines.length - 1] ?? "";
  const publicProjectId = readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  console.info(`[firebase-admin] ${phase}`, {
    projectId,
    projectIdLength: projectId.length,
    publicProjectId,
    projectIdsMatch: Boolean(projectId) && projectId === publicProjectId,
    clientEmail,
    clientEmailLength: clientEmail.length,
    clientEmailLooksValid: clientEmail.includes("@") && clientEmail.endsWith(".iam.gserviceaccount.com"),
    privateKeyPresent: Boolean(privateKey),
    privateKeyLength: privateKey.length,
    privateKeyNewlineCount: (privateKey.match(/\n/g) ?? []).length,
    privateKeyFirstLine: firstLine.slice(0, 40),
    privateKeyLastLine: lastLine.slice(-40),
    privateKeyStartsWithBegin:
      firstLine.startsWith("-----BEGIN PRIVATE KEY-----") ||
      firstLine.startsWith("-----BEGIN RSA PRIVATE KEY-----"),
    privateKeyEndsWithEnd:
      lastLine.startsWith("-----END PRIVATE KEY-----") ||
      lastLine.startsWith("-----END RSA PRIVATE KEY-----"),
  });
}

let app: App | null = null;
let loggedPresence = false;

export function getFirebaseAdminApp(): App {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0]!;
    return app;
  }
  if (!loggedPresence) {
    logAdminCredentialPresence("init");
    loggedPresence = true;
  }
  if (!adminConfigured()) {
    throw new Error(
      "Firebase Admin SDK is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY.",
    );
  }

  const projectId = readAdminProjectId();
  const clientEmail = readAdminClientEmail();
  const privateKey = readPrivateKey();

  if (
    !privateKey.includes("BEGIN") ||
    !privateKey.includes("END") ||
    (privateKey.match(/\n/g) ?? []).length < 2
  ) {
    throw new Error(
      "FIREBASE_ADMIN_PRIVATE_KEY looks malformed (missing PEM headers or newlines). Re-paste the key in Vercel with literal \\n escapes or as a multiline value.",
    );
  }

  try {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } catch (error) {
    console.error("[firebase-admin] initializeApp/cert failed", error);
    throw error;
  }
  return app;
}

export function getAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getFirebaseAdminApp());
}

export function isFirebaseAdminConfigured(): boolean {
  return adminConfigured();
}
