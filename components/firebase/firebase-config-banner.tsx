"use client";

import { useEffect } from "react";
import {
  FIREBASE_NOT_CONFIGURED_MESSAGE,
  isFirebaseConfigured,
  logFirebaseConfigDiagnostics,
} from "@/lib/firebase/client";

export function FirebaseConfigBanner({ context }: { context?: string }) {
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) logFirebaseConfigDiagnostics(context);
  }, [configured, context]);

  if (configured) return null;

  return (
    <p
      className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
      role="alert"
    >
      {FIREBASE_NOT_CONFIGURED_MESSAGE}
    </p>
  );
}
