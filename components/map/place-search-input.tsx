"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CITY_COORDS, hasGoogleMapsKey, loadGoogleMapsScript } from "@/lib/map";
import { useMockStore } from "@/lib/mock-store";
import { cn } from "@/lib/utils";

export type PlaceSearchResult = {
  latitude: number;
  longitude: number;
  label?: string;
};

const fieldClass =
  "h-10 rounded-xl border border-[#E8E2D6]/90 bg-[#FBF9F5] shadow-[inset_0_1px_2px_rgba(15,46,29,0.045)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-gold focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-gold/35";

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 10;
/** ~30 km around a selected city. */
const CITY_RADIUS_M = 30_000;

type Prediction = {
  placeId?: string;
  primary: string;
  secondary: string;
  latitude?: number;
  longitude?: number;
  source: "local" | "google";
};

/** Page-session cache keyed by `cityScope|normalizedQuery`. */
const predictionCache = new Map<string, Prediction[]>();

function normalizeQueryKey(query: string) {
  return query.trim().toLowerCase();
}

function cacheKey(cityScope: string, query: string) {
  return `${cityScope || "ALL"}|${normalizeQueryKey(query)}`;
}

/** Match start of the whole name or any word (case-insensitive). */
function matchesWordPrefix(name: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const lower = name.toLowerCase();
  if (lower.startsWith(q)) return true;
  return lower.split(/[\s,/().\-#]+/).some((word) => word.length > 0 && word.startsWith(q));
}

function predictionDedupeKey(item: Prediction) {
  if (item.placeId) return `id:${item.placeId}`;
  return `t:${item.primary.trim().toLowerCase()}|${item.secondary.trim().toLowerCase()}`;
}

function mergePredictions(local: Prediction[], google: Prediction[], limit = MAX_RESULTS): Prediction[] {
  const seen = new Set<string>();
  const out: Prediction[] = [];
  for (const item of [...local, ...google]) {
    const key = predictionDedupeKey(item);
    if (seen.has(key)) continue;
    // Also dedupe by primary text alone when secondary differs slightly
    const primaryKey = `p:${item.primary.trim().toLowerCase()}`;
    if (seen.has(primaryKey)) continue;
    seen.add(key);
    seen.add(primaryKey);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function mapGoogleResults(
  results: google.maps.places.AutocompletePrediction[] | null | undefined,
  cityScope: string,
): Prediction[] {
  if (!results?.length) return [];
  const mapped = results.map((item) => ({
    placeId: item.place_id,
    primary: item.structured_formatting?.main_text || item.description,
    secondary: item.structured_formatting?.secondary_text || "",
    source: "google" as const,
    description: item.description,
  }));

  const toPrediction = (item: (typeof mapped)[number]): Prediction => ({
    placeId: item.placeId,
    primary: item.primary,
    secondary: item.secondary,
    source: item.source,
  });

  if (!cityScope || cityScope === "ALL") {
    return mapped.map(toPrediction);
  }

  const cityLower = cityScope.toLowerCase();
  // Drop anything that does not mention the selected city (avoids e.g. DHA Lahore under Multan).
  return mapped
    .filter((item) => {
      const blob = `${item.primary} ${item.secondary} ${item.description}`.toLowerCase();
      return blob.includes(cityLower);
    })
    .map(toPrediction);
}

function getPlacePredictions(
  service: google.maps.places.AutocompleteService,
  request: google.maps.places.AutocompletionRequest,
): Promise<google.maps.places.AutocompletePrediction[]> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (items: google.maps.places.AutocompletePrediction[]) => {
      if (settled) return;
      settled = true;
      resolve(items);
    };
    const timer = window.setTimeout(() => finish([]), 8000);
    try {
      service.getPlacePredictions(request, (results, status) => {
        window.clearTimeout(timer);
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
          finish(results);
        } else {
          finish([]);
        }
      });
    } catch {
      window.clearTimeout(timer);
      finish([]);
    }
  });
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let index = lower.indexOf(needle);
  if (index < 0) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordMatch = lower.match(new RegExp(`(?:^|[\\s,/().\\-#])(${escaped})`, "i"));
    if (wordMatch?.index != null) {
      index = wordMatch.index + (wordMatch[0].length - (wordMatch[1]?.length ?? 0));
    }
  }
  if (index < 0) return <>{text}</>;
  const end = index + needle.length;
  return (
    <>
      {text.slice(0, index)}
      <strong className="font-bold underline decoration-forest/40 underline-offset-2">
        {text.slice(index, end)}
      </strong>
      {text.slice(end)}
    </>
  );
}

