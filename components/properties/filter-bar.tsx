"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CITIES } from "@/lib/types";
import type { ListingType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function parseFilters(searchParams: URLSearchParams) {
  const listingType = searchParams.get("listingType");
  return {
    query: searchParams.get("q") ?? "",
    city: searchParams.get("city") ?? "",
    listingType: (listingType as ListingType | "ALL" | "") || "",
    minPrice: searchParams.get("minPrice") ?? "",
    maxPrice: searchParams.get("maxPrice") ?? "",
    bedrooms: searchParams.get("beds") ?? "",
    bathrooms: searchParams.get("baths") ?? "",
    view: searchParams.get("view") ?? "grid",
  };
}

function FiltersForm({
  compact,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = parseFilters(searchParams);

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "ALL") params.delete(key);
    else params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-2 lg:grid-cols-6" : "grid-cols-1")}>
      <div className={cn(compact && "col-span-2")}>
        <Label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Search</Label>
        <Input
          defaultValue={current.query}
          placeholder="Title, street, neighbourhood"
          className="mt-1.5 bg-white"
          onBlur={(event) => update("q", event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") update("q", event.currentTarget.value);
          }}
        />
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">City</Label>
        <Select value={current.city || "ALL"} onValueChange={(value) => update("city", value)}>
          <SelectTrigger className="mt-1.5 bg-white">
            <SelectValue placeholder="Any city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any city</SelectItem>
            {CITIES.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Origin</Label>
        <Select value={current.listingType || "ALL"} onValueChange={(value) => update("listingType", value)}>
          <SelectTrigger className="mt-1.5 bg-white">
            <SelectValue placeholder="Any origin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any origin</SelectItem>
            <SelectItem value="DIRECT_OWNER">Direct from owner</SelectItem>
            <SelectItem value="BUSINESS">Dealer verified</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Beds</Label>
        <Select value={current.bedrooms || "ALL"} onValueChange={(value) => update("beds", value)}>
          <SelectTrigger className="mt-1.5 bg-white">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any</SelectItem>
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}+
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Max price (Cr)</Label>
        <Select value={current.maxPrice || "ALL"} onValueChange={(value) => update("maxPrice", value)}>
          <SelectTrigger className="mt-1.5 bg-white">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any</SelectItem>
            <SelectItem value="50000000">5 Cr</SelectItem>
            <SelectItem value="100000000">10 Cr</SelectItem>
            <SelectItem value="200000000">20 Cr</SelectItem>
            <SelectItem value="300000000">30 Cr</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function FilterBar({
  resultCount,
  showViewToggle = true,
}: {
  resultCount?: number;
  showViewToggle?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? (pathname === "/map" ? "map" : "grid");
  const [open, setOpen] = useState(false);

  function setView(next: string) {
    if (next === "map") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("view");
      router.push(`/map?${params.toString()}`);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="hidden lg:block">
        <FiltersForm compact />
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {typeof resultCount === "number" ? `${resultCount} residences` : "Filter the collection"}
        </p>
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-ivory">
              <SheetHeader>
                <SheetTitle className="font-serif">Refine</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FiltersForm />
              </div>
            </SheetContent>
          </Sheet>
          {showViewToggle && (
            <div className="flex rounded-md border border-forest/15 p-0.5">
              <Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" onClick={() => setView("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button variant={view === "list" ? "secondary" : "ghost"} size="icon" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
              <Button variant={pathname === "/map" ? "secondary" : "ghost"} size="icon" onClick={() => setView("map")}>
                <MapIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
