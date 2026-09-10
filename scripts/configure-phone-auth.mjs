/**
 * Enable Firebase Phone Auth for Bharwana Estates (PK region + QA test numbers).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CRITICAL — TWO DIFFERENT LOGINS
 * ─────────────────────────────────────────────────────────────────────────────
 * This script uses the Firebase CLI's locally cached login on THIS machine
 * (~/.config/configstore/firebase-tools.json). It does NOT use:
 *   - the Google account open in a browser Firebase Console tab
 *   - NEXT_PUBLIC_FIREBASE_* keys in .env.local
 *
 * Switching the account in the Console does nothing until you re-login CLI.
 *
 * Check active CLI account:
 *   firebase login:list
 *
 * Switch CLI account (interactive browser popup — cannot be automated):
 *   firebase logout
 *   firebase login
 *   firebase projects:list   # confirm you see bharwana-estate-developer
 *
 * Run with hard account guard (recommended):
 *   EXPECTED_FIREBASE_EMAIL=admin@onixs.ai npm run phone-auth:configure
 *
 * Manual fallback if the script cannot run:
 *   Console → Authentication → Settings → SMS region policy → allow PK
 *   https://console.firebase.google.com/project/bharwana-estate-developer/authentication/settings
 *
 * Prerequisites:
 *   1. Blaze billing enabled on the Firebase project (manual).
 *   2. CLI logged in as Owner/Editor of bharwana-estate-developer.
 *   3. Optional CI token: export FIREBASE_TOKEN=$(firebase login:ci)
 *
 * Usage:
 *   npm run phone-auth:configure
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "bharwana-estate-developer";
const EXPECTED_EMAIL = (process.env.EXPECTED_FIREBASE_EMAIL ?? "").trim().toLowerCase();
const SETTINGS_URL = `https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings`;
const ALLOWED_REGIONS = ["PK"];

const TEST_NUMBERS = {
  "+923001234567": "123456",
  "+923001713811": "123456",
};

const CONFIG_URL = `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/config`;

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function loginHelp() {
  return [
    "This script uses the Firebase CLI login on this machine, NOT your browser",
    "Console session. Run:",
    "    firebase logout",
    "    firebase login",
    "Then log in as the correct account and re-run this script.",
    "",
    "Check who is logged in:  firebase login:list",
    "Manual SMS region fallback:",
    `  ${SETTINGS_URL}`,
  ].join("\n");
}

function emailFromFirebaseLoginList() {
  try {
    const out = execSync("firebase login:list", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
    });
    // Typical lines: "Logged in as admin@onixs.ai" or list with ★
    const starred = out.match(/[★*]\s*([^\s]+@[^\s]+)/);
    if (starred?.[1]) return starred[1].trim();
    const loggedIn = out.match(/Logged in as\s+([^\s]+@[^\s]+)/i);
    if (loggedIn?.[1]) return loggedIn[1].trim();
    const anyEmail = out.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return anyEmail?.[1]?.trim() ?? null;
  } catch {
    return null;
  }
}

function resolveAuth() {
  if (process.env.FIREBASE_TOKEN) {
    return {
      token: process.env.FIREBASE_TOKEN,
      email: "(FIREBASE_TOKEN env — email unknown; set EXPECTED_FIREBASE_EMAIL to guard)",
      source: "FIREBASE_TOKEN",
    };
  }

  const configPath = join(homedir(), ".config/configstore/firebase-tools.json");
  let email = null;
  let access = null;

  if (existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, "utf8"));
      access = cfg.tokens?.access_token ?? null;
      email = cfg.user?.email ?? null;
    } catch {
      // ignore parse errors
    }
  }

  const listEmail = emailFromFirebaseLoginList();
  if (listEmail) email = listEmail;

  if (!access) return null;
  return {
    token: access,
    email: email ?? "(unknown)",
    source: configPath,
  };
}

function loadApiKey() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      if (line.startsWith("NEXT_PUBLIC_FIREBASE_API_KEY=")) {
        return line.slice("NEXT_PUBLIC_FIREBASE_API_KEY=".length).trim();
      }
    }
  } catch {
    // ignore
  }
  return process.env.FIREBASE_API_KEY;
}

function networkMessage(err) {
  const cause = err && typeof err === "object" && "cause" in err ? err.cause : err;
  if (cause && typeof cause === "object" && "message" in cause) return String(cause.message);
  return String(err);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, label, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        console.warn(
          `⚠️  Network error on ${label} (attempt ${attempt}/${attempts}): ${networkMessage(err)} — retrying…`,
        );
        await sleep(1200 * attempt);
      }
    }
  }
  throw lastError;
}

async function api(path, options = {}) {
  const res = await fetchWithRetry(
    `${CONFIG_URL}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    },
    `Identity Toolkit ${options.method ?? "GET"} ${path || "/"}`,
  );
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

function permissionFail(status, body) {
  const detail = JSON.stringify(body);
  if (status === 401 || status === 403) {
    fail(
      [
        `Permission denied for project ${PROJECT_ID} (HTTP ${status}).`,
        `Currently logged in as: ${auth.email}`,
        "",
        "This usually means either:",
        "  • Wrong Firebase CLI account (not the project Owner), or",
        "  • Right account but insufficient role (needs Owner or Editor).",
        "",
        `API detail: ${detail}`,
        "",
        loginHelp(),
      ].join("\n"),
    );
  }
  fail(`Unexpected Identity Toolkit response (HTTP ${status}): ${detail}`);
}

async function checkBilling() {
  try {
    const res = await fetchWithRetry(
      `https://cloudbilling.googleapis.com/v1/projects/${PROJECT_ID}/billingInfo`,
      { headers: { Authorization: `Bearer ${TOKEN}` } },
      "Cloud Billing GetProjectBillingInfo",
    );
    const body = await res.json();
    if (res.status !== 200) {
      console.warn(
        "⚠️  Could not verify billing via API (non-fatal):",
        JSON.stringify(body),
        "\n   SMS region policy may still need manual verification in Console:",
        SETTINGS_URL,
      );
      return null;
    }
    return Boolean(body.billingAccountName);
  } catch (err) {
    console.warn(
      "⚠️  Network error, billing check skipped — SMS region policy may still need manual verification in Console:",
      SETTINGS_URL,
      "\n  ",
      networkMessage(err),
    );
    return null;
  }
}

async function probePhone() {
  const apiKey = loadApiKey();
  if (!apiKey) return { skipped: true };
  try {
    const res = await fetchWithRetry(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "+923001234567",
          recaptchaToken: "configure-script-probe",
        }),
      },
      "sendVerificationCode probe",
    );
    return { status: res.status, body: await res.json() };
  } catch (err) {
    return { skipped: true, error: networkMessage(err) };
  }
}

// ─── 1) Hard account guard (before any project mutations) ───────────────────

const auth = resolveAuth();
const TOKEN = auth?.token ?? null;

if (!TOKEN || !auth) {
  fail(`No Firebase CLI access token found.\n\n${loginHelp()}`);
}

console.log(`CLI account: ${auth.email}`);
console.log(`Token source: ${auth.source}`);
console.log(`Target project: ${PROJECT_ID}`);

if (EXPECTED_EMAIL) {
  if (auth.source === "FIREBASE_TOKEN") {
    console.warn(
      "⚠️  EXPECTED_FIREBASE_EMAIL is set but auth is FIREBASE_TOKEN (email unknown) — cannot verify match. Proceeding.",
    );
  } else if (auth.email.toLowerCase() !== EXPECTED_EMAIL) {
    fail(
      [
        "Wrong Firebase account.",
        `Expected: ${EXPECTED_EMAIL}`,
        `Currently logged in as: ${auth.email}`,
        "",
        loginHelp(),
      ].join("\n"),
    );
  } else {
    console.log(`✅ Account matches EXPECTED_FIREBASE_EMAIL (${EXPECTED_EMAIL})`);
  }
} else {
  console.warn(
    [
      "",
      `⚠️  No EXPECTED_FIREBASE_EMAIL set. Currently running as: ${auth.email}`,
      `If this is not the Owner of ${PROJECT_ID}, stop and switch accounts.`,
      "Recommended:",
      `  EXPECTED_FIREBASE_EMAIL=admin@onixs.ai npm run phone-auth:configure`,
      "",
    ].join("\n"),
  );
}

// ─── Billing (network-resilient; non-fatal on transport errors) ─────────────

const billingLinked = await checkBilling();
if (billingLinked === false) {
  fail(
    `Firebase billing is not enabled on ${PROJECT_ID}.\n` +
      `Upgrade manually:\n` +
      `  https://console.firebase.google.com/project/${PROJECT_ID}/usage/details\n` +
      "Attach a billing account (Blaze plan), then re-run this script.",
  );
}
if (billingLinked === true) {
  console.log("Billing: Blaze account linked.");
}

// ─── 2) Lightweight permission check before mutating SMS policy ─────────────

console.log("Permission check: reading Identity Platform config…");
let current;
try {
  current = await api("");
} catch (err) {
  fail(
    `Network error reading project config — cannot continue.\n` +
      `${networkMessage(err)}\n\n` +
      `Manual fallback: ${SETTINGS_URL}`,
  );
}

if (current.status === 401 || current.status === 403) {
  permissionFail(current.status, current.body);
}
if (current.status !== 200 && current.status !== 404) {
  permissionFail(current.status, current.body);
}
console.log("✅ Permission check passed (can read Auth config).");

if (current.status === 404) {
  console.log("Config not found — initializing Identity Platform auth…");
  try {
    const init = await fetchWithRetry(
      `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/identityPlatform:initializeAuth`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          "X-Goog-User-Project": PROJECT_ID,
        },
        body: "{}",
      },
      "initializeAuth",
    );
    const initBody = await init.json();
    if (!init.ok) {
      fail(`initializeAuth failed: ${JSON.stringify(initBody)}`);
    }
    console.log("Identity Platform initialized.");
  } catch (err) {
    fail(`initializeAuth network error: ${networkMessage(err)}`);
  }
}

// ─── Apply phone + SMS region policy ────────────────────────────────────────

const patchBody = {
  signIn: {
    phoneNumber: {
      enabled: true,
      testPhoneNumbers: TEST_NUMBERS,
    },
  },
  smsRegionConfig: {
    allowlistOnly: {
      allowedRegions: ALLOWED_REGIONS,
    },
  },
};

console.log("Enabling Phone provider, PK SMS region, and test numbers…");
let updated;
try {
  updated = await api(
    "?updateMask=signIn.phoneNumber.enabled,signIn.phoneNumber.testPhoneNumbers,smsRegionConfig",
    { method: "PATCH", body: JSON.stringify(patchBody) },
  );
} catch (err) {
  fail(
    `Network error updating Auth config: ${networkMessage(err)}\n` +
      `Manual fallback: ${SETTINGS_URL}`,
  );
}

if (updated.status === 401 || updated.status === 403) {
  permissionFail(updated.status, updated.body);
}
if (updated.status !== 200) {
  fail(`updateConfig failed (${updated.status}): ${JSON.stringify(updated.body)}`);
}

const phone = updated.body?.signIn?.phoneNumber;
const sms = updated.body?.smsRegionConfig;
const regions =
  sms?.allowlistOnly?.allowedRegions ??
  sms?.allowlistOnly?.allowed_regions ??
  ALLOWED_REGIONS;

// ─── 4) Clear success output ────────────────────────────────────────────────

console.log("");
console.log(`✅ SMS region policy updated for ${PROJECT_ID}`);
console.log(`   Allowed regions: ${Array.isArray(regions) ? regions.join(", ") : JSON.stringify(regions)}`);
console.log(`   Phone enabled: ${phone?.enabled ?? "(unknown)"}`);
console.log(`   Test numbers: ${JSON.stringify(phone?.testPhoneNumbers ?? TEST_NUMBERS)}`);
console.log(`   Verify at: ${SETTINGS_URL}`);
console.log("");

console.log("Verifying with sendVerificationCode probe…");
const probe = await probePhone();
if (probe.skipped) {
  console.log(
    probe.error
      ? `Probe skipped (network): ${probe.error}`
      : "Probe skipped (no API key in .env.local).",
  );
} else {
  console.log("Probe HTTP", probe.status);
  const errMsg = probe.body?.error?.message ?? "";
  if (probe.status === 200 || !probe.body?.error) {
    console.log("Probe OK — phone send endpoint accepted the request.");
  } else if (errMsg.includes("region enabled")) {
    console.warn("Still blocked by SMS region policy. Check Console → Authentication → SMS regions.");
  } else if (errMsg.toLowerCase().includes("recaptcha")) {
    console.log("Probe reached phone auth (reCAPTCHA rejected probe token — expected in scripts).");
  } else {
    console.log(JSON.stringify(probe.body, null, 2));
  }
}

console.log("\nDone. Test in the app with +92 300 1234567 / OTP 123456.");
