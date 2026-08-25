"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMockAuth } from "@/lib/mock-auth";

/**
 * Protects /dealer/* — session required, role must be DEALER.
 * Add Property allows guests (publish-gate at submit), same pattern as owner.
 */
export function DealerGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useMockAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowGuest = pathname === "/dealer/add-property";

  useEffect(() => {
    if (!isReady) return;
    if (!user && !allowGuest) {
      const returnTo = encodeURIComponent(pathname || "/dealer");
      router.replace(`/login?returnTo=${returnTo}`);
      return;
    }
    if (user && user.role !== "DEALER" && !allowGuest) {
      router.replace("/");
    }
  }, [isReady, user, router, pathname, allowGuest]);

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  if (!user && !allowGuest) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  if (user && user.role !== "DEALER" && !allowGuest) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
