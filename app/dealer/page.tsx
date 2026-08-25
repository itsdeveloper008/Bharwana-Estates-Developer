"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  commissionStatusLabel,
  formatCommissionRate,
  formatDate,
  formatPrice,
  formatPriceFull,
  inquiryChannelLabel,
  statusLabel,
} from "@/lib/format";
import { useMockAuth } from "@/lib/mock-auth";
import { sumCommission, useMockStore } from "@/lib/mock-store";
import type { CommissionStatus, PropertyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "listings" | "leads" | "commission";

function statusBadgeVariant(status: PropertyStatus) {
  if (status === "PENDING_APPROVAL") return "pending" as const;
  if (status === "REJECTED") return "rejected" as const;
  if (status === "PUBLISHED") return "verified" as const;
  return "outline" as const;
}

function commissionBadgeClass(status: CommissionStatus) {
  if (status === "PENDING") return "border-amber-600/30 bg-amber-50 text-amber-900";
  if (status === "INVOICED") return "border-sky-700/25 bg-sky-50 text-sky-900";
  return "border-emerald-700/25 bg-emerald-50 text-emerald-900";
}

function DealerDashboard() {
  const { user } = useMockAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "commission" ? "commission" : "listings";
  const { properties, inquiries, transactions, getDeveloperForUser } = useMockStore();
  const [tab, setTab] = useState<Tab>(initialTab);

  const developer = user ? getDeveloperForUser(user.id) : undefined;
  const mine = useMemo(
    () =>
      properties.filter(
        (property) =>
          property.ownerUserId === user?.id ||
          (developer && property.developerId === developer.id),
      ),
    [properties, user?.id, developer],
  );
  const mineIds = mine.map((property) => property.id);
  const myInquiries = inquiries.filter((inquiry) => mineIds.includes(inquiry.propertyId));
  const myTransactions = useMemo(
    () => (developer ? transactions.filter((tx) => tx.developerId === developer.id) : []),
    [transactions, developer],
  );

  const totalOwed = sumCommission(myTransactions);
  const pendingAmount = sumCommission(myTransactions, ["PENDING"]);
  const invoicedAmount = sumCommission(myTransactions, ["INVOICED"]);
  const paidAmount = sumCommission(myTransactions, ["PAID"]);

  if (!user) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "listings", label: "My Listings" },
    { id: "leads", label: "My Leads" },
    { id: "commission", label: "Commission" },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">Dealer desk</p>
          <h2 className="font-serif text-3xl">{developer?.companyName ?? "Your inventory"}</h2>
          {developer?.status === "PENDING_REVIEW" && (
            <p className="mt-2 text-sm text-amber-800">
              Your dealer account is pending review. Listings will wait until Admin approves your
              agency.
            </p>
          )}
        </div>
        <Button asChild>
          <Link href="/dealer/add-property">Add property</Link>
        </Button>
      </section>

      <div className="flex flex-wrap gap-2 border-b border-forest/10 pb-0">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-3 pb-3 text-xs uppercase tracking-[0.14em] transition-colors duration-200",
              tab === item.id
                ? "border-gold text-forest"
                : "border-transparent text-muted-foreground hover:text-forest",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "listings" && (
        <div className="divide-y divide-forest/10 border-y border-forest/10">
          {mine.map((property) => (
            <div
              key={property.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-4">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden bg-cream">
                  {property.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={property.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-forest">{property.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {property.city} · {formatPrice(property.price)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusBadgeVariant(property.status)}>
                  {statusLabel(property.status)}
                </Badge>
                {property.status === "PUBLISHED" || property.status === "RESERVED" ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/property/${property.id}`}>View</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {mine.length === 0 && (
            <p className="py-8 text-sm text-muted-foreground">No listings yet. Add inventory to begin.</p>
          )}
        </div>
      )}

      {tab === "leads" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Lead volume on your listings (read-only). Sales reps own pipeline management.
          </p>
          <div className="divide-y divide-forest/10 border-y border-forest/10">
            {myInquiries.map((inquiry) => {
              const property = properties.find((item) => item.id === inquiry.propertyId);
              return (
                <div key={inquiry.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-forest">{property?.title ?? inquiry.propertyId}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={inquiry.channel === "PLATFORM_ASSISTED" ? "platform" : "direct"}>
                        {inquiryChannelLabel(inquiry.channel)}
                      </Badge>
                      <Badge variant="outline">{inquiry.status.replace("_", " ")}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{inquiry.notes}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    {formatDate(inquiry.createdAt)}
                  </p>
                </div>
              );
            })}
            {myInquiries.length === 0 && (
              <p className="py-8 text-sm text-muted-foreground">No leads on your listings yet.</p>
            )}
          </div>
        </div>
      )}

      {tab === "commission" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="border border-forest/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Total commission
              </p>
              <p className="mt-2 font-serif text-2xl text-forest">{formatPriceFull(totalOwed)}</p>
            </div>
            <div className="border border-forest/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Pending + invoiced
              </p>
              <p className="mt-2 font-serif text-2xl text-amber-900">
                {formatPriceFull(pendingAmount + invoicedAmount)}
              </p>
            </div>
            <div className="border border-forest/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Paid</p>
              <p className="mt-2 font-serif text-2xl text-emerald-900">{formatPriceFull(paidAmount)}</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Read-only. Commission status is updated by Bharwana Admin.
            {developer
              ? ` Your rate: ${formatCommissionRate(developer.commissionRate)} (future closes).`
              : ""}
          </p>

          <div className="overflow-x-auto border border-forest/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Final sale</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myTransactions.map((tx) => {
                  const property = properties.find((item) => item.id === tx.propertyId);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{property?.title ?? tx.propertyId}</TableCell>
                      <TableCell>{formatPriceFull(tx.finalPrice)}</TableCell>
                      <TableCell>{formatCommissionRate(tx.commissionRate)}</TableCell>
                      <TableCell>{formatPriceFull(tx.commissionAmount)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                            commissionBadgeClass(tx.commissionStatus),
                          )}
                        >
                          {commissionStatusLabel(tx.commissionStatus)}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(tx.closedAt)}</TableCell>
                    </TableRow>
                  );
                })}
                {myTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No closed deals yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DealerDashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <DealerDashboard />
    </Suspense>
  );
}
