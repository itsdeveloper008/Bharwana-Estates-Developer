"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleMap, OverlayViewF, OverlayView, useJsApiLoader } from "@react-google-maps/api";
import Supercluster from "supercluster";
import { AnimatePresence, motion } from "framer-motion";
import { PropertyPin } from "@/components/map/property-pin";
import { MapPreviewCard } from "@/components/map/map-fallback";
import { Button } from "@/components/ui/button";
import {
  CITY_COORDS,
  DEFAULT_MAP_VIEW,
  GOOGLE_MAPS_API_KEY,
  boundsFromProperties,
  googleBoundsTuple,
  hasGoogleMapsKey,
  warnMissingMapKeys,
} from "@/lib/map";
import type { MapBounds, Property } from "@/lib/types";

interface FeatureProps {
  id: string;
}

const mapContainerStyle = { width: "100%", height: "100%" };

const MAP_MODES = [
  { id: "roadmap", label: "Map" },
  { id: "satellite", label: "Satellite" },
  { id: "hybrid", label: "Hybrid" },
  { id: "terrain", label: "Terrain" },
] as const;

type MapModeId = (typeof MAP_MODES)[number]["id"];

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeId: "satellite",
  gestureHandling: "greedy",
  clickableIcons: false,
};

function MapLoadingSkeleton({ message = "Loading map" }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[420px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-forest/20 border-t-gold" />
        <p className="text-xs uppercase tracking-[0.16em] text-forest/50">{message}</p>
      </div>
    </div>
  );
}

function MapKeyMissing() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-cream/60 px-6 text-center">
      <div>
        <p className="font-serif text-2xl text-forest">Google Maps key needed</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local and enable the Maps JavaScript API.
        </p>
      </div>
    </div>
  );
}

