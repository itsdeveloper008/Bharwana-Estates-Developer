"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FirebaseConfigBanner } from "@/components/firebase/firebase-config-banner";
import { useAdminAuth } from "@/lib/admin-auth";
import type { AdminModule } from "@/lib/admin/modules";
import {
  ADMIN_MODULE_VIEWED_EVENT,
  countPendingDealers,
  countPendingDeletions,
  countPendingSubmissions,
  countUnseenInquiries,
  countUnseenNewsletter,
  countUnseenUsers,
  ensureAdminModuleBaselines,
  getAdminModuleLastViewedAt,
  type AdminBadgeModule,
} from "@/lib/admin/unseen-badges";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { whenFirebaseUserReady } from "@/lib/firebase/when-auth-ready";
import { subscribeDeletionRequests, type DeletionRequest } from "@/lib/firestore/deletion";
import { subscribeNewsletterSignups, type NewsletterSignup } from "@/lib/firestore/inquiries";
import { useMockStore } from "@/lib/mock-store";
import { cn } from "@/lib/utils";

/** Sidebar brand green from Admin redesign spec. */
const ADMIN_SIDEBAR = "#0F5132";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  module: AdminModule | "staff";
  badgeModule?: AdminBadgeModule;
};

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  {
    href: "/admin/submissions",
    label: "Submissions",
    icon: ClipboardCheck,
    module: "submissions",
    badgeModule: "submissions",
  },
  { href: "/admin/properties", label: "Properties", icon: Building2, module: "properties" },
  {
    href: "/admin/developers",
    label: "Dealers",
    icon: Handshake,
    module: "dealers",
    badgeModule: "dealers",
  },
  { href: "/admin/commissions", label: "Commissions", icon: Percent, module: "commissions" },
  {
    href: "/admin/inquiries",
    label: "Inquiries",
    icon: MessageSquare,
    module: "inquiries",
    badgeModule: "inquiries",
  },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail, module: "newsletter", badgeModule: "newsletter" },
  { href: "/admin/team", label: "Team", icon: UsersRound, module: "team" },
  { href: "/admin/users", label: "Users", icon: Users, module: "users", badgeModule: "users" },
  { href: "/admin/deletion-requests", label: "Deletion", icon: ShieldAlert, module: "deletion", badgeModule: "deletion" },
  { href: "/admin/reports", label: "Reports", icon: FileBarChart, module: "reports" },
  { href: "/admin/staff", label: "Staff", icon: UserCog, module: "staff" },
];

function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/admin/dashboard" className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Bharwana Estates"
        width={compact ? 36 : 42}
        height={compact ? 36 : 42}
        className={cn("shrink-0 object-contain", compact ? "h-9 w-9" : "h-10 w-10")}
      />
      <div className="min-w-0">
        <p className="font-serif text-[13px] font-semibold uppercase tracking-[0.14em] text-gold">
          Bharwana Admin
        </p>
        <p className="mt-0.5 truncate text-[9px] font-medium uppercase tracking-[0.18em] text-gold/65">
          Bharwana Estates Developers
        </p>
      </div>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { properties, inquiries, users, developers } = useMockStore();
  const { hasModule, isSuperAdmin, admin } = useAdminAuth();
  const [viewTick, setViewTick] = useState(0);
  const [newsletterSignups, setNewsletterSignups] = useState<NewsletterSignup[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);

  useEffect(() => {
    if (!admin?.uid) return;
    ensureAdminModuleBaselines(admin.uid);
    setViewTick((tick) => tick + 1);
  }, [admin?.uid]);

  useEffect(() => {
    const onViewed = () => setViewTick((tick) => tick + 1);
    window.addEventListener(ADMIN_MODULE_VIEWED_EVENT, onViewed);
    return () => window.removeEventListener(ADMIN_MODULE_VIEWED_EVENT, onViewed);
  }, []);

  useEffect(() => {
    if (!admin?.uid || !isFirebaseConfigured()) {
      setNewsletterSignups([]);
      setDeletionRequests([]);
      return;
    }
    const stop = whenFirebaseUserReady(() => {
      const unsubNewsletter = subscribeNewsletterSignups(
        (next) => setNewsletterSignups(next),
        (error) => console.error("Newsletter badge subscription failed", error),
      );
      const unsubDeletion = subscribeDeletionRequests(
        (next) => setDeletionRequests(next),
        (error) => console.error("Deletion badge subscription failed", error),
      );
      return () => {
        unsubNewsletter?.();
        unsubDeletion?.();
      };
    });
    return () => stop();
  }, [admin?.uid]);

  const badgeCounts = useMemo(() => {
    void viewTick;
    const uid = admin?.uid;
    if (!uid) {
      return {
        submissions: 0,
        inquiries: 0,
        users: 0,
        dealers: 0,
        newsletter: 0,
        deletion: 0,
      };
    }
    return {
      submissions: countPendingSubmissions(properties),
      inquiries: countUnseenInquiries(inquiries, getAdminModuleLastViewedAt(uid, "inquiries")),
      users: countUnseenUsers(users, getAdminModuleLastViewedAt(uid, "users")),
      dealers: countPendingDealers(developers),
      newsletter: countUnseenNewsletter(
        newsletterSignups,
        getAdminModuleLastViewedAt(uid, "newsletter"),
      ),
      deletion: countPendingDeletions(deletionRequests),
    };
  }, [
    admin?.uid,
    properties,
    inquiries,
    users,
    developers,
    newsletterSignups,
    deletionRequests,
    viewTick,
  ]);

  const visible = useMemo(() => {
    return navItems.filter((item) => {
      if (item.module === "staff") return isSuperAdmin;
      return hasModule(item.module);
    });
  }, [hasModule, isSuperAdmin]);

  return (
    <nav className="flex flex-col gap-0.5">
      {visible.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const count = item.badgeModule ? badgeCounts[item.badgeModule] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-gold/20 text-ivory"
                : "text-ivory/80 hover:bg-white/5 hover:text-ivory",
            )}
          >
            <item.icon
              className={cn("h-4 w-4 shrink-0", active ? "text-gold" : "text-ivory/70")}
              strokeWidth={1.6}
            />
            <span className="flex-1 tracking-wide">{item.label}</span>
            {count > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[10px] font-semibold text-forest">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
        );
      })}
      {admin?.adminRole === "staff" && visible.length === 0 ? (
        <p className="px-3 py-2 text-xs text-ivory/55">No modules assigned.</p>
      ) : null}
    </nav>
  );
}

