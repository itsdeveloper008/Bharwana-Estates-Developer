"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Home, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import {
  AREA_UNITS,
  CURRENCIES,
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
import { CITIES, type PropertyCategory } from "@/lib/types";

const CITY_CARDS = [
  { city: "Lahore", hint: "Canal & Model Town" },
  { city: "Islamabad", hint: "F-sectors & Bahria" },
  { city: "Karachi", hint: "DHA & Clifton" },
  { city: "Multan", hint: "Quiet family streets" },
] as const;

const TRUST = [
  { icon: ShieldCheck, label: "Verified listings" },
  { icon: CheckCircle2, label: "Trusted counsel" },
  { icon: Home, label: "Direct & Dealer" },
  { icon: Sparkles, label: "Quiet process" },
] as const;

export function HeroSearch() {
  const router = useRouter();
  const [purpose, setPurpose] = useState<PurposeId>("buy");
  const [source, setSource] = useState<SourceId>("ALL");
  const [city, setCity] = useState("ALL");
  const [listingType, setListingType] = useState("ALL");
  const [category, setCategory] = useState<PropertyCategory>("HOME");
  const [subtype, setSubtype] = useState<string | "ALL">("ALL");
  const [areaUnit, setAreaUnit] = useState<AreaUnitId>("sqft");
  const [areaMin, setAreaMin] = useState("0");
  const [areaMax, setAreaMax] = useState("");
  const [currency, setCurrency] = useState<CurrencyId>("PKR");
  const [priceMin, setPriceMin] = useState("0");
  const [priceMax, setPriceMax] = useState("");
  const [beds, setBeds] = useState("ALL");
  const [query, setQuery] = useState("");

  const areaUnitMeta = AREA_UNITS.find((item) => item.id === areaUnit) ?? AREA_UNITS[0];
  const currencyMeta = CURRENCIES.find((item) => item.id === currency) ?? CURRENCIES[0];

  function onSource(next: string) {
    const id = next as SourceId;
    setSource(id);
    const match = SOURCE_OPTIONS.find((item) => item.id === id);
    setListingType(match?.listingType ?? "ALL");
  }

  function search() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city !== "ALL") params.set("city", city);
    if (listingType !== "ALL") params.set("listingType", listingType);
    params.set("category", category);
    if (subtype !== "ALL") params.set("subtype", subtype);
    const minAreaSqft = toScaledAmount(areaMin, areaUnitMeta.toSqft);
    const maxAreaSqft = toScaledAmount(areaMax, areaUnitMeta.toSqft);
    if (minAreaSqft) params.set("minArea", String(minAreaSqft));
    if (maxAreaSqft) params.set("maxArea", String(maxAreaSqft));
    if (beds !== "ALL" && category !== "PLOTS") params.set("beds", beds);
    const minPricePkr = toScaledAmount(priceMin, currencyMeta.toPkr);
    const maxPricePkr = toScaledAmount(priceMax, currencyMeta.toPkr);
    if (minPricePkr) params.set("minPrice", String(minPricePkr));
    if (maxPricePkr) params.set("maxPrice", String(maxPricePkr));
    params.set("intent", purpose === "rent" ? "rental" : "buy");
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mx-auto mb-6 flex w-full max-w-2xl flex-wrap items-center justify-center gap-3 sm:gap-4">
        <PillToggleGroup
          options={PURPOSE_OPTIONS}
          value={purpose}
          onChange={(id) => setPurpose(id as PurposeId)}
        />
        <PillToggleGroup options={SOURCE_OPTIONS} value={source} onChange={onSource} allowDeselect />
      </div>

      <div className="overflow-hidden rounded-3xl bg-ivory shadow-lift">
        <div className="grid gap-0 border-b border-forest/10 lg:grid-cols-[0.9fr_1.4fr_0.9fr]">
          <div className="flex items-center gap-2 border-b border-forest/10 px-4 py-3 lg:border-b-0 lg:border-r">
            <MapPin className="h-4 w-4 shrink-0 text-forest" />
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-11 border-0 bg-transparent shadow-none focus:ring-0">
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
          <div className="flex items-center gap-2 border-b border-forest/10 px-4 py-3 lg:border-b-0 lg:border-r">
            <Search className="h-4 w-4 shrink-0 text-forest/50" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by location"
              className="h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
              onKeyDown={(event) => event.key === "Enter" && search()}
            />
          </div>
          <div className="px-4 py-2.5">
            <PropertyTypePicker
              category={category}
              subtype={subtype}
              onChange={(next) => {
                setCategory(next.category);
                setSubtype(next.subtype);
                if (next.category === "PLOTS") setBeds("ALL");
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
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
              setAreaMin(min.trim() === "" ? "0" : min);
              setAreaMax(max.trim());
            }}
            onReset={() => {
              setAreaMin("0");
              setAreaMax("");
            }}
          />
          <Select value={beds} onValueChange={setBeds} disabled={category === "PLOTS"}>
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
              setPriceMin(min.trim() === "" ? "0" : min);
              setPriceMax(max.trim());
            }}
            onReset={() => {
              setPriceMin("0");
              setPriceMax("");
            }}
          />
          <Button className="h-11 bg-forest px-8 text-ivory hover:bg-forest-800" onClick={search}>
            Search
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CITY_CARDS.map((item) => (
          <Link
            key={item.city}
            href={`/properties?city=${encodeURIComponent(item.city)}`}
            className="group flex items-center gap-3 rounded-2xl border border-white/30 bg-white/20 px-4 py-3 text-left backdrop-blur-md transition hover:bg-white/30"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-ivory">
              <Home className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-ivory">Properties in {item.city}</span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-ivory/70 group-hover:text-gold">
                Explore now <ArrowRight className="h-3 w-3" />
              </span>
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-5 text-center text-xs tracking-[0.14em] text-ivory/70">
        Property in all top cities of Pakistan
        <span className="mx-auto mt-2 block h-0.5 w-10 bg-gold" />
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-forest/50 px-4 py-4 backdrop-blur-sm sm:grid-cols-4">
        {TRUST.map((item) => (
          <div key={item.label} className="flex items-center justify-center gap-2 text-xs text-ivory/90 sm:text-sm">
            <item.icon className="h-4 w-4 text-gold" />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
