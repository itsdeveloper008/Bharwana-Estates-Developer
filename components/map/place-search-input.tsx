"use client";

import { useCallback, useRef, useState } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PlaceSearchResult = {
  latitude: number;
  longitude: number;
  label?: string;
};

const fieldClass =
  "h-10 rounded-xl border border-[#E8E2D6]/90 bg-[#FBF9F5] shadow-[inset_0_1px_2px_rgba(15,46,29,0.045)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-gold focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-gold/35";

const autocompleteOptions: google.maps.places.AutocompleteOptions = {
  componentRestrictions: { country: "pk" },
  fields: ["geometry", "formatted_address", "name"],
};

function coordsFromPlace(place: google.maps.places.PlaceResult | null): PlaceSearchResult | null {
  const loc = place?.geometry?.location;
  if (!loc) return null;
  const latitude = loc.lat();
  const longitude = loc.lng();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    latitude,
    longitude,
    label: place.formatted_address || place.name || undefined,
  };
}

/**
 * Places Autocomplete + Geocoder Enter fallback.
 * Parent must only mount this after Maps JS has loaded with `libraries: ['places']`.
 */
export function PlaceSearchInput({
  onPlaceSelected,
  placeholder = "Search address or place (e.g. DHA Multan)",
  className,
  inputClassName,
  disabled = false,
}: {
  onPlaceSelected: (result: PlaceSearchResult) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
}) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const handledByAutocomplete = useRef(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const applyResult = useCallback(
    (result: PlaceSearchResult) => {
      setError(null);
      onPlaceSelected(result);
    },
    [onPlaceSelected],
  );

  const geocodeQuery = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setError("Enter a place name or address to search.");
        return;
      }
      if (!window.google?.maps?.Geocoder) {
        setError("Map search is still loading. Try again in a moment.");
        return;
      }
      setPending(true);
      setError(null);
      try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({
          address: trimmed,
          componentRestrictions: { country: "PK" },
        });
        const first = response.results?.[0];
        const loc = first?.geometry?.location;
        if (!loc) {
          setError(`No results found for “${trimmed}”.`);
          return;
        }
        applyResult({
          latitude: loc.lat(),
          longitude: loc.lng(),
          label: first.formatted_address,
        });
      } catch {
        setError(`No results found for “${trimmed}”.`);
      } finally {
        setPending(false);
      }
    },
    [applyResult],
  );

  function onPlaceChanged() {
    const place = autocompleteRef.current?.getPlace() ?? null;
    const result = coordsFromPlace(place);
    if (!result) return;
    handledByAutocomplete.current = true;
    if (result.label) setQuery(result.label);
    applyResult(result);
  }

  function onEnterOrSearch() {
    const q = query;
    window.setTimeout(() => {
      if (handledByAutocomplete.current) {
        handledByAutocomplete.current = false;
        return;
      }
      void geocodeQuery(q);
    }, 180);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <Autocomplete
        onLoad={(ac) => {
          autocompleteRef.current = ac;
        }}
        onPlaceChanged={onPlaceChanged}
        options={autocompleteOptions}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40"
            strokeWidth={1.5}
          />
          <Input
            value={query}
            disabled={disabled || pending}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              onEnterOrSearch();
            }}
            className={cn(fieldClass, "pl-9 pr-10", inputClassName)}
          />
          <button
            type="button"
            aria-label="Search place"
            disabled={disabled || pending}
            onClick={() => onEnterOrSearch()}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-forest/50 transition hover:bg-forest/5 hover:text-forest disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </Autocomplete>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
