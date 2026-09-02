"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DealerGate } from "@/components/dealer/dealer-gate";
import { Navbar } from "@/components/layout/navbar";
import { OwnerGate } from "@/components/owner/owner-gate";
import { Button } from "@/components/ui/button";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import type { UserRole } from "@/lib/types";

const roleCopy: Record<UserRole, { title: string; description: string }> = {
  BUYER: {
    title: "Buyer desk",
    description: "Saved homes and inquiry history will live here once accounts are wired.",
  },
  HOUSE_OWNER: {
    title: "Owner atelier",
    description: "Manage listings and the conversations they attract.",
  },
  DEALER: {
    title: "Dealer desk",
    description: "Inventory, lead visibility, and commission under Bharwana.",
  },
  SALES_REP: {
    title: "Sales floor",
    description: "Move inquiries through a quiet, ordered pipeline.",
  },
  ADMIN: {
    title: "Administration",
    description: "A light ledger of people, Dealers, and inventory.",
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
  const { users } = useMockStore();
  const pathname = usePathname();
  const copy = roleCopy[role];
  const demoUser = users.find((item) => item.role === role);

  if (role === "HOUSE_OWNER" || role === "DEALER") {
    const Gate = role === "DEALER" ? DealerGate : OwnerGate;
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <Gate>
          <div className="border-b border-forest/10 bg-cream/50">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">
                  {user ? copy.title : "New listing"}
                </p>
                <h1 className="font-serif text-2xl sm:text-3xl">
                  {user?.fullName ?? "Place a residence"}
                </h1>
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
        </Gate>
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
          <p className="type-subheading">{copy.description}</p>
          <Button className="mt-8" onClick={() => demoUser && loginAs(demoUser)}>
            Continue as {demoUser?.fullName}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Frontend-only mock session. No credentials are stored on a server.
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
