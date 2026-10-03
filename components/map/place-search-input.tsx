"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useJsApiLoader } from "@react-google-maps/api";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  hasGoogleMapsKey,
} from "@/lib/map";
import { cn } from "@/lib/utils";

export type PlaceSearchResult = {
  latitude: number;
  longitude: number;
  label?: string;
};

const fieldClass =
  "h-10 rounded-xl border border-[#E8E2D6]/90 bg-[#FBF9F5] shadow-[inset_0_1px_2px_rgba(15,46,29,0.045)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-gold focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-gold/35";

type Prediction = {
  placeId: string;
  primary: string;
  secondary: string;
};

/**
 * Places Autocomplete via AutocompleteService + custom dropdown (portal).
 * Loads Maps JS + `places` itself so it works on /properties as well as /map.
 */
export function PlaceSearchInput({
  onPlaceSelected,
  onQueryChange,
  placeholder = "Search address or place (e.g. DHA Multan)",
  className,
  inputClassName,
  disabled = false,
  defaultValue = "",
  hideLeadingIcon = false,
  hideActions = false,
}: {
  onPlaceSelected: (result: PlaceSearchResult) => void;
  /** Fires whenever the typed query changes (e.g. clear search → empty string). */
  onQueryChange?: (query: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  /** Sync from URL / parent when the external query changes. */
  defaultValue?: string;
  hideLeadingIcon?: boolean;
  /** Hide clear + search action buttons (e.g. inline filter bar). */
  hideActions?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const suppressFetchRef = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "bharwana-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    preventGoogleFontsLoading: true,
  });

  const [query, setQuery] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  useEffect(() => {
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    console.log("[PlaceSearchInput] mounted", {
      isLoaded,
      placesAvailable: typeof window !== "undefined" ? Boolean(window.google?.maps?.places) : false,
      hasKey: hasGoogleMapsKey(),
      loadError: loadError?.message ?? null,
    });
  }, [isLoaded, loadError]);

  const updateQuery = useCallback(
    (next: string) => {
      setQuery(next);
      onQueryChange?.(next);
    },
    [onQueryChange],
  );

  const applyResult = useCallback(
    (result: PlaceSearchResult) => {
      setError(null);
      setOpen(false);
      setPredictions([]);
      onPlaceSelected(result);
    },
    [onPlaceSelected],
  );

  const positionMenu = useCallback(() => {
    const el = inputRef.current ?? rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuBox({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 240),
    });
  }, []);

  const fetchPredictions = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || trimmed.length < 2) {
        setPredictions([]);
        setOpen(false);
        setLoadingPredictions(false);
        return;
      }
      if (!window.google?.maps?.places?.AutocompleteService) {
        setLoadingPredictions(false);
        return;
      }

      setLoadingPredictions(true);
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: "pk" },
        },
        (results, status) => {
          setLoadingPredictions(false);
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
            if (process.env.NODE_ENV === "development") {
              console.info("[PlaceSearchInput] predictions", { status, count: results?.length ?? 0 });
            }
            setPredictions([]);
            setOpen(false);
            return;
          }
          const next = results.slice(0, 6).map((item) => ({
            placeId: item.place_id,
            primary: item.structured_formatting?.main_text || item.description,
            secondary: item.structured_formatting?.secondary_text || "",
          }));
          if (process.env.NODE_ENV === "development") {
            console.info("[PlaceSearchInput] predictions", {
              status,
              count: next.length,
              first: next[0]?.primary,
            });
          }
          setPredictions(next);
          setHighlight(-1);
          positionMenu();
          setOpen(true);
        },
      );
    },
    [positionMenu],
  );

  useEffect(() => {
    if (suppressFetchRef.current) {
      suppressFetchRef.current = false;
      return;
    }
    if (!isLoaded) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchPredictions(query), 180);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, isLoaded, fetchPredictions]);

  useEffect(() => {
    if (!open) return;
    function onScrollOrResize() {
      positionMenu();
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      const menu = document.getElementById(listId);
      if (menu?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, positionMenu, listId]);

  const selectPrediction = useCallback(
    async (prediction: Prediction) => {
      if (!window.google?.maps?.Geocoder) {
        setError("Map search is still loading. Try again in a moment.");
        return;
      }
      setPending(true);
      setError(null);
      try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({ placeId: prediction.placeId });
        const first = response.results?.[0];
        const loc = first?.geometry?.location;
        if (!loc) {
          setError(`No results found for “${prediction.primary}”.`);
          return;
        }
        const label = first.formatted_address || prediction.primary;
        suppressFetchRef.current = true;
        updateQuery(label);
        applyResult({
          latitude: loc.lat(),
          longitude: loc.lng(),
          label,
        });
      } catch {
        setError(`No results found for “${prediction.primary}”.`);
      } finally {
        setPending(false);
      }
    },
    [applyResult, updateQuery],
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
        const label = first.formatted_address || trimmed;
        suppressFetchRef.current = true;
        updateQuery(label);
        applyResult({
          latitude: loc.lat(),
          longitude: loc.lng(),
          label,
        });
      } catch {
        setError(`No results found for “${trimmed}”.`);
      } finally {
        setPending(false);
      }
    },
    [applyResult, updateQuery],
  );

  function onEnterOrSearch() {
    if (highlight >= 0 && predictions[highlight]) {
      void selectPrediction(predictions[highlight]!);
      return;
    }
    if (predictions[0]) {
      void selectPrediction(predictions[0]);
      return;
    }
    void geocodeQuery(query);
  }

  function clearQuery() {
    updateQuery("");
    setError(null);
    setPredictions([]);
    setOpen(false);
  }

  const placesReady =
    isLoaded && typeof window !== "undefined" && Boolean(window.google?.maps?.places);
  const menu = open && predictions.length > 0 ? menuBox : null;

  return (
    <div ref={rootRef} className={cn("relative space-y-1.5", className)}>
      <div className="relative">
        {hideLeadingIcon ? null : (
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40"
            strokeWidth={1.5}
          />
        )}
        <Input
          ref={inputRef}
          value={query}
          disabled={disabled || pending}
          placeholder={
            loadError
              ? "Location search unavailable"
              : !placesReady
                ? "Loading locations…"
                : placeholder
          }
          autoComplete="off"
          role="combobox"
          aria-expanded={menu ? "true" : "false"}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => {
            if (predictions.length) {
              positionMenu();
              setOpen(true);
            } else if (query.trim().length >= 2) {
              fetchPredictions(query);
            }
          }}
          onChange={(event) => {
            updateQuery(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!predictions.length) return;
              setOpen(true);
              setHighlight((index) => (index + 1) % predictions.length);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (!predictions.length) return;
              setOpen(true);
              setHighlight((index) => (index <= 0 ? predictions.length - 1 : index - 1));
              return;
            }
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key !== "Enter") return;
            event.preventDefault();
            onEnterOrSearch();
          }}
          className={cn(
            fieldClass,
            hideLeadingIcon ? "pl-3" : "pl-9",
            hideActions ? "pr-3" : "pr-16",
            inputClassName,
          )}
        />
        {hideActions ? null : (
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            {query.trim() ? (
              <button
                type="button"
                aria-label="Clear search"
                disabled={disabled || pending}
                onClick={clearQuery}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-forest/45 transition hover:bg-forest/5 hover:text-forest disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Search place"
              disabled={disabled || pending || !placesReady}
              onClick={() => onEnterOrSearch()}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-forest/50 transition hover:bg-forest/5 hover:text-forest disabled:opacity-50"
            >
              {pending || loadingPredictions ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
            </button>
          </div>
        )}
      </div>

      {menu && typeof document !== "undefined"
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              className="fixed z-[10050] max-h-72 overflow-auto rounded-xl border border-forest/15 bg-ivory py-1 shadow-[0_16px_40px_-18px_rgba(15,46,29,0.4)]"
              style={{
                top: menu.top,
                left: menu.left,
                width: menu.width,
              }}
            >
              {predictions.map((item, index) => (
                <li key={item.placeId} role="option" aria-selected={highlight === index}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors",
                      highlight === index ? "bg-gold/15" : "hover:bg-forest/[0.05]",
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(event) => {
                      // Prevent input blur before click applies.
                      event.preventDefault();
                    }}
                    onClick={() => void selectPrediction(item)}
                  >
                    <span className="text-sm font-semibold text-forest">{item.primary}</span>
                    {item.secondary ? (
                      <span className="text-xs text-muted-foreground">{item.secondary}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load Google Places. Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and Places API access.
        </p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
