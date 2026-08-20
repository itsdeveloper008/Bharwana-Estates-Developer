"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { useAdminAuth } from "@/lib/admin-auth";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isReady } = useAdminAuth();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!isReady) return;
    if (!isLogin && !isAuthenticated) {
      router.replace("/admin/login");
    }
    if (isLogin && isAuthenticated) {
      router.replace("/admin/dashboard");
    }
  }, [isReady, isLogin, isAuthenticated, router]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (isLogin) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory text-sm text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
