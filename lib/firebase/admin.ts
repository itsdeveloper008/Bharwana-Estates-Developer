import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Normalize the PEM private key from Vercel / .env.
 * Handles: wrapping quotes, literal `\n` / `\r\n`, and real multiline pastes.
 */
export function readPrivateKey(): string {
  let raw = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? "";
  raw = raw.trim();

  // dotenv / some paste flows keep surrounding quotes as part of the value
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  // Convert escaped newlines (possibly double-escaped from copy/paste)
  for (let i = 0; i < 3 && (raw.includes("\\n") || raw.includes("\\r")); i += 1) {
    raw = raw.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  }

  return raw.replace(/\r\n/g, "\n").trim();
}

function adminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() &&
      readPrivateKey(),
  );
}

/** Server-only: presence / shape checks — never log the key material itself. */
function logAdminCredentialPresence(phase: string) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ?? "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() ?? "";
  const privateKey = readPrivateKey();
  console.info(`[firebase-admin] ${phase}`, {
    projectIdPresent: Boolean(projectId),
    projectIdLength: projectId.length,
    clientEmailPresent: Boolean(clientEmail),
    clientEmailLooksValid: clientEmail.includes("@") && clientEmail.includes("."),
    privateKeyPresent: Boolean(privateKey),
    privateKeyLength: privateKey.length,
    privateKeyHasBegin: privateKey.includes("BEGIN PRIVATE KEY") || privateKey.includes("BEGIN RSA PRIVATE KEY"),
    privateKeyHasEnd: privateKey.includes("END PRIVATE KEY") || privateKey.includes("END RSA PRIVATE KEY"),
    privateKeyNewlineCount: (privateKey.match(/\n/g) ?? []).length,
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

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID!.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!.trim();
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
