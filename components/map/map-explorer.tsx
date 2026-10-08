"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/properties/filter-bar";
import { PropertyCard } from "@/components/properties/property-card";
import { filtersFromSearchParams, filterProperties } from "@/lib/api/properties";
import { preloadGoogleMaps } from "@/lib/map";
import { useMockStore } from "@/lib/mock-store";
import type { MapBounds } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Kick off Maps API + MapView chunk immediately (parallel with hydration).
if (typeof window !== "undefined") {
  void preloadGoogleMaps();
  void import("@/components/map/map-view");
}

const MapView = dynamic(() => import("@/components/map/map-view").then((mod) => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-0 items-center justify-center bg-cream/60">
      <div className="h-8 w-8 animate-pulse rounded-full border-2 border-forest/20 border-t-gold" />
    </div>
  ),
});

function readHeaderHeightPx() {
  if (typeof window === "undefined") return 96;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--site-header-height").trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 96;
}

export function MapExplorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { properties } = useMockStore();
  const [bounds, setBounds] = useState<MapBounds | undefined>();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stuck, setStuck] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void preloadGoogleMaps();
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const headerPx = readHeaderHeightPx();
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStuck(!entry?.isIntersecting);
      },
      {
        root: null,
        threshold: 0,
        // Treat the sticky top edge (under the header) as the fold line.
        rootMargin: `-${headerPx}px 0px 0px 0px`,
      },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const barFilters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const filters = useMemo(() => ({ ...barFilters, bounds }), [barFilters, bounds]);
  const results = useMemo(() => filterProperties(properties, filters), [properties, filters]);

  function resetBounds() {
    setBounds(undefined);
  }

  function resetAll() {
    setBounds(undefined);
    setSelectedId(null);
    router.push("/map?intent=buy");
  }

  const onListWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!stuck) return;
      const el = listRef.current;
      if (!el) return;
      // At top of list, hand scroll back to the page so filters can return.
      if (event.deltaY < 0 && el.scrollTop <= 0) {
        event.preventDefault();
        window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
      }
    },
    [stuck],
  );

  return (
    <div className="bg-ivory">
      <div className="border-b border-forest/10 bg-ivory px-4 py-4 sm:px-6">
        <FilterBar resultCount={results.length} showViewToggle={false} />
      </div>

      {/* 1px sentinel just above the sticky list+map block */}
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      <div
        className={cn(
          "sticky z-20 grid min-h-0 bg-ivory",
          "top-[var(--site-header-height)]",
          "h-[calc(100dvh-var(--site-header-height))]",
          "grid-cols-1 grid-rows-[45dvh_minmax(0,1fr)]",
          "lg:grid-cols-[260px_1fr] lg:grid-rows-1 xl:grid-cols-[280px_1fr]",
        )}
      >
        {/* List — left on desktop, under map on mobile */}
        <div
          className={cn(
            "order-2 flex min-h-0 flex-col border-forest/10 lg:order-1 lg:border-r",
            "border-t lg:border-t-0",
          )}
        >
          <div
            ref={listRef}
            onWheel={onListWheel}
            className={cn(
              "min-h-0 flex-1 bg-cream/40",
              stuck ? "overflow-y-auto overscroll-contain" : "overflow-y-hidden",
            )}
          >
            <div className="space-y-2 p-2">
              {bounds && (
                <div className="mb-1 flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                  <span>Showing properties in the map frame</span>
                  <button
                    type="button"
                    className="text-forest underline-offset-2 hover:underline"
                    onClick={resetBounds}
                  >
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
          </div>
        </div>

        {/* Map — right on desktop, top sticky strip on mobile */}
        <div className="relative order-1 min-h-0 w-full lg:order-2">
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
            gestureHandling={stuck ? "greedy" : "cooperative"}
          />
        </div>
      </div>
    </div>
  );
}
