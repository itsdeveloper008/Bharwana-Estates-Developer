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
import { Badge } from "@/components/ui/badge";
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
import { subscribeDeletionRequests, type DeletionRequest } from "@/lib/firestore/deletion";
import { subscribeNewsletterSignups, type NewsletterSignup } from "@/lib/firestore/inquiries";
import { useMockStore } from "@/lib/mock-store";
import { cn } from "@/lib/utils";

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

  // Live badge feeds for collections not in MockStore (same onSnapshot pattern as those pages).
  useEffect(() => {
    if (!admin?.uid || !isFirebaseConfigured()) {
      setNewsletterSignups([]);
      setDeletionRequests([]);
      return;
    }
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
    <nav className="flex flex-col gap-1">
      {visible.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const count = item.badgeModule ? badgeCounts[item.badgeModule] : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-l-2 border-gold bg-gold/10 text-forest"
                : "border-l-2 border-transparent text-forest/85 hover:bg-cream hover:text-forest",
            )}
          >
            <item.icon className={cn("h-4 w-4", active ? "text-gold" : "text-forest/70")} />
            <span className="flex-1">{item.label}</span>
            {count > 0 ? (
              <Badge variant="pending" className="ml-auto text-[10px]">
                {count > 99 ? "99+" : count}
              </Badge>
            ) : null}
          </Link>
        );
      })}
      {admin?.adminRole === "staff" && visible.length === 0 ? (
        <p className="px-3 py-2 text-xs text-forest/65">No modules assigned.</p>
      ) : null}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { admin, logout } = useAdminAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleSignOut() {
    logout();
    router.replace("/admin/login");
  }

  function handleViewWebsite() {
    // Keep the admin session; public navbar reads AdminAuth and shows the admin account menu.
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-[#F7F3EA] font-normal text-forest antialiased [font-synthesis:none]">
      <FirebaseConfigBanner />
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-forest/10 bg-[#FBFAF6] lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="border-b border-forest/10 px-5 py-5">
              <AdminBrand />
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavLinks />
            </div>
            <div className="space-y-3 border-t border-forest/10 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={admin?.avatarUrl} />
                  <AvatarFallback>{admin?.fullName?.slice(0, 2).toUpperCase() ?? "AD"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-forest">{admin?.fullName}</p>
                  <p className="truncate text-xs text-forest/65">{admin?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={handleViewWebsite}>
                <ExternalLink className="h-3.5 w-3.5" />
                View website
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={handleSignOut}>
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-forest/10 bg-[#FBFAF6] px-4 py-3 lg:hidden">
            <AdminBrand />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-[#FBFAF6] p-0">
                <SheetHeader className="border-b border-forest/10 px-5 py-4 text-left">
                  <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                  <AdminBrand />
                </SheetHeader>
                <div className="px-3 py-4">
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
                <div className="space-y-2 border-t border-forest/10 p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setOpen(false);
                      handleViewWebsite();
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View website
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setOpen(false);
                      handleSignOut();
                    }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </header>
          <main className="flex-1 px-4 py-6 text-forest sm:px-6 lg:px-8 [&_th]:text-forest/75 [&_.text-muted-foreground]:text-forest/65">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
