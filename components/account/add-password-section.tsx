"use client";

import { useState } from "react";
import { SetPasswordOptional } from "@/components/auth/set-password-optional";
import { Button } from "@/components/ui/button";
import { useMockAuth } from "@/lib/mock-auth";

/** Lets phone-only accounts add email/password later from Settings. */
export function AddPasswordSection() {
  const { hasPasswordProvider, getAccountAuthMethod } = useMockAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const method = getAccountAuthMethod();
  const alreadyHasPassword = hasPasswordProvider();

  if (alreadyHasPassword || done) {
    return (
      <div>
        <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Password</dt>
        <dd className="mt-1 text-sm text-forest/80">Email/password sign-in is enabled for this account.</dd>
      </div>
    );
  }

  // Offer to phone (and google) users who don't have a password yet
  if (method !== "phone" && method !== "google" && method !== null) {
    return null;
  }

  if (!open) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Password</dt>
          <dd className="mt-1 text-sm text-forest/75">
            Add a password to sign in without waiting for an SMS code.
          </dd>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl" onClick={() => setOpen(true)}>
          Add password
        </Button>
      </div>
    );
  }

  return (
    <SetPasswordOptional
      title="Add password for faster sign-in"
      description="Link an email and password to this account so you can skip OTP next time."
      showSkip
      onSkip={() => setOpen(false)}
      onDone={() => {
        setDone(true);
        setOpen(false);
      }}
    />
  );
}
