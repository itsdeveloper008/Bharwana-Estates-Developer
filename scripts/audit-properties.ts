/**
 * Read-only audit of Firestore `properties` vs what the public site shows.
 *
 * Prefer Firebase Admin SDK when FIREBASE_ADMIN_* is set; otherwise uses the
 * client SDK (rules allow public read on properties).
 *
 * Run:
 *   node --experimental-strip-types scripts/audit-properties.ts
 *   # or: npm run audit:properties
 *
 * No writes.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC_STATUSES = new Set(["PUBLISHED", "RESERVED"]);
const PUBLIC_LIMIT = 250;

type Row = {
  id: string;
  status: string;
  purpose: string;
  category: string;
  listingType: string;
  title: string;
  city: string;
  price: number;
  latitude: number;
  longitude: number;
  images: unknown;
  createdAt: unknown;
  reasons: string[];
};

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function printGroup(title: string, map: Map<string, number>) {
  console.log(`\n## ${title}`);
  const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [key, count] of entries) {
    console.log(`  ${count.toString().padStart(4)}  ${key}`);
  }
}

function analyze(id: string, data: Record<string, unknown>): Row {
  const status = String(data.status ?? "(missing)");
  const purposeRaw = data.purpose;
  const purpose =
    purposeRaw === "RENT" || purposeRaw === "rent" || purposeRaw === "rental"
      ? "RENT"
      : purposeRaw === "SALE" || purposeRaw === "sale" || purposeRaw === "buy" || purposeRaw === undefined || purposeRaw === null || purposeRaw === ""
        ? purposeRaw === undefined || purposeRaw === null || purposeRaw === ""
          ? "(missing→treated as SALE on site)"
          : "SALE"
        : `OTHER:${String(purposeRaw)}`;
  const category = String(data.category ?? "(missing→HOME)");
  const listingType = String(data.listingType ?? "(missing)");
  const title = String(data.title ?? "");
  const city = String(data.city ?? "");
  const price = Number(data.price ?? NaN);
  const latitude = Number(data.latitude ?? NaN);
  const longitude = Number(data.longitude ?? NaN);
  const images = data.images;
  const createdAt = data.createdAt;

  const reasons: string[] = [];
  if (!PUBLIC_STATUSES.has(status)) {
    reasons.push(`status is "${status}" (public needs PUBLISHED or RESERVED)`);
  }
  if (!title.trim()) reasons.push("missing title");
  if (!city.trim()) reasons.push("missing city");
  if (!Number.isFinite(price) || price <= 0) reasons.push("missing/invalid price");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    reasons.push("missing/invalid coordinates (map pins / bounds filter)");
  }
  if (!Array.isArray(images) || images.length === 0) {
    reasons.push("missing images[] (cards show empty; still listed if status ok)");
  }
  if (createdAt == null) {
    reasons.push("missing createdAt (not used in public where/orderBy today)");
  }

  // Normalized purpose for public Buy default
  const purposeForPublic =
    purposeRaw === "RENT" || purposeRaw === "rent" || purposeRaw === "rental" ? "RENT" : "SALE";

  return {
    id,
    status,
    purpose: `${purpose} [public=${purposeForPublic}]`,
    category,
    listingType,
    title,
    city,
    price,
    latitude,
    longitude,
    images,
    createdAt,
    reasons,
  };
}

async function fetchWithAdmin(): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const { initializeApp, cert, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "";
  let privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").trim();
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey.includes("BEGIN")) {
    throw new Error("Admin SDK credentials incomplete");
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }
  const db = getFirestore();
  const snap = await db.collection("properties").get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
}

async function fetchWithClient(): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const { initializeApp, getApps } = await import("firebase/app");
  const { getFirestore, collection, getDocs } = await import("firebase/firestore");

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
  if (!config.projectId || !config.apiKey) {
    throw new Error("Missing NEXT_PUBLIC_FIREBASE_* in .env.local");
  }
  const app = getApps().length ? getApps()[0]! : initializeApp(config);
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, "properties"));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
}

async function main() {
  let rowsRaw: Array<{ id: string; data: Record<string, unknown> }>;
  let source = "firebase-admin";
  try {
    rowsRaw = await fetchWithAdmin();
  } catch (adminError) {
    console.warn(
      "[audit] Admin SDK unavailable (",
      adminError instanceof Error ? adminError.message : adminError,
      ") — falling back to client SDK (properties allow read: true).",
    );
    source = "firebase-client";
    rowsRaw = await fetchWithClient();
  }

  const rows = rowsRaw.map((r) => analyze(r.id, r.data));

  const byStatus = new Map<string, number>();
  const byPurpose = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byOrigin = new Map<string, number>();

  for (const row of rows) {
    bump(byStatus, row.status);
    bump(byPurpose, row.purpose);
    bump(byCategory, row.category);
    bump(byOrigin, row.listingType);
  }

  const publicEligible = rows.filter((r) => PUBLIC_STATUSES.has(r.status));
  const publicSale = publicEligible.filter((r) => !r.purpose.includes("[public=RENT]"));
  const publicRent = publicEligible.filter((r) => r.purpose.includes("[public=RENT]"));

  // Same query the client uses: status in PUBLISHED|RESERVED, limit 250 (no orderBy)
  const clientSnapshotCap = publicEligible.slice(0, PUBLIC_LIMIT);

  console.log("\n========== Bharwana properties audit (read-only) ==========");
  console.log(`Source: ${source}`);
  console.log(`Total documents in properties/: ${rows.length}`);
  printGroup("By status", byStatus);
  printGroup("By purpose (as stored / how site treats)", byPurpose);
  printGroup("By category", byCategory);
  printGroup("By origin (listingType)", byOrigin);

  console.log("\n## Public visibility (matches app filters)");
  console.log(`  Should be on marketplace (PUBLISHED|RESERVED): ${publicEligible.length}`);
  console.log(`  Of those, Buy/SALE (default /properties?intent=buy): ${publicSale.length}`);
  console.log(`  Of those, Rent (intent=rental): ${publicRent.length}`);
  console.log(`  Client subscribePublicProperties limit: ${PUBLIC_LIMIT}`);
  console.log(`  After limit cap: ${clientSnapshotCap.length}`);
  console.log(
    `  Admin "Published" badge counts status===PUBLISHED only (excludes RESERVED): ${
      rows.filter((r) => r.status === "PUBLISHED").length
    }`,
  );

  const hidden = rows.filter((r) => !PUBLIC_STATUSES.has(r.status));
  console.log(`\n## Not on public site (${hidden.length}) — by reason`);
  const reasonGroups = new Map<string, string[]>();
  for (const row of hidden) {
    const key = row.reasons[0] ?? "unknown";
    const list = reasonGroups.get(key) ?? [];
    list.push(row.id);
    reasonGroups.set(key, list);
  }
  for (const [reason, ids] of Array.from(reasonGroups.entries()).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${ids.length}× ${reason}`);
    console.log(`    ids: ${ids.join(", ")}`);
  }

  const publicMissingCoords = publicEligible.filter(
    (r) => !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude),
  );
  if (publicMissingCoords.length) {
    console.log(`\n## Public-status but bad coordinates (${publicMissingCoords.length})`);
    for (const r of publicMissingCoords) {
      console.log(`  ${r.id}  ${r.title.slice(0, 40)}`);
    }
  }

  const publicMissingImages = publicEligible.filter(
    (r) => !Array.isArray(r.images) || (r.images as unknown[]).length === 0,
  );
  if (publicMissingImages.length) {
    console.log(`\n## Public-status but no images (${publicMissingImages.length})`);
    for (const r of publicMissingImages) {
      console.log(`  ${r.id}  ${r.title.slice(0, 40)}`);
    }
  }

  console.log("\n## Why UI counts can disagree");
  console.log(
    "  - Admin Published count = status PUBLISHED (all purposes; ignores Buy/Rent tab).",
  );
  console.log(
    "  - /properties and /map default intent=buy → only SALE (+ missing purpose treated as SALE).",
  );
  console.log("  - Featured grid = first 6 PUBLISHED only (not RESERVED), after client filters.");
  console.log("  - Map 'Search this area' further filters by viewport bounds.");
  console.log("  - No separate submissions collection; pending live in properties with PENDING_APPROVAL.");
  console.log("\n========== end audit ==========\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
