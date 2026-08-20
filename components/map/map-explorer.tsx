"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/properties/filter-bar";
import { PropertyCard } from "@/components/properties/property-card";
import { filtersFromSearchParams, filterProperties } from "@/lib/api/properties";
import { useMockStore } from "@/lib/mock-store";
import type { MapBounds } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas").then((mod) => mod.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full min-h-[420px] bg-forest/5" />,
});

export function MapExplorer() {
  const searchParams = useSearchParams();
  const { properties } = useMockStore();
  const [bounds, setBounds] = useState<MapBounds | undefined>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({ ...filtersFromSearchParams(searchParams), bounds }),
    [searchParams, bounds],
  );
  const results = useMemo(() => filterProperties(properties, filters), [properties, filters]);

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] flex-col">
      <div className="border-b border-forest/10 bg-ivory px-4 py-4 sm:px-6">
        <FilterBar resultCount={results.length} />
      </div>
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(320px,38%)_1fr]">
        <ScrollArea className="h-[50vh] border-b border-forest/10 lg:h-[calc(100vh-9.5rem)] lg:border-b-0 lg:border-r">
          <div className="space-y-px bg-cream/40 p-3">
            {results.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                layout="list"
                onHover={setHoveredId}
              />
            ))}
            {results.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No residences in this frame. Search this area or clear filters.
              </p>
            )}
          </div>
        </ScrollArea>
        <div className="h-[50vh] lg:h-[calc(100vh-9.5rem)]">
          <MapCanvas properties={results} hoveredId={hoveredId} onBoundsSearch={setBounds} />
        </div>
      </div>
    </div>
  );
}
