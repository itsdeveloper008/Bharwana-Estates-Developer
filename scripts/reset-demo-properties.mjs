/**
 * One-off: keep only the two demo listings in Firestore (p-01, p-02).
 * Run: node scripts/reset-demo-properties.mjs
 */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";

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

const keepIds = new Set(["p-01", "p-02"]);

const demoProperties = [
  {
    id: "p-01",
    title: "Citrus Court Villa, DHA Phase 5",
    description:
      "A composed family villa set on a quiet DHA Phase 5 boulevard. Limestone floors, a double-height sitting hall, and a walled garden with citrus trees.",
    listingType: "DIRECT_OWNER",
    status: "PUBLISHED",
    price: 185000000,
    areaSqft: 4500,
    bedrooms: 5,
    bathrooms: 6,
    address: "Street 12, DHA Phase 5",
    city: "Lahore",
    latitude: 31.4692,
    longitude: 74.4118,
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80",
    ],
    ownerUserId: "u-owner-1",
    purpose: "SALE",
    category: "HOME",
    subtype: "HOUSE",
    createdAt: "2026-03-12T09:00:00.000Z",
  },
  {
    id: "p-02",
    title: "The Maple Residences, Gulberg III",
    description:
      "A Bharwana-verified boutique residence in Gulberg III. Four bedrooms with dressing rooms and a roof terrace looking toward MM Alam.",
    listingType: "BUSINESS",
    status: "PUBLISHED",
    price: 128000000,
    areaSqft: 3200,
    bedrooms: 4,
    bathrooms: 4,
    address: "Block C, Gulberg III",
    city: "Lahore",
    latitude: 31.5108,
    longitude: 74.3452,
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1600&q=80",
    ],
    developerId: "d-bharwana",
    purpose: "SALE",
    category: "HOME",
    subtype: "HOUSE",
    createdAt: "2026-04-02T11:20:00.000Z",
  },
];

const snap = await getDocs(collection(db, "properties"));
let deleted = 0;
for (const item of snap.docs) {
  if (!keepIds.has(item.id)) {
    await deleteDoc(doc(db, "properties", item.id));
    deleted += 1;
  }
}

for (const property of demoProperties) {
  await setDoc(doc(db, "properties", property.id), property, { merge: true });
}

console.log(`Firestore catalog reset: deleted ${deleted} extra listings, kept p-01 & p-02.`);
process.exit(0);
