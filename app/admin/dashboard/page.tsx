"use client";

import Link from "next/link";
import { Building2, ClipboardCheck, Handshake, MessageSquare, Percent, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPriceFull } from "@/lib/format";
import { sumCommission, useMockStore } from "@/lib/mock-store";
import { useTeamStore } from "@/lib/team-store";

export default function AdminDashboardPage() {
  const { properties, inquiries, developers, transactions } = useMockStore();
  const { members } = useTeamStore();

  const activeInquiries = inquiries.filter(
    (inquiry) => !["CLOSED_WON", "CLOSED_LOST"].includes(inquiry.status),
  ).length;
  const pendingSubmissions = properties.filter((property) => property.status === "PENDING_APPROVAL").length;
  const outstandingCommission = sumCommission(transactions, ["PENDING", "INVOICED"]);

  const stats = [
    {
      label: "Pending Submissions",
      href: "/admin/submissions",
      icon: ClipboardCheck,
      display: String(pendingSubmissions),
    },
    {
      label: "Total Properties",
      href: "/admin/properties",
      icon: Building2,
      display: String(properties.length),
    },
    {
      label: "Active Inquiries",
      href: "/admin/inquiries",
      icon: MessageSquare,
      display: String(activeInquiries),
    },
    {
      label: "Commission Outstanding",
      href: "/admin/commissions",
      icon: Percent,
      display: formatPriceFull(outstandingCommission),
    },
    {
      label: "Team Members",
      href: "/admin/team",
      icon: UsersRound,
      display: String(members.length),
    },
    {
      label: "Dealers",
      href: "/admin/developers",
      icon: Handshake,
      display: String(developers.length),
    },
  ];

  return (
    <div>
      <p className="type-eyebrow">Overview</p>
      <h1 className="font-serif text-3xl">Dashboard</h1>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="border border-forest/10 bg-card p-5 transition-colors hover:border-gold/40"
          >
            <stat.icon className="h-5 w-5 text-gold" />
            <p className="mt-4 font-serif text-2xl text-forest sm:text-3xl">{stat.display}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-12 border border-forest/10 bg-cream/40 p-6">
        <h2 className="font-serif text-xl">Quick actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/admin/properties/add">Add property</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/team">Manage team</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/submissions">Verification queue</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/commissions">Commission report</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/inquiries">Inquiries</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
