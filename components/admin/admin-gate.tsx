"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { RequirePathModule } from "@/components/admin/require-module";
import { useAdminAuth } from "@/lib/admin-auth";
import type { AdminModule } from "@/lib/admin/modules";

function firstAllowedPath(
  hasModule: (m: AdminModule) => boolean,
  isSuperAdmin: boolean,
): string {
  if (isSuperAdmin || hasModule("dashboard")) return "/admin/dashboard";
  const order: Array<{ module: AdminModule; href: string }> = [
    { module: "submissions", href: "/admin/submissions" },
    { module: "properties", href: "/admin/properties" },
    { module: "dealers", href: "/admin/developers" },
    { module: "commissions", href: "/admin/commissions" },
    { module: "inquiries", href: "/admin/inquiries" },
    { module: "newsletter", href: "/admin/newsletter" },
    { module: "team", href: "/admin/team" },
    { module: "users", href: "/admin/users" },
    { module: "deletion", href: "/admin/deletion-requests" },
    { module: "reports", href: "/admin/reports" },
  ];
  for (const item of order) {
    if (hasModule(item.module)) return item.href;
  }
  return "/admin/login";
}

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isReady, hasModule, isSuperAdmin } = useAdminAuth();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!isReady) return;
    if (!isLogin && !isAuthenticated) {
      router.replace("/admin/login");
    }
    if (isLogin && isAuthenticated) {
      router.replace(firstAllowedPath(hasModule, isSuperAdmin));
    }
  }, [isReady, isLogin, isAuthenticated, router, hasModule, isSuperAdmin]);

  if (isLogin) {
    if (isReady && isAuthenticated) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-ivory text-sm text-muted-foreground">
          Redirecting…
        </div>
      );
    }
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return (
      <AdminShell>
        <RequirePathModule>{children}</RequirePathModule>
      </AdminShell>
    );
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory text-sm text-muted-foreground">
      Redirecting to sign in…
    </div>
  );
}
