"use client";

import { PropertyCard } from "@/components/properties/property-card";
import { useMockStore } from "@/lib/mock-store";

export function FeaturedGrid() {
  const { properties } = useMockStore();
  const featured = properties.filter((property) => property.status === "PUBLISHED").slice(0, 6);

  return (
    <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
      {featured.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