function SidebarFooter({
  onViewWebsite,
  onSignOut,
}: {
  onViewWebsite: () => void;
  onSignOut: () => void;
}) {
  const { admin } = useAdminAuth();

  return (
    <div className="space-y-3 border-t border-white/10 p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9 ring-1 ring-gold/50">
          <AvatarImage src={admin?.avatarUrl} />
          <AvatarFallback className="bg-gold/20 text-xs font-semibold text-gold">
            {admin?.fullName?.slice(0, 2).toUpperCase() ?? "BA"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gold">
            {admin?.fullName ?? "Bharwana Admin"}
          </p>
          <p className="truncate text-xs text-ivory/55">{admin?.email}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2 border-gold/50 bg-transparent text-gold hover:border-gold hover:bg-gold/10 hover:text-gold"
        onClick={onViewWebsite}
      >
        <ExternalLink className="h-3.5 w-3.5" />
        View website
      </Button>
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center gap-2 px-1 py-1.5 text-sm text-gold/90 transition hover:text-gold"
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </button>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAdminAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSignOut() {
    logout();
    router.replace("/admin/login");
  }

  function handleViewWebsite() {
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#F8F7F4] font-normal text-forest antialiased [font-synthesis:none]">
      <FirebaseConfigBanner />
      <div className="flex min-h-screen">
        <aside
          className="hidden w-[17.5rem] shrink-0 lg:block"
          style={{ backgroundColor: ADMIN_SIDEBAR }}
        >
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-white/10 px-5 py-5">
              <AdminBrand />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavLinks />
            </div>
            <SidebarFooter onViewWebsite={handleViewWebsite} onSignOut={handleSignOut} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="flex items-center justify-between px-4 py-3 lg:hidden"
            style={{ backgroundColor: ADMIN_SIDEBAR }}
          >
            <AdminBrand compact />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open menu"
                  className="border-gold/40 bg-transparent text-gold hover:bg-gold/10 hover:text-gold"
                >
                  {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[280px] border-r-0 p-0 text-ivory [&>button]:text-gold [&>button]:hover:text-gold"
                style={{ backgroundColor: ADMIN_SIDEBAR }}
              >
                <SheetHeader className="border-b border-white/10 px-5 py-4 text-left">
                  <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                  <AdminBrand />
                </SheetHeader>
                <div className="px-3 py-4">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
                <SidebarFooter
                  onViewWebsite={() => {
                    setOpen(false);
                    handleViewWebsite();
                  }}
                  onSignOut={() => {
                    setOpen(false);
                    handleSignOut();
                  }}
                />
              </SheetContent>
            </Sheet>
          </header>
          <main className="flex-1 px-4 py-6 text-forest sm:px-6 lg:px-8 [&_th]:text-forest/70 [&_.text-muted-foreground]:text-forest/60">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
