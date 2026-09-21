"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DealerGate } from "@/components/dealer/dealer-gate";
import { Navbar } from "@/components/layout/navbar";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { OwnerGate } from "@/components/owner/owner-gate";
import { Button } from "@/components/ui/button";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import type { UserRole } from "@/lib/types";
import { isIndividualRole } from "@/lib/user-role";

const roleCopy: Record<UserRole, { title: string; description: string }> = {
  INDIVIDUAL: {
    title: "My listings",
    description: "Manage homes you list and the conversations they attract.",
  },
  BUYER: {
    title: "My listings",
    description: "Manage homes you list and the conversations they attract.",
  },
  HOUSE_OWNER: {
    title: "My listings",
    description: "Manage homes you list and the conversations they attract.",
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
  const isAddProperty = pathname.includes("/add-property");
  const listingsHref = role === "DEALER" ? "/dealer" : "/owner";

  if (isIndividualRole(role) || role === "DEALER") {
    const Gate = role === "DEALER" ? DealerGate : OwnerGate;
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <Gate>
          <div className="border-b border-forest/10 bg-cream/50">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
              <div>
                <p className="type-eyebrow">{copy.title}</p>
                <h1 className="font-serif text-2xl sm:text-3xl">{user?.fullName ?? copy.title}</h1>
              </div>
              {pathname !== "/" && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="shrink-0 gap-2 border-forest/20 bg-white/80 text-forest hover:bg-forest hover:text-ivory"
                >
                  <Link href={isAddProperty ? listingsHref : "/properties?intent=buy"}>
                    <ArrowLeft className="h-4 w-4" />
                    {isAddProperty ? "My listings" : "Marketplace"}
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</div>
        </Gate>
        <WhatsAppFloat />
      </div>
    );
  }

  if (!user || user.role !== role) {
    return (
      <div className="min-h-screen bg-ivory">
        <Navbar />
        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
          <p className="type-eyebrow">Preview access</p>
          <h1 className="mt-3 font-serif text-4xl">{copy.title}</h1>
          <p className="type-subheading">{copy.description}</p>
          <Button className="mt-8" onClick={() => demoUser && loginAs(demoUser)}>
            Continue as {demoUser?.fullName}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Frontend-only mock session. No credentials are stored on a server.
          </p>
        </div>
        <WhatsAppFloat />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />
      <div className="border-b border-forest/10 bg-cream/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="type-eyebrow">{copy.title}</p>
            <h1 className="font-serif text-2xl sm:text-3xl">{user.fullName}</h1>
          </div>
          {pathname !== "/" && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="shrink-0 gap-2 border-forest/20 bg-white/80 text-forest hover:bg-forest hover:text-ivory"
            >
              <Link href="/properties?intent=buy">
                <ArrowLeft className="h-4 w-4" />
                Marketplace
              </Link>
            </Button>
          )}
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</div>
      <WhatsAppFloat />
    </div>
  );
}
