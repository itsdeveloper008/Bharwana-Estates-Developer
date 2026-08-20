"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { formatDate, formatPrice, statusLabel } from "@/lib/format";

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
          <Link
            key={property.id}
            href={`/property/${property.id}`}
            className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-forest">{property.title}</p>
              <p className="text-sm text-muted-foreground">
                {property.city} · {formatPrice(property.price)}
              </p>
            </div>
            <Badge variant="outline">{statusLabel(property.status)}</Badge>
          </Link>
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
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-forest">{property?.title ?? inquiry.propertyId}</p>
                  <Badge variant="outline">{inquiry.status.replace("_", " ")}</Badge>
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