export function MapView({
  properties,
  hoveredId,
  focusId,
  focusKey,
  selectedId: controlledSelectedId,
  onSelectedChange,
  boundsActive,
  onBoundsSearch,
  onResetBounds,
}: {
  properties: Property[];
  hoveredId?: string | null;
  focusId?: string | null;
  focusKey?: number;
  selectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  boundsActive?: boolean;
  onBoundsSearch?: (bounds: MapBounds) => void;
  onResetBounds?: () => void;
}) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const searchParams = useSearchParams();
  const city = searchParams.get("city");
  const dirtyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMoved = useRef(false);
  const fittedKey = useRef<string>("");

  const [zoom, setZoom] = useState(DEFAULT_MAP_VIEW.zoom);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [hoverPinId, setHoverPinId] = useState<string | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [mapTypeId, setMapTypeId] = useState<MapModeId>("satellite");
  const [authFailed, setAuthFailed] = useState(false);
  const suppressMapClick = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "bharwana-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    const win = window as Window & { gm_authFailure?: () => void };
    const previous = win.gm_authFailure;
    win.gm_authFailure = () => {
      setAuthFailed(true);
      previous?.();
    };
    return () => {
      win.gm_authFailure = previous;
    };
  }, []);

  const isControlled = controlledSelectedId !== undefined;
  const selectedId = isControlled ? controlledSelectedId : internalSelectedId;
  const setSelectedId = useCallback(
    (id: string | null) => {
      if (!isControlled) setInternalSelectedId(id);
      onSelectedChange?.(id);
    },
    [isControlled, onSelectedChange],
  );

  const armSuppressMapClick = useCallback(() => {
    // Overlay clicks also fire GoogleMap onClick — ignore that follow-up click.
    suppressMapClick.current = true;
    window.setTimeout(() => {
      suppressMapClick.current = false;
    }, 120);
  }, []);

  const selectPin = useCallback(
    (id: string) => {
      armSuppressMapClick();
      setSelectedId(id);
    },
    [armSuppressMapClick, setSelectedId],
  );

  const applyMapType = useCallback((next: MapModeId) => {
    setMapTypeId(next);
    mapRef.current?.setMapTypeId(next);
  }, []);

  useEffect(() => {
    warnMissingMapKeys();
  }, []);

  const byId = useMemo(() => {
    const lookup: Record<string, Property> = {};
    for (const property of properties) lookup[property.id] = property;
    return lookup;
  }, [properties]);

  const clusterIndex = useMemo(() => {
    const cluster = new Supercluster<FeatureProps>({ radius: 64, maxZoom: 16 });
    cluster.load(
      properties.map((property) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [property.longitude, property.latitude],
        },
        properties: { id: property.id },
      })),
    );
    return cluster;
  }, [properties]);

  const points = useMemo(() => {
    if (!bounds) return [];
    return clusterIndex.getClusters(bounds, Math.round(zoom));
  }, [clusterIndex, bounds, zoom]);

  const selected = selectedId ? byId[selectedId] : undefined;

  const initialCenter = useMemo(() => {
    if (city && CITY_COORDS[city]) {
      return { lat: CITY_COORDS[city].latitude, lng: CITY_COORDS[city].longitude };
    }
    return { lat: DEFAULT_MAP_VIEW.latitude, lng: DEFAULT_MAP_VIEW.longitude };
  }, [city]);

  const initialZoom = city && CITY_COORDS[city] ? CITY_COORDS[city].zoom : DEFAULT_MAP_VIEW.zoom;

  const fitToProperties = useCallback((list: Property[]) => {
    const map = mapRef.current;
    if (!map || list.length === 0 || !window.google) return;
    const box = boundsFromProperties(list);
    if (!box) return;
    const latLngBounds = new google.maps.LatLngBounds(
      { lat: box[1], lng: box[0] },
      { lat: box[3], lng: box[2] },
    );
    map.fitBounds(latLngBounds, 56);
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      const z = map.getZoom();
      if (typeof z === "number" && z > 12.5) map.setZoom(12.5);
    });
    return () => google.maps.event.removeListener(listener);
  }, []);

  const syncViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const next = googleBoundsTuple(map);
    if (next) setBounds(next);
    const z = map.getZoom();
    if (typeof z === "number") setZoom(z);
  }, []);

  useEffect(() => {
    if (!styleLoaded || !mapRef.current) return;
    if (city && CITY_COORDS[city]) {
      mapRef.current.panTo({ lat: CITY_COORDS[city].latitude, lng: CITY_COORDS[city].longitude });
      mapRef.current.setZoom(CITY_COORDS[city].zoom);
      return;
    }
    const key = properties.map((p) => p.id).join(",");
    if (key === fittedKey.current) return;
    fittedKey.current = key;
    fitToProperties(properties);
  }, [city, properties, styleLoaded, fitToProperties]);

  useEffect(() => {
    if (!focusId || !mapRef.current) return;
    const property = byId[focusId];
    if (!property) return;
    setSelectedId(focusId);
    mapRef.current.panTo({ lat: property.latitude, lng: property.longitude });
    const z = mapRef.current.getZoom() ?? 13;
    mapRef.current.setZoom(Math.max(z, 13));
  }, [focusId, focusKey, byId, setSelectedId]);

  useEffect(() => {
    return () => {
      if (dirtyTimer.current) clearTimeout(dirtyTimer.current);
    };
  }, []);

  if (!hasGoogleMapsKey()) return <MapKeyMissing />;
  if (loadError || authFailed) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-cream/60 px-6 text-center">
        <div className="max-w-md">
          <p className="font-serif text-2xl text-forest">Google Maps blocked this key</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            In Google Cloud → APIs &amp; Services → Credentials, edit this key and under{" "}
            <span className="text-forest">Application restrictions → HTTP referrers</span> add:
          </p>
          <ul className="mt-3 space-y-1 text-left text-xs text-forest/80">
            <li>
              <code className="rounded bg-ivory px-1.5 py-0.5">http://localhost:3000/*</code>
            </li>
            <li>
              <code className="rounded bg-ivory px-1.5 py-0.5">http://localhost:3001/*</code>
            </li>
            <li>
              <code className="rounded bg-ivory px-1.5 py-0.5">https://bharwanaestates.com/*</code>
            </li>
            <li>
              <code className="rounded bg-ivory px-1.5 py-0.5">https://*.vercel.app/*</code>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Also enable <span className="text-forest">Maps JavaScript API</span> and billing. Changes can take a few minutes.
          </p>
        </div>
      </div>
    );
  }
  if (!isLoaded) return <MapLoadingSkeleton />;

  return (
    <div className="relative h-full min-h-[420px] w-full">
      {!styleLoaded && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-cream/40">
          <MapLoadingSkeleton />
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={initialCenter}
        zoom={initialZoom}
        options={mapOptions}
        onLoad={(map) => {
          mapRef.current = map;
          map.setMapTypeId(mapTypeId);
          syncViewport();
          if (!city) fitToProperties(properties);
          setStyleLoaded(true);
        }}
        onIdle={() => {
          syncViewport();
          setStyleLoaded(true);
          if (!userMoved.current) return;
          if (dirtyTimer.current) clearTimeout(dirtyTimer.current);
          dirtyTimer.current = setTimeout(() => setShowSearchArea(true), 300);
        }}
        onDragStart={() => {
          userMoved.current = true;
        }}
        onZoomChanged={() => {
          userMoved.current = true;
        }}
        onClick={() => {
          if (suppressMapClick.current) return;
          setSelectedId(null);
        }}
      >
        {points.map((point) => {
          const [longitude, latitude] = point.geometry.coordinates;
          const clusterId = point.id;
          const props = point.properties as FeatureProps & { point_count?: number; cluster?: boolean };
          const count = props.point_count;
          const propertyId = props.id;
          const property = propertyId ? byId[propertyId] : undefined;
          return (
            <OverlayViewF
              key={`${clusterId ?? propertyId}-${longitude}-${latitude}`}
              position={{ lat: latitude, lng: longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(width, height) => ({
                x: -(width / 2),
                y: -height,
              })}
            >
              <PropertyPin
                count={count}
                listingType={property?.listingType}
                price={property?.price}
                showPrice={Boolean(
                  propertyId &&
                    !count &&
                    (hoverPinId === propertyId || hoveredId === propertyId || selectedId === propertyId),
                )}
                active={propertyId === hoveredId || propertyId === selectedId}
                onHoverChange={(hovered) => setHoverPinId(hovered && propertyId ? propertyId : null)}
                onClick={(event) => {
                  event?.stopPropagation?.();
                  if (count && clusterId != null && mapRef.current) {
                    armSuppressMapClick();
                    const expansion = clusterIndex.getClusterExpansionZoom(Number(clusterId));
                    mapRef.current.panTo({ lat: latitude, lng: longitude });
                    mapRef.current.setZoom(expansion);
                    return;
                  }
                  if (!propertyId || !mapRef.current) return;
                  selectPin(propertyId);
                  mapRef.current.panTo({ lat: latitude, lng: longitude });
                  const z = mapRef.current.getZoom() ?? 13;
                  mapRef.current.setZoom(Math.max(z, 13));
                }}
              />
            </OverlayViewF>
          );
        })}
      </GoogleMap>

      <div className="pointer-events-none absolute right-3 top-3 z-30 flex flex-wrap justify-end gap-1 sm:right-4 sm:top-4">
        <div className="pointer-events-auto flex overflow-hidden rounded-md border border-forest/15 bg-ivory/95 shadow-lift">
          {MAP_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => applyMapType(mode.id)}
              className={`px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em] transition sm:px-3 ${
                mapTypeId === mode.id
                  ? "bg-forest text-ivory"
                  : "text-forest/70 hover:bg-cream hover:text-forest"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-y-0 left-0 z-30 flex items-center p-3 sm:p-4"
          >
            <div className="pointer-events-auto" onClick={(event) => event.stopPropagation()}>
              <MapPreviewCard property={selected} onClose={() => setSelectedId(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selected && (
        <button
          type="button"
          aria-label="Close property preview"
          className="absolute inset-0 z-20 cursor-default bg-transparent"
          onClick={() => setSelectedId(null)}
        />
      )}

      {showSearchArea && onBoundsSearch && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
          <Button
            className="pointer-events-auto shadow-lift"
            onClick={() => {
              const next = googleBoundsTuple(mapRef.current);
              if (!next) return;
              onBoundsSearch({
                west: next[0],
                south: next[1],
                east: next[2],
                north: next[3],
              });
              setShowSearchArea(false);
            }}
          >
            Search this area
          </Button>
        </div>
      )}

      {boundsActive && onResetBounds && (
        <div className="absolute bottom-4 left-4 z-20">
          <button
            type="button"
            className="rounded-md bg-ivory/95 px-3 py-1.5 text-xs text-forest shadow-lift underline-offset-2 hover:underline"
            onClick={() => {
              onResetBounds();
              setShowSearchArea(false);
              userMoved.current = false;
              fittedKey.current = "";
            }}
          >
            Show all
          </button>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-md bg-ivory/95 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-forest shadow-lift sm:left-auto sm:right-14 sm:translate-x-0">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-gold bg-forest" />
          Owner
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-forest bg-gold" />
          Dealer
        </span>
      </div>

      {styleLoaded && properties.length === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ivory/70 px-6 backdrop-blur-[2px]">
          <div className="max-w-sm border border-forest/10 bg-ivory p-6 text-center shadow-lift">
            <p className="font-serif text-xl text-forest">No properties match this area</p>
            <p className="mt-2 text-sm text-muted-foreground">Widen the map or clear filters to see homes again.</p>
            {onResetBounds && (
              <Button className="mt-4" onClick={onResetBounds}>
                Reset filters
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** @deprecated Prefer MapView - kept for existing imports */
export const MapCanvas = MapView;

export function MiniMap({ property }: { property: Property }) {
  const router = useRouter();
  const { isLoaded } = useJsApiLoader({
    id: "bharwana-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  if (!hasGoogleMapsKey() || !isLoaded) {
    return <div className="flex h-64 items-center justify-center bg-cream/50 text-xs text-muted-foreground">Map</div>;
  }

  return (
    <div className="relative h-64 overflow-hidden rounded-2xl">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={{ lat: property.latitude, lng: property.longitude }}
        zoom={13.5}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeId: "satellite",
          mapTypeControl: true,
          gestureHandling: "cooperative",
        }}
      >
        <OverlayViewF
          position={{ lat: property.latitude, lng: property.longitude }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(width, height) => ({ x: -(width / 2), y: -height })}
        >
          <PropertyPin listingType={property.listingType} />
        </OverlayViewF>
      </GoogleMap>
      <Button
        variant="secondary"
        className="absolute bottom-3 right-3"
        onClick={() => router.push(`/map?q=${encodeURIComponent(property.city)}`)}
      >
        View larger map
      </Button>
    </div>
  );
}
