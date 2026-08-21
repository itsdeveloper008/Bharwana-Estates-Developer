"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "buy", label: "Buy" },
  { id: "owner", label: "Owner" },
  { id: "developer", label: "Developer" },
  { id: "map", label: "Map", badge: "NEW" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CITY_CARDS = [
  { city: "Lahore", hint: "Canal & Model Town" },
  { city: "Islamabad", hint: "F-sectors & Bahria" },
  { city: "Karachi", hint: "DHA & Clifton" },
  { city: "Multan", hint: "Quiet family streets" },
] as const;

const TRUST = [
  { icon: ShieldCheck, label: "Verified listings" },
  { icon: CheckCircle2, label: "Trusted counsel" },
  { icon: Home, label: "Direct & developer" },
  { icon: Sparkles, label: "Quiet process" },
] as const;

export function HeroSearch() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("buy");
  const [city, setCity] = useState("ALL");
  const [listingType, setListingType] = useState("ALL");
  const [minArea, setMinArea] = useState("ALL");
  const [beds, setBeds] = useState("ALL");
  const [maxPrice, setMaxPrice] = useState("ALL");
  const [query, setQuery] = useState("");

  function listingFromTab(next: TabId) {
    if (next === "owner") return "DIRECT_OWNER";
    if (next === "developer") return "BUSINESS";
    return "ALL";
  }

  function onTab(next: TabId) {
    setTab(next);
    if (next !== "map") setListingType(listingFromTab(next));
  }

  function search() {
    if (tab === "map") {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (city !== "ALL") params.set("city", city);
      router.push(`/map?${params.toString()}`);
      return;
    }

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city !== "ALL") params.set("city", city);
    const type = listingType !== "ALL" ? listingType : listingFromTab(tab);
    if (type !== "ALL") params.set("listingType", type);
    if (minArea !== "ALL") params.set("minArea", minArea);
    if (beds !== "ALL") params.set("beds", beds);
    if (maxPrice !== "ALL") params.set("maxPrice", maxPrice);
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mx-auto mb-5 flex w-fit items-center gap-1 rounded-full bg-ivory/95 p-1 shadow-lift">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTab(item.id)}
            className={cn(
              "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === item.id ? "bg-forest/10 text-forest" : "text-forest/60 hover:text-forest",
            )}
          >
            {item.label}
            {"badge" in item && item.badge ? (
              <span className="ml-1.5 rounded-sm bg-gold px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-forest">
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
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
          <div className="px-4 py-3">
            <Select value={listingType} onValueChange={setListingType}>
              <SelectTrigger className="h-11 border-0 bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="Homes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Homes</SelectItem>
                <SelectItem value="DIRECT_OWNER">Direct owner</SelectItem>
                <SelectItem value="BUSINESS">Developer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Select value={minArea} onValueChange={setMinArea}>
            <SelectTrigger className="h-11 bg-white">
              <SelectValue placeholder="Area (Marla)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Area (Marla)</SelectItem>
              <SelectItem value="1125">5+ Marla</SelectItem>
              <SelectItem value="2250">10+ Marla</SelectItem>
              <SelectItem value="4500">20+ Marla</SelectItem>
              <SelectItem value="9000">2+ Kanal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={beds} onValueChange={setBeds}>
            <SelectTrigger className="h-11 bg-white">
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
          <Select value={maxPrice} onValueChange={setMaxPrice}>
            <SelectTrigger className="h-11 bg-white">
              <SelectValue placeholder="Price (PKR)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Price (PKR)</SelectItem>
              <SelectItem value="50000000">Up to 5 Cr</SelectItem>
              <SelectItem value="100000000">Up to 10 Cr</SelectItem>
              <SelectItem value="200000000">Up to 20 Cr</SelectItem>
              <SelectItem value="300000000">Up to 30 Cr</SelectItem>
            </SelectContent>
          </Select>
          <Button className="h-11 bg-forest px-8 text-ivory hover:bg-forest-800" onClick={search}>
            Search
          </Button>
        </div>

        <Link
          href="/about"
          className="flex items-center justify-between gap-3 bg-forest px-5 py-3 text-left text-sm text-ivory transition-colors hover:bg-forest-800"
        >
          <span>
            <span className="font-medium text-gold">Bharwana</span>
            <span className="mx-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
              New
            </span>
            Private residences and developer stock, presented as a brochure.
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-gold" />
        </Link>
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
