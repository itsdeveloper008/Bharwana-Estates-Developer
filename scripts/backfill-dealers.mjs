/**
 * Backfill Firestore `developers` docs for DEALER users missing a linked profile.
 *
 * Usage (sign in as Admin):
 *   node scripts/backfill-dealers.mjs --email <admin@...> --password <password>
 *   node scripts/backfill-dealers.mjs --email <admin@...> --password <password> --uid <dealerUid>
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
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
const onlyUid = readArg("--uid")?.trim();

if (!email || !password) {
  console.error(
    "Usage: node scripts/backfill-dealers.mjs --email <admin-email> --password <password> [--uid <dealerUid>]",
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
console.log(`Signed in as ${email}`);

/** @type {import('firebase/firestore').QueryDocumentSnapshot[]} */
let dealerDocs = [];

if (onlyUid) {
  const snap = await getDoc(doc(db, "users", onlyUid));
  if (!snap.exists()) {
    console.error(`No users/${onlyUid} document`);
    process.exit(1);
  }
  if (snap.data().role !== "DEALER") {
    console.error(`users/${onlyUid} role is ${snap.data().role}, not DEALER`);
    process.exit(1);
  }
  dealerDocs = [snap];
} else {
  const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "DEALER")));
  dealerDocs = usersSnap.docs;
}

console.log(`Found ${dealerDocs.length} dealer user(s)`);

let created = 0;
let skipped = 0;

for (const userSnap of dealerDocs) {
  const uid = userSnap.id;
  const data = userSnap.data();
  const existing = await getDocs(
    query(collection(db, "developers"), where("dealerUserId", "==", uid)),
  );
  if (!existing.empty) {
    console.log(`skip ${uid} — already has developer ${existing.docs[0].id}`);
    skipped += 1;
    continue;
  }

  const id = `d-${uid}`;
  const payload = {
    companyName: String(data.agencyName || data.fullName || "Agency").trim(),
    contactPerson: String(data.fullName || "Dealer").trim(),
    commissionRate: 0.025,
    dealerUserId: uid,
    status: "PENDING_REVIEW",
    origin: "SELF_REGISTERED",
    createdAt: serverTimestamp(),
  };
  if (data.registrationNumber) {
    payload.registrationNumber = String(data.registrationNumber).trim();
  }

  await setDoc(doc(db, "developers", id), payload);
  console.log(`created ${id} ← ${payload.companyName} (${uid})`);
  created += 1;
}

console.log(`Done. created=${created} skipped=${skipped}`);
process.exit(0);
