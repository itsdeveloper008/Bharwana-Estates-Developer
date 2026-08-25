"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, List, Map as MapIcon, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AREA_UNITS,
  CURRENCIES,
  fromScaledAmount,
  PillToggleGroup,
  PropertyTypePicker,
  PURPOSE_OPTIONS,
  RangeFilterPopover,
  SOURCE_OPTIONS,
  rangeTriggerLabel,
  toScaledAmount,
  type AreaUnitId,
  type CurrencyId,
  type PurposeId,
  type SourceId,
} from "@/components/properties/property-filter-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CITIES, type PropertyCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

function readCategory(raw: string | null): PropertyCategory {
  if (raw === "PLOTS" || raw === "COMMERCIAL" || raw === "HOME") return raw;
  return "HOME";
}

function FiltersForm({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const intent = searchParams.get("intent");
  const purpose: PurposeId = intent === "rental" || intent === "rent" ? "rent" : "buy";
  const listingType = searchParams.get("listingType");
  const source: SourceId =
    listingType === "DIRECT_OWNER" ? "owner" : listingType === "BUSINESS" ? "dealer" : "ALL";
  const category = readCategory(searchParams.get("category"));
  const subtype = (searchParams.get("subtype") as string | "ALL") || "ALL";
  const beds = searchParams.get("beds") ?? "ALL";
  const city = searchParams.get("city") ?? "ALL";
  const query = searchParams.get("q") ?? "";

  const [areaUnit, setAreaUnit] = useState<AreaUnitId>("sqft");
  const [currency, setCurrency] = useState<CurrencyId>("PKR");

  const areaUnitMeta = AREA_UNITS.find((item) => item.id === areaUnit) ?? AREA_UNITS[0];
  const currencyMeta = CURRENCIES.find((item) => item.id === currency) ?? CURRENCIES[0];

  const areaMin = useMemo(() => {
    const raw = searchParams.get("minArea");
    if (!raw) return "0";
    return fromScaledAmount(Number(raw), areaUnitMeta.toSqft) || "0";
  }, [searchParams, areaUnitMeta.toSqft]);

  const areaMax = useMemo(() => {
    const raw = searchParams.get("maxArea");
    if (!raw) return "";
    return fromScaledAmount(Number(raw), areaUnitMeta.toSqft);
  }, [searchParams, areaUnitMeta.toSqft]);

  const priceMin = useMemo(() => {
    const raw = searchParams.get("minPrice");
    if (!raw) return "0";
    return fromScaledAmount(Number(raw), currencyMeta.toPkr) || "0";
  }, [searchParams, currencyMeta.toPkr]);

  const priceMax = useMemo(() => {
    const raw = searchParams.get("maxPrice");
    if (!raw) return "";
    return fromScaledAmount(Number(raw), currencyMeta.toPkr);
  }, [searchParams, currencyMeta.toPkr]);

  function patch(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "ALL") params.delete(key);
      else params.set(key, value);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillToggleGroup
          options={PURPOSE_OPTIONS}
          value={purpose}
          onChange={(id) => patch({ intent: id === "rent" ? "rental" : "buy" })}
        />
        <PillToggleGroup
          options={SOURCE_OPTIONS}
          value={source}
          allowDeselect
          onChange={(id) => {
            if (id === "ALL") patch({ listingType: null });
            else {
              const match = SOURCE_OPTIONS.find((item) => item.id === id);
              patch({ listingType: match?.listingType ?? null });
            }
          }}
        />
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-forest/10 bg-white",
          compact ? "shadow-sm" : "",
        )}
      >
        <div className="grid gap-0 border-b border-forest/10 lg:grid-cols-[0.9fr_1.4fr_0.9fr]">
          <div className="flex items-center gap-2 border-b border-forest/10 px-3 py-2 lg:border-b-0 lg:border-r">
            <MapPin className="h-4 w-4 shrink-0 text-forest" />
            <Select value={city} onValueChange={(value) => patch({ city: value })}>
              <SelectTrigger className="h-10 border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Pakistan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Pakistan</SelectItem>
                {CITIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 border-b border-forest/10 px-3 py-2 lg:border-b-0 lg:border-r">
            <Search className="h-4 w-4 shrink-0 text-forest/50" />
            <Input
              defaultValue={query}
              key={query}
              placeholder="Search by location"
              className="h-10 border-0 bg-transparent shadow-none focus-visible:ring-0"
              onBlur={(event) => patch({ q: event.target.value.trim() || null })}
              onKeyDown={(event) => {
                if (event.key === "Enter") patch({ q: event.currentTarget.value.trim() || null });
              }}
            />
          </div>
          <div className="px-3 py-1.5">
            <PropertyTypePicker
              category={category}
              subtype={subtype}
              align="end"
              triggerClassName="px-1"
              onChange={(next) => {
                patch({
                  category: next.category,
                  subtype: next.subtype === "ALL" ? null : next.subtype,
                  beds: next.category === "PLOTS" ? null : beds === "ALL" ? null : beds,
                });
              }}
            />
          </div>
        </div>

        <div className={cn("grid gap-3 p-3", compact ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1")}>
          <RangeFilterPopover
            title={`Area (${areaUnitMeta.label})`}
            changeLabel="Change Area Unit"
            onChangeMeta={() => {
              const index = AREA_UNITS.findIndex((item) => item.id === areaUnit);
              setAreaUnit(AREA_UNITS[(index + 1) % AREA_UNITS.length]!.id);
            }}
            triggerLabel={rangeTriggerLabel("Area", areaUnitMeta.label, areaMin, areaMax)}
            min={areaMin}
            max={areaMax}
            accentBorder
            onApply={(min, max) => {
              const minSqft = toScaledAmount(min, areaUnitMeta.toSqft);
              const maxSqft = toScaledAmount(max, areaUnitMeta.toSqft);
              patch({
                minArea: minSqft ? String(minSqft) : null,
                maxArea: maxSqft ? String(maxSqft) : null,
              });
            }}
            onReset={() => patch({ minArea: null, maxArea: null })}
          />
          <Select
            value={beds}
            disabled={category === "PLOTS"}
            onValueChange={(value) => patch({ beds: value })}
          >
            <SelectTrigger className="h-11 bg-white disabled:opacity-50">
              <SelectValue placeholder="Beds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Beds</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}+ beds
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RangeFilterPopover
            title={`Price (${currencyMeta.label})`}
            changeLabel="Change Currency"
            onChangeMeta={() => {
              const index = CURRENCIES.findIndex((item) => item.id === currency);
              setCurrency(CURRENCIES[(index + 1) % CURRENCIES.length]!.id);
            }}
            triggerLabel={rangeTriggerLabel("Price", currencyMeta.label, priceMin, priceMax)}
            min={priceMin}
            max={priceMax}
            onApply={(min, max) => {
              const minPkr = toScaledAmount(min, currencyMeta.toPkr);
              const maxPkr = toScaledAmount(max, currencyMeta.toPkr);
              patch({
                minPrice: minPkr ? String(minPkr) : null,
                maxPrice: maxPkr ? String(maxPkr) : null,
              });
            }}
            onReset={() => patch({ minPrice: null, maxPrice: null })}
          />
          {compact ? null : (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => router.replace(pathname)}
            >
              Clear all
            </Button>
          )}
        </div>
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
          {typeof resultCount === "number" ? `${resultCount} properties` : "Filter the collection"}
        </p>
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full overflow-y-auto bg-ivory sm:max-w-md">
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
