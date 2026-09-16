"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Building2,
  ClipboardCheck,
  ExternalLink,
  FileBarChart,
  Handshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Percent,
  ShieldAlert,
  Mail,
  UserCog,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FirebaseConfigBanner } from "@/components/firebase/firebase-config-banner";
import { useAdminAuth } from "@/lib/admin-auth";
import type { AdminModule } from "@/lib/admin/modules";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  module: AdminModule | "staff";
  badgeKey?: "pending";
};

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  {
    href: "/admin/submissions",
    label: "Submissions",
    icon: ClipboardCheck,
    module: "submissions",
    badgeKey: "pending",
  },
  { href: "/admin/properties", label: "Properties", icon: Building2, module: "properties" },
  { href: "/admin/developers", label: "Dealers", icon: Handshake, module: "dealers" },
  { href: "/admin/commissions", label: "Commissions", icon: Percent, module: "commissions" },
  { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare, module: "inquiries" },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail, module: "newsletter" },
  { href: "/admin/team", label: "Team", icon: UsersRound, module: "team" },
  { href: "/admin/users", label: "Users", icon: Users, module: "users" },
  { href: "/admin/deletion-requests", label: "Deletion", icon: ShieldAlert, module: "deletion" },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart, module: "reports" },
  { href: "/admin/staff", label: "Staff", icon: UserCog, module: "staff" },
];

function AdminBrand() {
  return (
    <Link href="/admin/dashboard" className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Bharwana Estates"
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 object-contain"
      />
      <div>
        <p className="font-display text-[11px] tracking-crest text-forest">BHARWANA</p>
        <p className="type-eyebrow">Admin</p>
      </div>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { properties } = useMockStore();
  const { hasModule, isSuperAdmin, admin } = useAdminAuth();
  const pendingCount = properties.filter((property) => property.status === "PENDING_APPROVAL").length;

  const visible = useMemo(() => {
    return navItems.filter((item) => {
      if (item.module === "staff") return isSuperAdmin;
      return hasModule(item.module);
    });
  }, [hasModule, isSuperAdmin]);

  return (
    <nav className="flex flex-col gap-1">
      {visible.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm transition-colors",
              active
                ? "border-l-2 border-gold bg-gold/10 font-medium text-forest"
                : "border-l-2 border-transparent text-forest/70 hover:bg-cream hover:text-forest",
            )}
          >
            <item.icon className={cn("h-4 w-4", active ? "text-gold" : "text-forest/50")} />
            <span className="flex-1">{item.label}</span>
            {item.badgeKey === "pending" && pendingCount > 0 ? (
              <Badge variant="pending" className="ml-auto text-[10px]">
                {pendingCount}
              </Badge>
            ) : null}
          </Link>
        );
      })}
      {admin?.adminRole === "staff" && visible.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">No modules assigned.</p>
      ) : null}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAdminAuth();
  const { loginAs } = useMockAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSignOut() {
    logout();
    router.replace("/admin/login");
  }

  function handleViewWebsite() {
    if (admin) {
      const marketplaceUser = {
        id: `admin-${admin.email}`,
        fullName: admin.fullName,
        email: admin.email,
        phone: "",
        role: "ADMIN" as const,
        avatarUrl: admin.avatarUrl,
      };
      loginAs(marketplaceUser);
    }
    router.push("/");
  }

  const initials =
    admin?.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "AD";

  const roleLabel = admin?.adminRole === "super_admin" ? "Super Admin" : "Staff";

  return (
    <div className="flex min-h-screen bg-ivory">
      <aside className="hidden w-60 shrink-0 border-r border-forest/10 bg-cream/40 lg:flex lg:flex-col">
        <div className="border-b border-forest/10 px-5 py-5">
          <AdminBrand />
        </div>
        <div className="flex-1 px-2 py-4">
          <NavLinks />
        </div>
        <div className="space-y-2 border-t border-forest/10 p-4">
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleViewWebsite}>
            <ExternalLink className="h-4 w-4" />
            View Website
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-forest/10 bg-ivory px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-ivory p-0">
                <SheetHeader className="border-b border-forest/10 px-5 py-5 text-left">
                  <SheetTitle asChild>
                    <AdminBrand />
                  </SheetTitle>
                </SheetHeader>
                <div className="px-2 py-4">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <Link
              href="/"
              onClick={(event) => {
                event.preventDefault();
                handleViewWebsite();
              }}
              className="text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-forest"
            >
              Marketplace
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-forest">{admin?.fullName}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{roleLabel}</p>
            </div>
            <Avatar className="h-9 w-9 border border-gold/30">
              <AvatarImage src={admin?.avatarUrl} alt={admin?.fullName ?? "Admin"} />
              <AvatarFallback className="bg-forest text-xs text-ivory">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={handleViewWebsite}>
              <ExternalLink className="h-4 w-4" />
              View Website
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <FirebaseConfigBanner context="admin" />
          {children}
        </main>
      </div>
    </div>
  );
}
