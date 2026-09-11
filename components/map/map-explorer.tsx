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
import { cn } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/map/map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-cream/60">
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"list" | "map">("list");

  const barFilters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const filters = useMemo(() => ({ ...barFilters, bounds }), [barFilters, bounds]);
  const results = useMemo(() => filterProperties(properties, filters), [properties, filters]);

  function resetBounds() {
    setBounds(undefined);
  }

  function resetAll() {
    setBounds(undefined);
    setSelectedId(null);
    router.push("/map");
  }

  const listPanel = (
    <ScrollArea className="h-full min-h-0">
      <div className="space-y-2 bg-cream/40 p-2">
        {bounds && (
          <div className="mb-1 flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
            <span>Showing properties in the map frame</span>
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
            highlighted={property.id === selectedId}
            onHover={setHoveredId}
            onSelect={(id) => {
              setFocusId(id);
              setSelectedId(id);
              setFocusKey((key) => key + 1);
              setMobilePanel("map");
            }}
          />
        ))}
        {results.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No properties in this frame.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={resetAll}>
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col">
      <div className="border-b border-forest/10 bg-ivory px-4 py-4 sm:px-6">
        <FilterBar resultCount={results.length} />
      </div>

      <div className="flex border-b border-forest/10 bg-ivory px-4 py-2 lg:hidden">
        <div className="grid w-full grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMobilePanel("list")}
            className={cn(
              "rounded-full px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors",
              mobilePanel === "list" ? "bg-forest text-ivory" : "bg-cream text-forest",
            )}
          >
            List ({results.length})
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel("map")}
            className={cn(
              "rounded-full px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors",
              mobilePanel === "map" ? "bg-forest text-ivory" : "bg-cream text-forest",
            )}
          >
            Map
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr]">
        <div
          className={cn(
            "min-h-0 border-b border-forest/10 lg:block lg:h-[calc(100dvh-9rem)] lg:border-b-0 lg:border-r",
            mobilePanel === "list" ? "flex h-[calc(100dvh-11rem)] flex-col" : "hidden",
          )}
        >
          {listPanel}
        </div>
        <div
          className={cn(
            "min-h-0 lg:block lg:h-[calc(100dvh-9rem)]",
            mobilePanel === "map" ? "block h-[calc(100dvh-11rem)]" : "hidden lg:block",
          )}
        >
          <MapView
            properties={results}
            hoveredId={hoveredId}
            focusId={focusId}
            focusKey={focusKey}
            selectedId={selectedId}
            onSelectedChange={(id) => {
              setSelectedId(id);
              if (id === null) setFocusId(null);
            }}
            boundsActive={Boolean(bounds)}
            onBoundsSearch={setBounds}
            onResetBounds={resetAll}
          />
        </div>
      </div>
    </div>
  );
}
