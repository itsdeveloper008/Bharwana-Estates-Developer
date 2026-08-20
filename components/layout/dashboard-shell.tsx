"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { useMockAuth } from "@/lib/mock-auth";
import type { UserRole } from "@/lib/types";
import { users } from "@/lib/mock-data/users";

const roleCopy: Record<UserRole, { title: string; description: string }> = {
  BUYER: {
    title: "Buyer desk",
    description: "Saved homes and inquiry history will live here once accounts are wired.",
  },
  HOUSE_OWNER: {
    title: "Owner atelier",
    description: "Manage listings and the conversations they attract.",
  },
  SALES_REP: {
    title: "Sales floor",
    description: "Move inquiries through a quiet, ordered pipeline.",
  },
  ADMIN: {
    title: "Administration",
    description: "A light ledger of people, developers, and inventory.",
  },
};

export function DashboardShell({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { user, loginAs } = useMockAuth();
  const pathname = usePathname();
  const copy = roleCopy[role];
  const demoUser = users.find((item) => item.role === role);
  const guestAdd = role === "HOUSE_OWNER" && pathname?.includes("/add-property");

  if ((!user || user.role !== role) && guestAdd) {
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">{children}</div>
      </div>
    );
  }

  if (!user || user.role !== role) {
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Preview access</p>
          <h1 className="mt-3 font-serif text-4xl">{copy.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{copy.description}</p>
          <Button className="mt-8" onClick={() => demoUser && loginAs(demoUser)}>
            Continue as {demoUser?.fullName}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Frontend-only mock session. No credentials are stored.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="border-b border-forest/10 bg-cream/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">{copy.title}</p>
            <h1 className="font-serif text-2xl sm:text-3xl">{user.fullName}</h1>
          </div>
          {pathname !== "/" && (
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Marketplace
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</div>
    </div>
  );
}
