"use client";

import { RecaptchaVerifier, type Auth } from "firebase/auth";

const RECAPTCHA_SCRIPT_ID = "bharwana-recaptcha-net";

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (cb: () => void) => void;
      reset?: (widgetId?: number) => void;
      render?: (...args: unknown[]) => number;
      enterprise?: unknown;
    };
  }
}

let ensureScriptPromise: Promise<void> | null = null;
let createLock: Promise<unknown> = Promise.resolve();

/**
 * Load grecaptcha from recaptcha.net (not google.com).
 * Many PK / restricted networks close connections to www.google.com (ERR_CONNECTION_CLOSED)
 * while recaptcha.net still works. Firebase RecaptchaVerifier reuses window.grecaptcha if present.
 */
export function ensureRecaptchaScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("reCAPTCHA is only available in the browser."));
  }
  if (window.grecaptcha?.render || window.grecaptcha?.ready) {
    return new Promise((resolve) => {
      if (window.grecaptcha?.ready) window.grecaptcha.ready(() => resolve());
      else resolve();
    });
  }
  if (ensureScriptPromise) return ensureScriptPromise;

  ensureScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          ensureScriptPromise = null;
          reject(
            Object.assign(new Error("Could not connect to the reCAPTCHA service (recaptcha.net)."), {
              code: "auth/network-request-failed",
            }),
          );
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = RECAPTCHA_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = "https://www.recaptcha.net/recaptcha/api.js?render=explicit";
    script.onload = () => {
      if (window.grecaptcha?.ready) window.grecaptcha.ready(() => resolve());
      else resolve();
    };
    script.onerror = () => {
      ensureScriptPromise = null;
      reject(
        Object.assign(
          new Error(
            "Could not load reCAPTCHA from recaptcha.net. Check network / ad blockers, or try mobile data.",
          ),
          { code: "auth/network-request-failed" },
        ),
      );
    };
    document.head.appendChild(script);
  });

  return ensureScriptPromise;
}

export async function clearRecaptchaContainer(containerId: string, existing?: RecaptchaVerifier | null) {
  try {
    existing?.clear();
  } catch {
    /* ignore */
  }
  const host = document.getElementById(containerId);
  if (host) host.innerHTML = "";
  await new Promise<void>((resolve) => window.setTimeout(resolve, 40));
}

/**
 * Invisible reCAPTCHA **v2** for Firebase Phone Auth (`RecaptchaVerifier`).
 * Serializes creates so we never fire two competing script/verifier inits.
 *
 * Note: Firebase Auth may log
 * "Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification."
 * That is normal when Enterprise is not enforced for Phone — the SDK intentionally falls back to v2.
 * It is NOT itself an error. HTTP 503 + `auth/error-code:-39` after a solved v2 challenge is usually
 * SMS quota / anti-abuse, not an Enterprise key mismatch.
 */
export async function createPhoneRecaptchaVerifier(
  auth: Auth,
  containerId: string,
  previous?: RecaptchaVerifier | null,
): Promise<RecaptchaVerifier> {
  const run = createLock.then(async () => {
    await ensureRecaptchaScript();
    await clearRecaptchaContainer(containerId, previous);

    const host = document.getElementById(containerId);
    if (!host) {
      throw Object.assign(new Error("reCAPTCHA container is missing from the page."), {
        code: "auth/argument-error",
      });
    }

    console.info("[phone-recaptcha] creating invisible RecaptchaVerifier", {
      containerId,
      grecaptchaReady: Boolean(window.grecaptcha?.ready || window.grecaptcha?.render),
    });

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        console.info("[phone-recaptcha] challenge solved");
      },
      "expired-callback": () => {
        console.warn("[phone-recaptcha] challenge expired");
      },
      "error-callback": (err: unknown) => {
        console.error("[phone-recaptcha] widget error-callback", err);
      },
    });

    try {
      const widgetId = await verifier.render();
      console.info("[phone-recaptcha] rendered", { containerId, widgetId });
    } catch (error) {
      console.error("[phone-recaptcha] render failed", error);
      try {
        verifier.clear();
      } catch {
        /* ignore */
      }
      throw error;
    }

    return verifier;
  });

  createLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
