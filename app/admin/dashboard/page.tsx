"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ClipboardCheck, Handshake, MessageSquare, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { developers } from "@/lib/mock-data/developers";
import { useMockStore } from "@/lib/mock-store";
import { useTeamStore } from "@/lib/team-store";

export default function AdminDashboardPage() {
  const { properties, inquiries, usingFirestoreInquiries } = useMockStore();
  const { members, usingFirestore: teamOnFirestore, seedFirestore } = useTeamStore();
  const [seeding, setSeeding] = useState(false);
  const firebaseReady = isFirebaseConfigured();

  const activeInquiries = inquiries.filter(
    (inquiry) => !["CLOSED_WON", "CLOSED_LOST"].includes(inquiry.status),
  ).length;
  const pendingSubmissions = properties.filter((property) => property.status === "PENDING_APPROVAL").length;

  const stats = [
    {
      label: "Pending Submissions",
      value: pendingSubmissions,
      href: "/admin/submissions",
      icon: ClipboardCheck,
    },
    {
      label: "Total Properties",
      value: properties.length,
      href: "/admin/properties",
      icon: Building2,
    },
    {
      label: "Active Inquiries",
      value: activeInquiries,
      href: "/admin/inquiries",
      icon: MessageSquare,
    },
    {
      label: "Team Members",
      value: members.length,
      href: "/admin/team",
      icon: UsersRound,
    },
    {
      label: "Dealers",
      value: developers.length,
      href: "/admin/developers",
      icon: Handshake,
    },
  ];

  async function handleSeedTeam() {
    setSeeding(true);
    try {
      await seedFirestore();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Overview</p>
      <h1 className="font-serif text-3xl">Dashboard</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        {firebaseReady
          ? `Firebase connected. Inquiries ${usingFirestoreInquiries ? "live on" : "local (fallback)"} Firestore · Team ${
              teamOnFirestore ? "on" : "off"
            } Firestore · Properties remain mock.`
          : "Firebase env not set — inquiries fall back to local mock until keys are added."}
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="border border-forest/10 bg-card p-5 transition-colors hover:border-gold/40"
          >
            <stat.icon className="h-5 w-5 text-gold" />
            <p className="mt-4 font-serif text-3xl text-forest">{stat.value}</p>
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
            <Link href="/admin/team">Manage team</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/submissions">Verification queue</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/inquiries">Inquiries</Link>
          </Button>
          <Button variant="secondary" disabled={!firebaseReady || seeding} onClick={() => void handleSeedTeam()}>
            {seeding ? "Seeding…" : "Seed team to Firestore"}
          </Button>
        </div>
      </div>
    </div>
  );
}
