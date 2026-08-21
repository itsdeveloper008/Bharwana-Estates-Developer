"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/properties/filter-bar";
import { PropertyCard } from "@/components/properties/property-card";
import { filtersFromSearchParams, filterProperties } from "@/lib/api/properties";
import { useMockStore } from "@/lib/mock-store";
import type { MapBounds } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

const MapView = dynamic(() => import("@/components/map/map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-cream/60">
      <div className="h-8 w-8 animate-pulse rounded-full border-2 border-forest/20 border-t-gold" />
    </div>
  ),
});

export function MapExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { properties } = useMockStore();
  const [bounds, setBounds] = useState<MapBounds | undefined>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);

  const barFilters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const filters = useMemo(() => ({ ...barFilters, bounds }), [barFilters, bounds]);
  const results = useMemo(() => filterProperties(properties, filters), [properties, filters]);

  function resetBounds() {
    setBounds(undefined);
  }

  function resetAll() {
    setBounds(undefined);
    router.push("/map");
  }

  return (
    <div className="flex min-h-[calc(100vh-4.25rem)] flex-col">
      <div className="border-b border-forest/10 bg-ivory px-4 py-4 sm:px-6">
        <FilterBar resultCount={results.length} />
      </div>
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(320px,38%)_1fr]">
        <ScrollArea className="h-[50vh] border-b border-forest/10 lg:h-[calc(100vh-9.5rem)] lg:border-b-0 lg:border-r">
          <div className="space-y-px bg-cream/40 p-3">
            {bounds && (
              <div className="mb-2 flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                <span>Showing residences in the map frame</span>
                <button type="button" className="text-forest underline-offset-2 hover:underline" onClick={resetBounds}>
                  Show all
                </button>
              </div>
            )}
            {results.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                layout="list"
                onHover={setHoveredId}
                onSelect={(id) => {
                  setFocusId(id);
                  setFocusKey((key) => key + 1);
                }}
              />
            ))}
            {results.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No residences in this frame.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={resetAll}>
                  Reset filters
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="h-[50vh] lg:h-[calc(100vh-9.5rem)]">
          <MapView
            properties={results}
            hoveredId={hoveredId}
            focusId={focusId}
            focusKey={focusKey}
            boundsActive={Boolean(bounds)}
            onBoundsSearch={setBounds}
            onResetBounds={resetAll}
          />
        </div>
      </div>
    </div>
  );
}
