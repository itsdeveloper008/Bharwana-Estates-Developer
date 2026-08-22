"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMockAuth } from "@/lib/mock-auth";

/** Blocks /owner/* until a mock user session exists — never renders children while logged out. */
export function OwnerGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useMockAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      const returnTo = encodeURIComponent(pathname || "/owner");
      router.replace(`/login?returnTo=${returnTo}`);
    }
  }, [isReady, user, router, pathname]);

  // Hold a blank/checking state so the add-property form never flashes before redirect.
  if (!isReady || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        {!isReady ? "Checking your session…" : "Redirecting to sign in…"}
      </div>
    );
  }

  return <>{children}</>;
}
