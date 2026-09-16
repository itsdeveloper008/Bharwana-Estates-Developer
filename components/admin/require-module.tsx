"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/lib/admin-auth";
import type { AdminModule } from "@/lib/admin/modules";
import { ADMIN_MODULE_LABELS } from "@/lib/admin/modules";

/** Map admin routes → required module (staff Super Admin bypasses via hasModule). */
export function moduleForAdminPath(pathname: string): AdminModule | "staff" | null {
  if (pathname.startsWith("/admin/staff")) return "staff";
  if (pathname.startsWith("/admin/reports")) return "reports";
  if (pathname.startsWith("/admin/submissions")) return "submissions";
  if (pathname.startsWith("/admin/properties")) return "properties";
  if (pathname.startsWith("/admin/developers")) return "dealers";
  if (pathname.startsWith("/admin/commissions")) return "commissions";
  if (pathname.startsWith("/admin/inquiries")) return "inquiries";
  if (pathname.startsWith("/admin/newsletter")) return "newsletter";
  if (pathname.startsWith("/admin/team")) return "team";
  if (pathname.startsWith("/admin/users")) return "users";
  if (pathname.startsWith("/admin/deletion-requests")) return "deletion";
  if (pathname.startsWith("/admin/dashboard")) return "dashboard";
  return null;
}

function firstAllowedHref(hasModule: (m: AdminModule) => boolean, isSuperAdmin: boolean): string {
  if (isSuperAdmin || hasModule("dashboard")) return "/admin/dashboard";
  const order: AdminModule[] = [
    "submissions",
    "properties",
    "dealers",
    "commissions",
    "inquiries",
    "newsletter",
    "team",
    "users",
    "deletion",
    "reports",
  ];
  for (const m of order) {
    if (hasModule(m)) {
      if (m === "dealers") return "/admin/developers";
      if (m === "deletion") return "/admin/deletion-requests";
      return `/admin/${m}`;
    }
  }
  return "/admin/login";
}

/** Blocks page content when the signed-in admin lacks the module. */
export function RequireModule({
  module: requiredModule,
  children,
}: {
  module: AdminModule | "staff";
  children: ReactNode;
}) {
  const { admin, isReady, isSuperAdmin, hasModule } = useAdminAuth();

  const allowed = useMemo(() => {
    if (!admin) return false;
    if (requiredModule === "staff") return isSuperAdmin;
    return hasModule(requiredModule);
  }, [admin, hasModule, isSuperAdmin, requiredModule]);

  const fallbackHref = useMemo(
    () => firstAllowedHref(hasModule, isSuperAdmin),
    [hasModule, isSuperAdmin],
  );

  if (!isReady) {
    return <p className="p-6 text-sm text-muted-foreground">Checking access…</p>;
  }

  if (!allowed) {
    const label = requiredModule === "staff" ? "Staff" : ADMIN_MODULE_LABELS[requiredModule];
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-16 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive/80" aria-hidden />
        <div>
          <h1 className="font-serif text-2xl text-forest">You don’t have access to this section</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is not permitted to open <span className="font-medium text-forest">{label}</span>
            . Ask a Super Admin to update your permissions, then refresh or sign in again.
          </p>
        </div>
        <Button asChild className="rounded-xl">
          <Link href={fallbackHref}>Go to an allowed section</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

/** Convenience: gate by current pathname. */
export function RequirePathModule({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const required = moduleForAdminPath(pathname ?? "");
  if (!required) return <>{children}</>;
  return <RequireModule module={required}>{children}</RequireModule>;
}
