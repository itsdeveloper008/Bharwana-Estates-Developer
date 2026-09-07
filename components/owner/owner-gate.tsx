"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMockAuth } from "@/lib/mock-auth";

/** Protects owner routes — HOUSE_OWNER session required. */
export function OwnerGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useMockAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      const returnTo = encodeURIComponent(pathname || "/owner/add-property");
      router.replace(`/login?returnTo=${returnTo}`);
      return;
    }
    if (user.role !== "HOUSE_OWNER") {
      router.replace("/");
    }
  }, [isReady, user, router, pathname]);

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  if (user.role !== "HOUSE_OWNER") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
