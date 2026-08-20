"use client";

import { PropertyDetail } from "@/components/properties/property-detail";
import { useMockStore } from "@/lib/mock-store";
import type { Property } from "@/lib/types";

export function PropertyDetailGate({
  id,
  initial,
}: {
  id: string;
  initial?: Property;
}) {
  const { properties } = useMockStore();
  const property = properties.find((item) => item.id === id) ?? initial;

  if (!property) {
    return (
      <div className="px-6 py-24 text-center">
        <h1 className="font-serif text-4xl">This residence is not on the floor</h1>
        <p className="mt-3 text-sm text-muted-foreground">It may be a draft, or the identifier is unknown.</p>
      </div>
    );
  }

  return <PropertyDetail property={property} />;
}
