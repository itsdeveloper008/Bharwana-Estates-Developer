"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CITIES } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CityCombobox({
  value,
  onChange,
  className,
  hasError,
}: {
  value: string;
  onChange: (city: string) => void;
  className?: string;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...CITIES];
    return CITIES.filter((city) => city.toLowerCase().includes(q));
  }, [query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between rounded-md border bg-white px-3 font-normal",
            !value && "text-muted-foreground",
            hasError && "border-destructive",
            className,
          )}
        >
          <span className="truncate">{value || "Select City"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search city…"
            className="h-9 pl-8"
            autoFocus
          />
        </div>
        <div className="max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">No cities match.</p>
          ) : (
            filtered.map((city) => {
              const selected = city === value;
              return (
                <button
                  key={city}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                    selected ? "bg-gold/15 text-forest" : "text-forest/80 hover:bg-cream",
                  )}
                  onClick={() => {
                    onChange(city);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check className={cn("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} />
                  {city}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
