"use client";

import { RecaptchaVerifier, type Auth } from "firebase/auth";

const RECAPTCHA_SCRIPT_ID = "bharwana-recaptcha-net";

declare global {
  interface Window {
    grecaptcha?: {
      ready?: (cb: () => void) => void;
      reset?: (widgetId?: number) => void;
      render?: (
        container: string | HTMLElement,
        parameters: {
          sitekey: string;
          size?: "invisible" | "compact" | "normal";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => number;
      execute?: (widgetId?: number) => void;
      enterprise?: unknown;
    };
  }
}

let ensureScriptPromise: Promise<void> | null = null;
/** Serialize all create/clear work so concurrent retries never double-render one container. */
let createLock: Promise<unknown> = Promise.resolve();
/** Last live verifier per container id - survives lost React refs. */
const verifiersByContainer = new Map<string, RecaptchaVerifier>();

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

function safeClearVerifier(verifier: RecaptchaVerifier | null | undefined) {
  if (!verifier) return;
  try {
    verifier.clear();
  } catch {
    /* already cleared / disposed */
  }
}

/**
 * grecaptcha tracks render state on the *element node*, not its children.
 * Emptying innerHTML is not enough — replace the node so a new render is allowed.
 *
 * The host must be an imperative child (see PhoneRecaptchaHost), not a React-managed
 * element. Replacing a React fiber's DOM node causes insertBefore NotFoundError.
 */
function replaceRecaptchaHost(containerId: string): HTMLElement | null {
  const host = document.getElementById(containerId);
  if (!host) return null;
  const parent = host.parentNode;
  if (!parent) {
    host.innerHTML = "";
    return host;
  }
  const fresh = host.cloneNode(false) as HTMLElement;
  fresh.id = containerId;
  fresh.innerHTML = "";
  parent.replaceChild(fresh, host);
  return fresh;
}

/**
 * Tear down any verifier bound to this container and replace the DOM host.
 * Always safe to call (retries, unmount, failed sends).
 */
export async function clearRecaptchaContainer(
  containerId: string,
  existing?: RecaptchaVerifier | null,
) {
  const tracked = verifiersByContainer.get(containerId) ?? null;
  verifiersByContainer.delete(containerId);

  safeClearVerifier(existing);
  if (tracked && tracked !== existing) {
    safeClearVerifier(tracked);
  }

  replaceRecaptchaHost(containerId);
  // Brief yield so grecaptcha finishes disposing the previous widget.
  await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
}

async function waitForRecaptchaHost(containerId: string, timeoutMs = 800): Promise<HTMLElement> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const host = document.getElementById(containerId);
    if (host) return host;
    await new Promise<void>((resolve) => window.setTimeout(resolve, 16));
  }
  throw Object.assign(new Error("reCAPTCHA container is missing from the page."), {
    code: "auth/argument-error",
  });
}

/**
 * Invisible reCAPTCHA **v2** for Firebase Phone Auth (`RecaptchaVerifier`).
 * Exactly one live instance per container: clear + replace host before every recreate.
 *
 * Note: Firebase Auth may log
 * "Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification."
 * That is normal when Enterprise is not enforced for Phone - the SDK intentionally falls back to v2.
 */
export async function createPhoneRecaptchaVerifier(
  auth: Auth,
  containerId: string,
  previous?: RecaptchaVerifier | null,
): Promise<RecaptchaVerifier> {
  const run = createLock.then(async () => {
    await ensureRecaptchaScript();
    // Prefer the passed ref, but always clear whatever is tracked for this id.
    await clearRecaptchaContainer(containerId, previous ?? verifiersByContainer.get(containerId));

    await waitForRecaptchaHost(containerId);

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: "invisible",
      callback: () => {
        // Challenge solved — Firebase Phone Auth continues from the send/verify caller.
      },
      "expired-callback": () => {
        console.warn("[phone-recaptcha] challenge expired");
      },
      "error-callback": (err: unknown) => {
        console.error("[phone-recaptcha] widget error-callback", err);
      },
    });

    verifiersByContainer.set(containerId, verifier);

    try {
      await verifier.render();
    } catch (error) {
      console.error("[phone-recaptcha] render failed", error);
      verifiersByContainer.delete(containerId);
      safeClearVerifier(verifier);
      // Hard-reset the host so the next attempt does not hit "already been rendered".
      replaceRecaptchaHost(containerId);
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

/**
 * Invisible reCAPTCHA token for server-proxied phone OTP.
 * Site key comes from our API (proxied Identity Toolkit) — the browser never
 * calls identitytoolkit.googleapis.com.
 */
export async function solveInvisibleRecaptchaToken(containerId: string): Promise<string> {
  const run = createLock.then(async () => {
    await ensureRecaptchaScript();

    const paramsRes = await fetch("/api/auth/phone/recaptcha-params", { cache: "no-store" });
    const paramsBody = (await paramsRes.json().catch(() => ({}))) as {
      siteKey?: string;
      error?: string;
    };
    if (!paramsRes.ok || !paramsBody.siteKey) {
      throw Object.assign(
        new Error(paramsBody.error || "Could not load security check. Try again."),
        { code: "auth/network-request-failed" },
      );
    }

    await clearRecaptchaContainer(containerId, verifiersByContainer.get(containerId));
    const host = await waitForRecaptchaHost(containerId);
    const grecaptcha = window.grecaptcha;
    if (!grecaptcha?.render || !grecaptcha.execute) {
      throw Object.assign(new Error("reCAPTCHA failed to initialize. Refresh and try again."), {
        code: "auth/network-request-failed",
      });
    }

    const token = await new Promise<string>((resolve, reject) => {
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        reject(Object.assign(new Error(message), { code: "auth/network-request-failed" }));
      };

      try {
        const widgetId = grecaptcha.render!(host, {
          sitekey: paramsBody.siteKey!,
          size: "invisible",
          callback: (value: string) => {
            if (settled) return;
            settled = true;
            resolve(value);
          },
          "expired-callback": () => fail("Security check expired. Try again."),
          "error-callback": () => fail("Security check failed. Try again."),
        });
        grecaptcha.execute!(widgetId);
      } catch (error) {
        fail(error instanceof Error ? error.message : "Security check failed. Try again.");
      }

      window.setTimeout(() => fail("Security check timed out. Refresh and try again."), 45_000);
    });

    replaceRecaptchaHost(containerId);
    return token;
  });

  createLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
