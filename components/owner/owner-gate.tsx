"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMockAuth } from "@/lib/mock-auth";
import { isIndividualRole } from "@/lib/user-role";

/** Protects owner routes — individuals (and legacy buyer/owner) may enter. */
export function OwnerGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useMockAuth();
  const router = useRouter();
  const pathname = usePathname();
  const canList = isIndividualRole(user?.role);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      const returnTo = encodeURIComponent(pathname || "/owner/add-property");
      router.replace(`/login?returnTo=${returnTo}`);
      return;
    }
    if (user.role === "DEALER") {
      router.replace("/dealer/add-property");
      return;
    }
    if (!canList) {
      router.replace("/");
    }
  }, [isReady, user, canList, router, pathname]);

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
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

  if (!canList) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
