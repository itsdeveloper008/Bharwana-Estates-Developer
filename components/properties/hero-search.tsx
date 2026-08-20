"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITIES } from "@/lib/types";

export function HeroSearch() {
  const router = useRouter();
  const [city, setCity] = useState("ALL");
  const [listingType, setListingType] = useState("ALL");
  const [maxPrice, setMaxPrice] = useState("ALL");
  const [query, setQuery] = useState("");

  function search() {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city !== "ALL") params.set("city", city);
    if (listingType !== "ALL") params.set("listingType", listingType);
    if (maxPrice !== "ALL") params.set("maxPrice", maxPrice);
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full max-w-4xl bg-ivory/95 p-4 shadow-lift sm:p-5">
      <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Neighbourhood or title"
          className="h-11 bg-white"
          onKeyDown={(event) => event.key === "Enter" && search()}
        />
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger className="h-11 bg-white">
            <SelectValue placeholder="City" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any city</SelectItem>
            {CITIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={listingType} onValueChange={setListingType}>
          <SelectTrigger className="h-11 bg-white">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any origin</SelectItem>
            <SelectItem value="DIRECT_OWNER">Direct owner</SelectItem>
            <SelectItem value="BUSINESS">Developer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={maxPrice} onValueChange={setMaxPrice}>
          <SelectTrigger className="h-11 bg-white">
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Any price</SelectItem>
            <SelectItem value="50000000">Up to 5 Cr</SelectItem>
            <SelectItem value="100000000">Up to 10 Cr</SelectItem>
            <SelectItem value="200000000">Up to 20 Cr</SelectItem>
          </SelectContent>
        </Select>
        <Button className="h-11 px-6" onClick={search}>
          Search
        </Button>
      </div>
    </div>
  );
}