/**
 * Zameen-style location search: Pakistan-only, optional city scope,
 * our listing localities first, then one Google Autocomplete request.
 */
export function PlaceSearchInput({
  onPlaceSelected,
  onQueryChange,
  cityScope = "ALL",
  placeholder = "Search by location",
  className,
  inputClassName,
  disabled = false,
  defaultValue = "",
  hideLeadingIcon = false,
  hideActions = false,
}: {
  onPlaceSelected: (result: PlaceSearchResult) => void;
  onQueryChange?: (query: string) => void;
  /** "ALL" / empty = Pakistan-wide; otherwise bias + prefer that city (e.g. "Multan"). */
  cityScope?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  defaultValue?: string;
  hideLeadingIcon?: boolean;
  hideActions?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const debounceRef = useRef<number | null>(null);
  /** Skip autocomplete after a programmatic selection (must stay true across the next query effect). */
  const justSelectedRef = useRef(false);
  const requestIdRef = useRef(0);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const { properties } = useMockStore();
  const scope = !cityScope || cityScope === "ALL" ? "ALL" : cityScope;

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [query, setQuery] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [highlight, setHighlight] = useState(-1);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  const listingLocalities = useMemo(() => {
    const byKey = new Map<string, Prediction>();

    for (const [name, coords] of Object.entries(CITY_COORDS)) {
      if (scope !== "ALL" && name !== scope) continue;
      byKey.set(name.toLowerCase(), {
        primary: name,
        secondary: "Pakistan",
        latitude: coords.latitude,
        longitude: coords.longitude,
        source: "local",
      });
    }

    for (const property of properties) {
      if (property.status !== "PUBLISHED" && property.status !== "RESERVED") continue;
      const city = property.city?.trim();
      if (!city) continue;
      if (scope !== "ALL" && city !== scope) continue;

      const cityKey = city.toLowerCase();
      if (!byKey.has(cityKey)) {
        const coords = CITY_COORDS[city];
        byKey.set(cityKey, {
          primary: city,
          secondary: "Pakistan",
          latitude: coords?.latitude ?? property.latitude,
          longitude: coords?.longitude ?? property.longitude,
          source: "local",
        });
      }

      const address = property.address?.trim();
      if (!address) continue;
      const head = address.split(",")[0]?.trim() || address;
      if (head.length < 2 || head.length > 64) continue;
      const key = `${head.toLowerCase()}|${cityKey}`;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        primary: head,
        secondary: city,
        latitude: property.latitude,
        longitude: property.longitude,
        source: "local",
      });
    }

    return Array.from(byKey.values());
  }, [properties, scope]);

  const ensureSessionToken = useCallback(() => {
    if (typeof window === "undefined" || !window.google?.maps?.places?.AutocompleteSessionToken) {
      return null;
    }
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  const refreshSessionToken = useCallback(() => {
    if (typeof window === "undefined" || !window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = null;
      return;
    }
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
  }, []);

  useEffect(() => {
    if (justSelectedRef.current) return;
    setQuery(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    void loadGoogleMapsScript()
      .then(() => {
        if (cancelled) return;
        setIsLoaded(true);
        ensureSessionToken();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const next = err instanceof Error ? err : new Error(String(err));
        if (process.env.NODE_ENV === "development") {
          console.error("[PlaceSearchInput] Google Maps load failed:", next.message);
        }
        setLoadError(next);
      });
    return () => {
      cancelled = true;
    };
  }, [ensureSessionToken]);

  const updateQuery = useCallback(
    (next: string) => {
      setQuery(next);
      onQueryChange?.(next);
    },
    [onQueryChange],
  );

  const positionMenu = useCallback(() => {
    const el = inputRef.current ?? rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 240), Math.max(200, window.innerWidth - 16));
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8));
    setMenuBox({
      top: rect.bottom + 6,
      left,
      width,
    });
  }, []);

  const buildLocalPredictions = useCallback(
    (trimmed: string): Prediction[] => {
      const cities = listingLocalities.filter(
        (item) =>
          Object.prototype.hasOwnProperty.call(CITY_COORDS, item.primary) &&
          matchesWordPrefix(item.primary, trimmed),
      );
      const areas = listingLocalities.filter(
        (item) =>
          !Object.prototype.hasOwnProperty.call(CITY_COORDS, item.primary) &&
          matchesWordPrefix(item.primary, trimmed),
      );
      return mergePredictions(cities, areas, MAX_RESULTS);
    },
    [listingLocalities],
  );

  const fetchPredictions = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setPredictions([]);
        setOpen(false);
        setLoadingPredictions(false);
        setEmptyMessage(null);
        return;
      }

      const key = cacheKey(scope, trimmed);
      const cached = predictionCache.get(key);
      if (cached) {
        setLoadingPredictions(false);
        setPredictions(cached);
        setHighlight(-1);
        setEmptyMessage(cached.length ? null : "No locations found");
        positionMenu();
        setOpen(true);
        return;
      }

      const locals = buildLocalPredictions(trimmed);
      if (locals.length) {
        setPredictions(locals);
        setHighlight(-1);
        setEmptyMessage(null);
        positionMenu();
        setOpen(true);
      } else {
        setPredictions([]);
        setEmptyMessage(null);
        positionMenu();
        setOpen(true);
      }

      const places = window.google?.maps?.places;
      if (!places?.AutocompleteService) {
        setLoadingPredictions(false);
        predictionCache.set(key, locals);
        if (!locals.length) setEmptyMessage("No locations found");
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoadingPredictions(true);

      const service = new places.AutocompleteService();
      const token = ensureSessionToken() ?? undefined;
      const request: google.maps.places.AutocompletionRequest = {
        input: trimmed,
        componentRestrictions: { country: "pk" },
        sessionToken: token,
      };

      if (scope !== "ALL" && CITY_COORDS[scope]) {
        const center = new google.maps.LatLng(
          CITY_COORDS[scope].latitude,
          CITY_COORDS[scope].longitude,
        );
        // Bias (~30 km); city-name filter below drops out-of-city rows (e.g. DHA Lahore).
        request.location = center;
        request.radius = CITY_RADIUS_M;
      }

      try {
        const rawResults = await getPlacePredictions(service, request);
        if (requestId !== requestIdRef.current) return;

        const googleMapped = mapGoogleResults(rawResults, scope);
        const merged = mergePredictions(locals, googleMapped, MAX_RESULTS);
        predictionCache.set(key, merged);
        setPredictions(merged);
        setHighlight(-1);
        setEmptyMessage(merged.length ? null : "No locations found");
        positionMenu();
        setOpen(true);
      } catch {
        if (requestId !== requestIdRef.current) return;
        predictionCache.set(key, locals);
        setPredictions(locals);
        setEmptyMessage(locals.length ? null : "No locations found");
        positionMenu();
        setOpen(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingPredictions(false);
        }
      }
    },
    [buildLocalPredictions, ensureSessionToken, positionMenu, scope],
  );

  // Typing → debounced fetch (skipped right after a selection).
  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setPredictions([]);
      setOpen(false);
      setLoadingPredictions(false);
      setEmptyMessage(null);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      void fetchPredictions(query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, fetchPredictions]);

  // City scope change: clear + re-query current input.
  useEffect(() => {
    predictionCache.clear();
    setPredictions([]);
    setEmptyMessage(null);
    setHighlight(-1);
    setOpen(false);
    if (justSelectedRef.current) return;
    const trimmed = query.trim();
    if (!trimmed) return;
    void fetchPredictions(query);
    // Only react to scope changes, not every query edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: cityScope only
  }, [scope]);

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

  useEffect(() => {
    if (highlight < 0) return;
    itemRefs.current[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setPredictions([]);
    setEmptyMessage(null);
    setHighlight(-1);
    setLoadingPredictions(false);
  }, []);

  const selectPrediction = useCallback(
    async (prediction: Prediction) => {
      // Selection is final: visible text = suggestion main text only (never geocoded address).
      justSelectedRef.current = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      requestIdRef.current += 1; // discard in-flight Google responses
      setQuery(prediction.primary);
      onQueryChange?.(prediction.primary);
      closeMenu();
      setError(null);
      refreshSessionToken();

      if (
        prediction.latitude != null &&
        prediction.longitude != null &&
        Number.isFinite(prediction.latitude) &&
        Number.isFinite(prediction.longitude)
      ) {
        onPlaceSelected({
          latitude: prediction.latitude,
          longitude: prediction.longitude,
          label: prediction.primary,
        });
        return;
      }

      if (!prediction.placeId || !window.google?.maps?.Geocoder) {
        return;
      }

      setPending(true);
      try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({ placeId: prediction.placeId });
        const loc = response.results?.[0]?.geometry?.location;
        if (!loc) {
          setError(`No results found for “${prediction.primary}”.`);
          return;
        }
        // Keep input as prediction.primary — coords only for map/filter.
        onPlaceSelected({
          latitude: loc.lat(),
          longitude: loc.lng(),
          label: prediction.primary,
        });
      } catch {
        setError(`No results found for “${prediction.primary}”.`);
      } finally {
        setPending(false);
      }
    },
    [closeMenu, onPlaceSelected, onQueryChange, refreshSessionToken],
  );

  const applyPlainText = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      justSelectedRef.current = true;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      closeMenu();
      if (!trimmed) return;

      // Keep typed text; geocode only for map centering when Maps is available.
      if (!window.google?.maps?.Geocoder) {
        onQueryChange?.(trimmed);
        return;
      }
      setPending(true);
      setError(null);
      try {
        const geocoder = new google.maps.Geocoder();
        const request: google.maps.GeocoderRequest = {
          address: trimmed,
          componentRestrictions: { country: "PK" },
        };
        if (scope !== "ALL" && CITY_COORDS[scope]) {
          request.bounds = new google.maps.Circle({
            center: {
              lat: CITY_COORDS[scope].latitude,
              lng: CITY_COORDS[scope].longitude,
            },
            radius: CITY_RADIUS_M,
          }).getBounds()!;
        }
        const response = await geocoder.geocode(request);
        const loc = response.results?.[0]?.geometry?.location;
        if (!loc) return;
        onPlaceSelected({
          latitude: loc.lat(),
          longitude: loc.lng(),
          label: trimmed,
        });
      } catch {
        // Plain text filter still stands via onQueryChange from typing.
      } finally {
        setPending(false);
      }
    },
    [closeMenu, onPlaceSelected, onQueryChange, scope],
  );

  function onEnterOrSearch() {
    if (highlight >= 0 && predictions[highlight]) {
      void selectPrediction(predictions[highlight]!);
      return;
    }
    // No suggestion chosen — keep typed text as a plain filter (do not auto-pick #1).
    void applyPlainText(query);
  }

  function clearQuery() {
    justSelectedRef.current = true;
    updateQuery("");
    setError(null);
    closeMenu();
    refreshSessionToken();
  }

  const placesReady =
    isLoaded && typeof window !== "undefined" && Boolean(window.google?.maps?.places);
  const showMenu =
    open &&
    menuBox &&
    (predictions.length > 0 || loadingPredictions || Boolean(emptyMessage));

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
              : !placesReady && !hasGoogleMapsKey()
                ? "Location search unavailable"
                : placeholder
          }
          autoComplete="off"
          role="combobox"
          aria-expanded={showMenu ? "true" : "false"}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => {
            if (justSelectedRef.current) return;
            if (predictions.length || loadingPredictions || emptyMessage) {
              positionMenu();
              setOpen(true);
            } else if (query.trim().length >= 1) {
              void fetchPredictions(query);
            }
          }}
          onChange={(event) => {
            justSelectedRef.current = false;
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
              disabled={disabled || pending}
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

      {showMenu && typeof document !== "undefined"
        ? createPortal(
            <ul
              id={listId}
              role="listbox"
              className="fixed z-[10050] max-h-[360px] overflow-y-auto overscroll-contain rounded-xl border border-forest/15 bg-ivory py-1 shadow-[0_16px_40px_-18px_rgba(15,46,29,0.4)] [scrollbar-color:#0f2e1d_#f4f2ed] [scrollbar-width:thin]"
              style={{
                top: menuBox.top,
                left: menuBox.left,
                width: menuBox.width,
              }}
            >
              {loadingPredictions && predictions.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-muted-foreground">Searching…</li>
              ) : null}
              {predictions.map((item, index) => (
                <li
                  key={item.placeId ?? `${item.primary}-${item.secondary}-${index}`}
                  role="option"
                  aria-selected={highlight === index}
                >
                  <button
                    type="button"
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      highlight === index ? "bg-gold/15" : "hover:bg-forest/[0.05]",
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => void selectPrediction(item)}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-forest">
                      <HighlightMatch text={item.primary} query={query} />
                    </span>
                    {item.secondary ? (
                      <span className="max-w-[45%] shrink-0 truncate text-right text-xs text-muted-foreground">
                        {item.secondary}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
              {!loadingPredictions && emptyMessage ? (
                <li className="px-3 py-2.5 text-sm text-muted-foreground">{emptyMessage}</li>
              ) : null}
            </ul>,
            document.body,
          )
        : null}

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          Could not load Google Places. Listing locations still work. {loadError.message}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
