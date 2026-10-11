"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { hasGoogleMapsKey, loadGoogleMapsScript } from "@/lib/map";
import { cn } from "@/lib/utils";

export type PlaceSearchResult = {
  latitude: number;
  longitude: number;
  label?: string;
};

const fieldClass =
  "h-10 rounded-xl border border-[#E8E2D6]/90 bg-[#FBF9F5] shadow-[inset_0_1px_2px_rgba(15,46,29,0.045)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-gold focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-gold/35";

const DEBOUNCE_MS = 150;

type Prediction = {
  placeId: string;
  primary: string;
  secondary: string;
};

/** Page-session cache of predictions by normalized query. */
const predictionCache = new Map<string, Prediction[]>();

function normalizeQueryKey(query: string) {
  return query.trim().toLowerCase();
}

function mapGoogleResults(
  results: google.maps.places.AutocompletePrediction[] | null | undefined,
): Prediction[] {
  if (!results?.length) return [];
  return results.map((item) => ({
    placeId: item.place_id,
    primary: item.structured_formatting?.main_text || item.description,
    secondary: item.structured_formatting?.secondary_text || "",
  }));
}

function getPlacePredictions(
  service: google.maps.places.AutocompleteService,
  request: google.maps.places.AutocompletionRequest,
): Promise<Prediction[]> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (items: Prediction[]) => {
      if (settled) return;
      settled = true;
      resolve(items);
    };
    const timer = window.setTimeout(() => finish([]), 8000);
    try {
      service.getPlacePredictions(request, (results, status) => {
        window.clearTimeout(timer);
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          finish(mapGoogleResults(results));
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
    const wordMatch = lower.match(new RegExp(`(?:^|[\\s,/().\\-])(${escaped})`, "i"));
    if (wordMatch?.index != null) {
      index = wordMatch.index + (wordMatch[0].length - (wordMatch[1]?.length ?? 0));
    }
  }
  if (index < 0) return <>{text}</>;
  const end = index + needle.length;
  return (
    <>
      {text.slice(0, index)}
      <strong className="font-bold">{text.slice(index, end)}</strong>
      {text.slice(end)}
    </>
  );
}

/**
 * Google Places Autocomplete (AutocompleteService) — same idea as the Maps search box:
 * one unrestricted request per query, from the first character typed.
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
  onQueryChange?: (query: string) => void;
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
  const suppressFetchRef = useRef(false);
  const requestIdRef = useRef(0);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

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
        console.error("[PlaceSearchInput] Google Maps load failed:", next.message);
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

  const applyResult = useCallback(
    (result: PlaceSearchResult) => {
      setError(null);
      setOpen(false);
      setPredictions([]);
      setEmptyMessage(null);
      refreshSessionToken();
      onPlaceSelected(result);
    },
    [onPlaceSelected, refreshSessionToken],
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
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setPredictions([]);
        setOpen(false);
        setLoadingPredictions(false);
        setEmptyMessage(null);
        return;
      }

      const cacheKey = normalizeQueryKey(trimmed);
      const cached = predictionCache.get(cacheKey);
      if (cached) {
        setLoadingPredictions(false);
        setPredictions(cached);
        setHighlight(-1);
        setEmptyMessage(cached.length ? null : "No locations found");
        positionMenu();
        setOpen(true);
        return;
      }

      const places = window.google?.maps?.places;
      if (!places?.AutocompleteService) {
        setLoadingPredictions(false);
        setPredictions([]);
        setEmptyMessage("No locations found");
        positionMenu();
        setOpen(true);
        return;
      }

      const requestId = ++requestIdRef.current;
      setLoadingPredictions(true);
      setEmptyMessage(null);
      positionMenu();
      setOpen(true);

      const service = new places.AutocompleteService();
      const token = ensureSessionToken() ?? undefined;

      try {
        // One request, no country / bias / types — same as Maps search box.
        const results = await getPlacePredictions(service, {
          input: trimmed,
          sessionToken: token,
        });

        if (requestId !== requestIdRef.current) return;

        predictionCache.set(cacheKey, results);
        setPredictions(results);
        setHighlight(-1);
        setEmptyMessage(results.length ? null : "No locations found");
        positionMenu();
        setOpen(true);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setPredictions([]);
        setEmptyMessage("No locations found");
        positionMenu();
        setOpen(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingPredictions(false);
        }
      }
    },
    [ensureSessionToken, positionMenu],
  );

  useEffect(() => {
    if (suppressFetchRef.current) {
      suppressFetchRef.current = false;
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
        const response = await geocoder.geocode({
          placeId: prediction.placeId,
        });
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
        const response = await geocoder.geocode({ address: trimmed });
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
    setEmptyMessage(null);
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
            if (predictions.length || loadingPredictions || emptyMessage) {
              positionMenu();
              setOpen(true);
            } else if (query.trim().length >= 1) {
              void fetchPredictions(query);
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
              className="fixed z-[10050] max-h-[320px] overflow-y-auto overscroll-contain rounded-xl border border-forest/15 bg-ivory py-1 shadow-[0_16px_40px_-18px_rgba(15,46,29,0.4)] [scrollbar-color:#0f2e1d_#f4f2ed] [scrollbar-width:thin]"
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
                  key={item.placeId}
                  role="option"
                  aria-selected={highlight === index}
                >
                  <button
                    type="button"
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors",
                      highlight === index ? "bg-gold/15" : "hover:bg-forest/[0.05]",
                    )}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                    onClick={() => void selectPrediction(item)}
                  >
                    <span className="text-sm font-semibold text-forest">
                      <HighlightMatch text={item.primary} query={query} />
                    </span>
                    {item.secondary ? (
                      <span className="text-xs text-muted-foreground">
                        <HighlightMatch text={item.secondary} query={query} />
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
          Could not load Google Places. {loadError.message}
        </p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
