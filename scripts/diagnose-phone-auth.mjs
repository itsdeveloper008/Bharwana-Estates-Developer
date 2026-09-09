/**
 * Diagnose Firebase Phone Authentication for Bharwana Estates.
 *
 * Usage:
 *   node scripts/diagnose-phone-auth.mjs
 *
 * Optional: FIREBASE_TOKEN from `firebase login:ci` to query admin config & billing.
 */
import { readFileSync } from "node:fs";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "bharwana-estate-developer";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      if (!line.trim() || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i === -1) continue;
      env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/\\n$/g, "").replace(/\n$/g, "");
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const apiKey = process.env.FIREBASE_API_KEY ?? env.NEXT_PUBLIC_FIREBASE_API_KEY;
const token = process.env.FIREBASE_TOKEN;

function section(title) {
  console.log(`\n=== ${title} ===`);
}

async function probeSendVerificationCode() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: "+923001234567",
        recaptchaToken: "diagnostic-probe-token",
      }),
    },
  );
  const body = await res.json();
  return { status: res.status, body };
}

async function getAdminConfig() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/config`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function getBillingStatus() {
  const res = await fetch(
    `https://cloudbilling.googleapis.com/v1/projects/${PROJECT_ID}/billingInfo`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await res.json();
  return { status: res.status, body };
}

async function getAuthorizedDomains() {
  const res = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${apiKey}`,
  );
  return res.json();
}

section("Environment");
console.log("Project ID:", PROJECT_ID);
console.log("API key present:", Boolean(apiKey));
console.log("FIREBASE_TOKEN present:", Boolean(token));
console.log("gcloud installed:", false, "(not found on PATH — install Google Cloud SDK for billing CLI checks)");

section("Authorized domains (client API)");
try {
  const domains = await getAuthorizedDomains();
  console.log(JSON.stringify(domains.authorizedDomains ?? domains, null, 2));
} catch (error) {
  console.error("Could not read authorized domains:", error.message);
}

section("Phone send probe (public API)");
if (!apiKey) {
  console.log("SKIP — set NEXT_PUBLIC_FIREBASE_API_KEY in .env.local");
} else {
  const probe = await probeSendVerificationCode();
  console.log("HTTP", probe.status);
  console.log(JSON.stringify(probe.body, null, 2));
  const msg = probe.body?.error?.message ?? "";
  if (msg.includes("region enabled")) {
    console.log(
      "\nLIKELY CAUSE: Pakistan (PK) is not in the Firebase SMS region allowlist.",
    );
    console.log(
      "Fix: run `npm run phone-auth:configure` after `firebase login` with a project-owner account,",
    );
    console.log(
      "or Console → Authentication → Settings → SMS region policy → allow PK.",
    );
  } else if (msg.includes("BILLING") || msg.includes("billing")) {
    console.log("\nLIKELY CAUSE: Blaze billing is not enabled on this project.");
    console.log(
      `Manual step: https://console.firebase.google.com/project/${PROJECT_ID}/usage/details`,
    );
  } else if (msg.includes("OPERATION_NOT_ALLOWED")) {
    console.log("\nLIKELY CAUSE: Phone provider disabled or SMS region blocked.");
  }
}

if (token) {
  section("Admin auth config (requires FIREBASE_TOKEN)");
  const config = await getAdminConfig();
  console.log("HTTP", config.status);
  if (config.status === 200) {
    const phone = config.body?.signIn?.phoneNumber;
    const sms = config.body?.smsRegionConfig;
    console.log("Phone enabled:", phone?.enabled ?? "(unknown)");
    console.log("Test numbers:", phone?.testPhoneNumbers ?? {});
    console.log("SMS region config:", JSON.stringify(sms ?? {}, null, 2));
  } else {
    console.log(JSON.stringify(config.body, null, 2));
  }

  section("Billing status (Cloud Billing API)");
  const billing = await getBillingStatus();
  console.log("HTTP", billing.status);
  if (billing.status === 200) {
    const linked = Boolean(billing.body?.billingAccountName);
    console.log("Billing account linked:", linked ? "yes (Blaze-capable)" : "no (Spark)");
    if (billing.body?.billingAccountName) {
      console.log("Billing account:", billing.body.billingAccountName);
    }
  } else {
    console.log(JSON.stringify(billing.body, null, 2));
  }
} else {
  section("Admin checks skipped");
  console.log(
    "Export a CI token with project-owner access, then re-run:\n  export FIREBASE_TOKEN=$(firebase login:ci)\n  node scripts/diagnose-phone-auth.mjs",
  );
}

section("Firebase CLI note");
console.log(
  "Ensure `firebase login` uses an account with Owner/Editor on bharwana-estate-developer.",
);
console.log(
  "Current machine may be logged into a different Google account (403 on this project).",
);
