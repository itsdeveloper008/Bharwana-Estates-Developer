/**
 * Migrate legacy BUYER / HOUSE_OWNER user docs → INDIVIDUAL.
 *
 * Usage (Admin account):
 *   node scripts/migrate-individual-role.mjs --email <admin@...> --password <password>
 *   node scripts/migrate-individual-role.mjs --email <admin@...> --password <password> --dry-run
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

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
const dryRun = process.argv.includes("--dry-run");

if (!email || !password) {
  console.error(
    "Usage: node scripts/migrate-individual-role.mjs --email <admin-email> --password <password> [--dry-run]",
  );
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

await signInWithEmailAndPassword(auth, email, password);
console.log(`Signed in as ${email}${dryRun ? " (dry-run)" : ""}`);

const legacyRoles = ["BUYER", "HOUSE_OWNER"];
/** @type {import('firebase/firestore').QueryDocumentSnapshot[]} */
const toMigrate = [];

for (const role of legacyRoles) {
  const snap = await getDocs(query(collection(db, "users"), where("role", "==", role)));
  for (const docSnap of snap.docs) toMigrate.push(docSnap);
}

console.log(`Found ${toMigrate.length} user(s) with BUYER or HOUSE_OWNER`);

if (toMigrate.length === 0) {
  console.log("Nothing to migrate.");
  process.exit(0);
}

if (dryRun) {
  for (const docSnap of toMigrate) {
    console.log(`  would update users/${docSnap.id}  ${docSnap.data().role} → INDIVIDUAL`);
  }
  process.exit(0);
}

const CHUNK = 400;
for (let i = 0; i < toMigrate.length; i += CHUNK) {
  const slice = toMigrate.slice(i, i + CHUNK);
  const batch = writeBatch(db);
  for (const docSnap of slice) {
    batch.update(docSnap.ref, { role: "INDIVIDUAL" });
    console.log(`  users/${docSnap.id}  ${docSnap.data().role} → INDIVIDUAL`);
  }
  await batch.commit();
}

console.log(`Done. Migrated ${toMigrate.length} user(s) to INDIVIDUAL.`);
process.exit(0);
