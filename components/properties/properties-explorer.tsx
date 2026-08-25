"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/properties/filter-bar";
import { PropertyCard } from "@/components/properties/property-card";
import { filtersFromSearchParams, filterProperties } from "@/lib/api/properties";
import { useMockStore } from "@/lib/mock-store";
import { cn } from "@/lib/utils";

export function PropertiesExplorer() {
  const searchParams = useSearchParams();
  const { properties } = useMockStore();
  const view = searchParams.get("view") === "list" ? "list" : "grid";
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const results = useMemo(() => filterProperties(properties, filters), [properties, filters]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">The collection</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Properties</h1>
      </div>
      <FilterBar resultCount={results.length} />
      <div
        className={cn(
          "mt-8",
          view === "grid" ? "grid gap-8 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4",
        )}
      >
        {results.map((property) => (
          <PropertyCard key={property.id} property={property} layout={view} />
        ))}
      </div>
      {results.length === 0 && (
        <p className="py-20 text-center text-muted-foreground">No homes match these filters.</p>
      )}
    </div>
  );
}
