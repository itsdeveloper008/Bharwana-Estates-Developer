"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMockAuth } from "@/lib/mock-auth";

/** Protects /dealer/* — session required; role must be DEALER. */
export function DealerGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useMockAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      const returnTo = encodeURIComponent(pathname || "/dealer/add-property");
      router.replace(`/login?returnTo=${returnTo}`);
      return;
    }
    if (user.role !== "DEALER") {
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

  if (user.role !== "DEALER") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
