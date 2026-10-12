#!/usr/bin/env node
/**
 * Reads .env.local and uploads each required key to Firebase App Hosting secrets.
 * Does not print secret values.
 *
 * Usage: node scripts/set-apphosting-secrets.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const PROJECT = "bharwana-estate-developer";
const ENV_PATH = resolve(process.cwd(), ".env.local");

const KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "RESEND_REJECTION_BCC",
];

function parseEnv(raw) {
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

if (!existsSync(ENV_PATH)) {
  console.error("Missing .env.local — copy values from Vercel / your local env first.");
  process.exit(1);
}

const env = parseEnv(readFileSync(ENV_PATH, "utf8"));
let ok = 0;
let skipped = 0;

for (const key of KEYS) {
  const value = env[key];
  if (!value) {
    console.warn(`SKIP ${key} (empty in .env.local)`);
    skipped += 1;
    continue;
  }
  const result = spawnSync(
    "firebase",
    ["apphosting:secrets:set", key, "--project", PROJECT, "--data-file", "-"],
    {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "inherit", "inherit"],
      env: { ...process.env, FIREBASE_CLI_LOG: "/tmp/firebase-apphosting.log" },
    },
  );
  if (result.status !== 0) {
    console.error(`FAIL ${key}`);
    process.exit(result.status ?? 1);
  }
  console.log(`SET  ${key} (length=${value.length})`);
  ok += 1;
}

console.log(`Done. set=${ok} skipped=${skipped}`);
console.log("Next: grant secret access to the App Hosting backend if prompted, then create a rollout.");
