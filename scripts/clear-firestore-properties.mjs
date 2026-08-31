/**
 * One-off: remove all demo listings from Firestore for QA handoff.
 * Run: node scripts/clear-firestore-properties.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, deleteDoc, doc, getDocs } from "firebase/firestore";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const snap = await getDocs(collection(db, "properties"));
let deleted = 0;
for (const item of snap.docs) {
  await deleteDoc(doc(db, "properties", item.id));
  deleted += 1;
}

console.log(`Firestore properties cleared: deleted ${deleted} listing(s).`);
process.exit(0);
