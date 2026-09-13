"use client";

import { RecaptchaVerifier, type Auth } from "firebase/auth";

/**
 * Clear any prior Firebase RecaptchaVerifier bound to this container.
 * Do not preload grecaptcha ourselves — Firebase Auth injects the correct script.
 */
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
 * Invisible reCAPTCHA for Firebase Phone Auth.
 * Pass a dedicated empty DOM node that is never nested inside an input wrapper.
 */
export async function createPhoneRecaptchaVerifier(
  auth: Auth,
  containerId: string,
  previous?: RecaptchaVerifier | null,
): Promise<RecaptchaVerifier> {
  await clearRecaptchaContainer(containerId, previous);

  const host = document.getElementById(containerId);
  if (!host) {
    throw Object.assign(new Error("reCAPTCHA container is missing from the page."), {
      code: "auth/argument-error",
    });
  }

  console.info("[phone-recaptcha] creating invisible RecaptchaVerifier", { containerId });

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
}

/** @deprecated No-op — Firebase loads grecaptcha. Kept so older call sites compile. */
export function ensureRecaptchaScript(): Promise<void> {
  return Promise.resolve();
}
