"use client";

import { RecaptchaVerifier, type Auth } from "firebase/auth";

const RECAPTCHA_SCRIPT_ID = "bharwana-recaptcha-api";

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (cb: () => void) => void;
      reset?: (widgetId?: number) => void;
      render?: (...args: unknown[]) => number;
    };
  }
}

/** Load grecaptcha from recaptcha.net (works when google.com is blocked / flaky). */
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

  const existing = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Could not connect to the reCAPTCHA service.")),
        { once: true },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = RECAPTCHA_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    // Prefer recaptcha.net — same API as google.com but more reachable in restricted networks.
    script.src = "https://www.recaptcha.net/recaptcha/api.js?render=explicit";
    script.onload = () => {
      if (window.grecaptcha?.ready) window.grecaptcha.ready(() => resolve());
      else resolve();
    };
    script.onerror = () =>
      reject(
        Object.assign(new Error("Could not connect to the reCAPTCHA service."), {
          code: "auth/network-request-failed",
        }),
      );
    document.head.appendChild(script);
  });
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
 * Create a visible reCAPTCHA widget for Firebase Phone Auth.
 * Visible is more reliable than invisible when domains / network block silent challenges.
 */
export async function createPhoneRecaptchaVerifier(
  auth: Auth,
  containerId: string,
  previous?: RecaptchaVerifier | null,
): Promise<RecaptchaVerifier> {
  await ensureRecaptchaScript();
  await clearRecaptchaContainer(containerId, previous);

  const host = document.getElementById(containerId);
  if (!host) {
    throw Object.assign(new Error("reCAPTCHA container is missing from the page."), {
      code: "auth/argument-error",
    });
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: "normal",
    callback: () => undefined,
    "expired-callback": () => undefined,
    "error-callback": () => {
      console.error("[phone-recaptcha] widget error-callback fired");
    },
  });
  await verifier.render();
  return verifier;
}
