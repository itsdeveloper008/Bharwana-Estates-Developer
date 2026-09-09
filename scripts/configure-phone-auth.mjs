/**
 * Enable Firebase Phone Auth for Bharwana Estates (PK region + QA test numbers).
 *
 * Prerequisites:
 *   1. Blaze billing enabled on the Firebase project (manual — cannot be automated).
 *   2. FIREBASE_TOKEN from a project Owner/Editor:
 *        export FIREBASE_TOKEN=$(firebase login:ci)
 *   3. `firebase login` with the same Google account that owns bharwana-estate-developer.
 *
 * Usage:
 *   npm run phone-auth:configure
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "bharwana-estate-developer";

function resolveToken() {
  if (process.env.FIREBASE_TOKEN) return process.env.FIREBASE_TOKEN;
  const configPath = join(homedir(), ".config/configstore/firebase-tools.json");
  if (!existsSync(configPath)) return null;
  try {
    const cfg = JSON.parse(readFileSync(configPath, "utf8"));
    const token = cfg.tokens?.access_token;
    const email = cfg.user?.email;
    if (token) {
      console.log(`Using Firebase CLI access token for ${email ?? "signed-in user"}.`);
      return token;
    }
  } catch {
    // ignore
  }
  return null;
}

const TOKEN = resolveToken();

const TEST_NUMBERS = {
  "+923001234567": "123456",
  "+923001713811": "123456",
};

const CONFIG_URL = `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/config`;

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

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

async function api(path, options = {}) {
  const res = await fetch(`${CONFIG_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

async function checkBilling() {
  const res = await fetch(
    `https://cloudbilling.googleapis.com/v1/projects/${PROJECT_ID}/billingInfo`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  const body = await res.json();
  if (res.status !== 200) {
    console.warn("Could not verify billing via API:", JSON.stringify(body));
    return null;
  }
  return Boolean(body.billingAccountName);
}

async function probePhone() {
  const apiKey = loadApiKey();
  if (!apiKey) return { skipped: true };
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: "+923001234567",
        recaptchaToken: "configure-script-probe",
      }),
    },
  );
  return { status: res.status, body: await res.json() };
}

if (!TOKEN) {
  fail(
    "No Firebase access token found.\n" +
      "  1. firebase logout && firebase login   (use the Google account that owns bharwana-estate-developer)\n" +
      "  2. npm run phone-auth:configure",
  );
}

console.log(`Configuring Phone Auth for project: ${PROJECT_ID}`);

const billingLinked = await checkBilling();
if (billingLinked === false) {
  fail(
    `Firebase billing is not enabled on ${PROJECT_ID}.\n` +
      `Upgrade manually (cannot be automated):\n` +
      `  https://console.firebase.google.com/project/${PROJECT_ID}/usage/details\n` +
      "Attach a billing account (Blaze plan), then re-run this script.",
  );
}
if (billingLinked === true) {
  console.log("Billing: Blaze account linked.");
}

console.log("Reading current Identity Platform config…");
const current = await api("");
if (current.status === 403) {
  const email = (() => {
    try {
      const cfg = JSON.parse(
        readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8"),
      );
      return cfg.user?.email;
    } catch {
      return null;
    }
  })();
  fail(
    `Permission denied (403). ${email ? `Currently logged in as ${email}.` : ""}\n` +
      "That account cannot manage bharwana-estate-developer.\n" +
      "Run in your terminal:\n" +
      "  firebase logout\n" +
      "  firebase login\n" +
      "  (choose the Google account that owns Bharwana Estate Developer in the Console)\n" +
      "  npm run phone-auth:configure\n\n" +
      "Or set PK manually: Console → Authentication → Settings → SMS region policy → allow PK.",
  );
}
if (current.status === 404) {
  console.log("Config not found — initializing Identity Platform auth…");
  const init = await fetch(
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
  );
  const initBody = await init.json();
  if (!init.ok) {
    fail(`initializeAuth failed: ${JSON.stringify(initBody)}`);
  }
  console.log("Identity Platform initialized.");
}

const patchBody = {
  signIn: {
    phoneNumber: {
      enabled: true,
      testPhoneNumbers: TEST_NUMBERS,
    },
  },
  smsRegionConfig: {
    allowlistOnly: {
      allowedRegions: ["PK"],
    },
  },
};

console.log("Enabling Phone provider, PK SMS region, and test numbers…");
const updated = await api(
  "?updateMask=signIn.phoneNumber.enabled,signIn.phoneNumber.testPhoneNumbers,smsRegionConfig",
  { method: "PATCH", body: JSON.stringify(patchBody) },
);

if (updated.status !== 200) {
  fail(`updateConfig failed (${updated.status}): ${JSON.stringify(updated.body)}`);
}

const phone = updated.body?.signIn?.phoneNumber;
const sms = updated.body?.smsRegionConfig;
console.log("Phone enabled:", phone?.enabled);
console.log("Test numbers:", phone?.testPhoneNumbers);
console.log("SMS regions:", JSON.stringify(sms));

console.log("\nVerifying with sendVerificationCode probe…");
const probe = await probePhone();
if (probe.skipped) {
  console.log("Probe skipped (no API key in .env.local).");
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
