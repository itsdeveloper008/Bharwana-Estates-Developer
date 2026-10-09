"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/properties/filter-bar";
import { PropertyCard } from "@/components/properties/property-card";
import { Button } from "@/components/ui/button";
import { filtersFromSearchParams, filterProperties } from "@/lib/api/properties";
import { useMockStore } from "@/lib/mock-store";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 15;

export function PropertiesExplorer() {
  const searchParams = useSearchParams();
  const { properties, propertiesLoading, propertiesError } = useMockStore();
  const view = searchParams.get("view") === "list" ? "list" : "grid";
  const filters = useMemo(() => filtersFromSearchParams(searchParams), [searchParams]);
  const results = useMemo(() => filterProperties(properties, filters), [properties, filters]);
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const filterKey = searchParams.toString();

  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, currentPage]);

  function goToPage(next: number) {
    const clamped = Math.min(Math.max(1, next), totalPages);
    setPage(clamped);
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Don't block the whole page when we already have listings from a live snapshot.
  if (propertiesLoading && results.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">Loading the collection…</p>
      </div>
    );
  }

  if (propertiesError && results.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="text-sm text-destructive" role="alert">
          {propertiesError}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Refresh the page or try again in a moment.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="type-eyebrow">The collection</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Properties</h1>
      </div>
      <FilterBar resultCount={results.length} />
      {results.length === 0 ? (
        <div className="mt-8 border border-dashed border-forest/15 bg-cream/40 px-6 py-16 text-center">
          <p className="font-serif text-2xl text-forest">
            {properties.length === 0 ? "No listings yet" : "No homes match these filters"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {properties.length === 0
              ? "Published residences will appear here once they are live on Bharwana."
              : "Try clearing filters to see the full collection."}
          </p>
        </div>
      ) : (
        <>
          <div
            ref={gridRef}
            className={cn(
              "mt-8 scroll-mt-24",
              view === "grid" ? "grid gap-8 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-4",
            )}
          >
            {pageItems.map((property) => (
              <PropertyCard key={property.id} property={property} layout={view} />
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {currentPage > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="rounded-full px-6"
                  onClick={() => goToPage(currentPage - 1)}
                >
                  Previous
                </Button>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              {currentPage < totalPages ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="rounded-full px-6"
                  onClick={() => goToPage(currentPage + 1)}
                >
                  Next
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
