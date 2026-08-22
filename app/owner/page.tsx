"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { formatDate, formatPrice, inquiryChannelLabel, statusLabel } from "@/lib/format";
import type { PropertyStatus } from "@/lib/types";

function statusBadgeVariant(status: PropertyStatus) {
  if (status === "PENDING_APPROVAL") return "pending" as const;
  if (status === "REJECTED") return "rejected" as const;
  if (status === "PUBLISHED") return "verified" as const;
  return "outline" as const;
}

export default function OwnerPage() {
  const { user } = useMockAuth();
  const { properties, inquiries } = useMockStore();
  if (!user) return null;

  const mine = properties.filter((property) => property.ownerUserId === user.id);
  const mineIds = mine.map((property) => property.id);
  const myInquiries = inquiries.filter((inquiry) => mineIds.includes(inquiry.propertyId));

  return (
    <div className="space-y-12">
      <section className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">My properties</p>
          <h2 className="font-serif text-3xl">Listings</h2>
        </div>
        <Button asChild>
          <Link href="/owner/add-property">Add property</Link>
        </Button>
      </section>
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
                {property.status === "REJECTED" && property.rejectionReason ? (
                  <p className="mt-2 text-sm text-destructive">Reason: {property.rejectionReason}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(property.status)}>{statusLabel(property.status)}</Badge>
              {property.status === "PUBLISHED" || property.status === "RESERVED" ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/property/${property.id}`}>View</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
        {mine.length === 0 && (
          <p className="py-8 text-sm text-muted-foreground">No listings yet. Add a residence to begin.</p>
        )}
      </div>

      <section>
        <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">My inquiries</p>
        <h2 className="font-serif text-3xl">Conversations</h2>
        <div className="mt-6 divide-y divide-forest/10 border-y border-forest/10">
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
            <p className="py-8 text-sm text-muted-foreground">No inquiries on your homes yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
