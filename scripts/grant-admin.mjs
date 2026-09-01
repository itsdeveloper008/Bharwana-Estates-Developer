/**
 * Grant Admin access for a Firebase Auth user.
 *
 * Admin sign-in checks (in order):
 *   1. Firestore users/{uid}.role === "ADMIN"
 *   2. Firestore admins/{uid} document exists
 *
 * Creating a user in Firebase Authentication alone does NOT grant admin access.
 *
 * Usage:
 *   node scripts/grant-admin.mjs --uid <firebase-auth-uid> --email info@bharwanaestates.com --name "Bharwana Admin"
 *   node scripts/grant-admin.mjs --email info@bharwanaestates.com --password <temp-password> --name "Bharwana Admin"
 *
 * Copy the UID from Firebase Console → Authentication → Users.
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = readArg("--email")?.trim().toLowerCase();
const password = readArg("--password");
const uidArg = readArg("--uid")?.trim();
const fullName = readArg("--name")?.trim() || "Bharwana Admin";

if (!email) {
  console.error("Missing --email. Example: node scripts/grant-admin.mjs --email info@bharwanaestates.com --uid <uid>");
  process.exit(1);
}

const env = loadEnv();
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

let uid = uidArg;

if (!uid) {
  if (!password) {
    console.error(
      "Provide --uid from Firebase Console → Authentication → Users, or pass --password to resolve UID via sign-in.",
    );
    process.exit(1);
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  uid = credential.user.uid;
  console.log(`Resolved UID via sign-in: ${uid}`);
}

const usersRef = doc(db, "users", uid);
const existing = await getDoc(usersRef);

await setDoc(
  usersRef,
  {
    fullName,
    email,
    phone: existing.exists() ? (existing.data().phone ?? "") : "",
    role: "ADMIN",
    savedPropertyIds: existing.exists() ? (existing.data().savedPropertyIds ?? []) : [],
    updatedAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
  },
  { merge: true },
);

await setDoc(
  doc(db, "admins", uid),
  {
    email,
    fullName,
    role: "ADMIN",
    updatedAt: serverTimestamp(),
  },
  { merge: true },
);

console.log(`Admin access granted for ${email}`);
console.log(`  users/${uid}  → role: ADMIN`);
console.log(`  admins/${uid} → document created/updated`);
console.log("Sign out of /admin if already open, then sign in again.");

process.exit(0);
