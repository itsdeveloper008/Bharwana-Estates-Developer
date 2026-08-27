"use client";

import { GOOGLE_OAUTH_CLIENT_ID } from "@/lib/firebase/client";

const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

type TokenClient = {
  requestAccessToken: (override?: { prompt?: string }) => void;
};

type GisWindow = Window & {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: { access_token?: string; error?: string; error_description?: string }) => void;
          error_callback?: (error: { type?: string; message?: string }) => void;
        }) => TokenClient;
      };
    };
  };
};

let scriptPromise: Promise<void> | null = null;

function loadGisScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in requires a browser."));
  }
  const win = window as GisWindow;
  if (win.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google sign-in.")), {
        once: true,
      });
      if (win.google?.accounts?.oauth2) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/** Opens Google account picker and returns an OAuth access token (no Firebase auth handler). */
export async function requestGoogleAccessToken(): Promise<string> {
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error("Google OAuth client ID is missing.");
  }

  await loadGisScript();
  const win = window as GisWindow;
  const oauth2 = win.google?.accounts?.oauth2;
  if (!oauth2) {
    throw new Error("Google sign-in failed to initialize.");
  }

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(response.error_description || response.error || "Google sign-in was cancelled."),
          );
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message || error.type || "Google sign-in was cancelled."));
      },
    });

    client.requestAccessToken({ prompt: "select_account" });
  });
}
