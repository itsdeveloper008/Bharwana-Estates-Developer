"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import Supercluster from "supercluster";
import "maplibre-gl/dist/maplibre-gl.css";
import { PropertyPin } from "@/components/map/property-pin";
import { MapPreviewCard } from "@/components/map/map-fallback";
import { Button } from "@/components/ui/button";
import { formatPrice, listingBadge } from "@/lib/format";
import {
  CITY_COORDS,
  DEFAULT_MAP_VIEW,
  MAP_STYLE,
  boundsFromProperties,
  warnMissingMapboxToken,
} from "@/lib/map";
import type { MapBounds, Property } from "@/lib/types";

interface FeatureProps {
  id: string;
}

function boundsFromMap(
  map: {
    getBounds: () => {
      getWest: () => number;
      getSouth: () => number;
      getEast: () => number;
      getNorth: () => number;
    } | null;
  } | null,
) {
  const b = map?.getBounds();
  if (!b) return null;
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] as [number, number, number, number];
}

function MapLoadingSkeleton() {
  return (
    <div className="flex h-full min-h-[420px] w-full items-center justify-center bg-cream/60">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full border-2 border-forest/20 border-t-gold" />
        <p className="text-xs uppercase tracking-[0.16em] text-forest/50">Loading map</p>
      </div>
    </div>
  );
}

export function MapView({
  properties,
  hoveredId,
  focusId,
  focusKey,
  boundsActive,
  onBoundsSearch,
  onResetBounds,
}: {
  properties: Property[];
  hoveredId?: string | null;
  focusId?: string | null;
  focusKey?: number;
  boundsActive?: boolean;
  onBoundsSearch?: (bounds: MapBounds) => void;
  onResetBounds?: () => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const searchParams = useSearchParams();
  const city = searchParams.get("city");
  const dirtyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMoved = useRef(false);
  const fittedKey = useRef<string>("");

  const [zoom, setZoom] = useState(DEFAULT_MAP_VIEW.zoom);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverPinId, setHoverPinId] = useState<string | null>(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);

  useEffect(() => {
    warnMissingMapboxToken();
  }, []);

  const byId = useMemo(() => {
    const lookup: Record<string, Property> = {};
    for (const property of properties) lookup[property.id] = property;
    return lookup;
  }, [properties]);

  const index = useMemo(() => {
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
    return index.getClusters(bounds, Math.round(zoom));
  }, [index, bounds, zoom]);

  const selected = selectedId ? byId[selectedId] : undefined;

  const fitToProperties = useCallback(
    (list: Property[], duration = 0) => {
      const map = mapRef.current;
      if (!map || list.length === 0) return;
      const box = boundsFromProperties(list);
      if (!box) return;
      map.fitBounds(
        [
          [box[0], box[1]],
          [box[2], box[3]],
        ],
        { padding: 56, duration, maxZoom: 12.5 },
      );
    },
    [],
  );

  useEffect(() => {
    if (city && CITY_COORDS[city] && mapRef.current) {
      mapRef.current.flyTo({
        center: [CITY_COORDS[city].longitude, CITY_COORDS[city].latitude],
        zoom: CITY_COORDS[city].zoom,
        duration: 800,
      });
      return;
    }
    const key = properties.map((p) => p.id).join(",");
    if (!styleLoaded || key === fittedKey.current) return;
    fittedKey.current = key;
    fitToProperties(properties, 600);
  }, [city, properties, styleLoaded, fitToProperties]);

  useEffect(() => {
    if (!focusId) return;
    const property = byId[focusId];
    if (!property || !mapRef.current) return;
    setSelectedId(focusId);
    mapRef.current.flyTo({
      center: [property.longitude, property.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 13),
      duration: 700,
    });
  }, [focusId, focusKey, byId]);

  useEffect(() => {
    return () => {
      if (dirtyTimer.current) clearTimeout(dirtyTimer.current);
    };
  }, []);

  return (
    <div className="relative h-full min-h-[420px] w-full">
      {!styleLoaded && (
        <div className="absolute inset-0 z-10">
          <MapLoadingSkeleton />
        </div>
      )}

      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={
          city && CITY_COORDS[city]
            ? CITY_COORDS[city]
            : DEFAULT_MAP_VIEW
        }
        onMove={(event) => {
          setZoom(event.viewState.zoom);
        }}
        onMoveEnd={(event) => {
          const next = boundsFromMap(event.target);
          if (next) setBounds(next);
          if (!userMoved.current) {
            userMoved.current = true;
            return;
          }
          if (dirtyTimer.current) clearTimeout(dirtyTimer.current);
          dirtyTimer.current = setTimeout(() => setShowSearchArea(true), 300);
        }}
        onLoad={(event) => {
          const next = boundsFromMap(event.target);
          if (next) setBounds(next);
          setStyleLoaded(true);
          if (!city) fitToProperties(properties, 0);
        }}
        onDragStart={() => {
          userMoved.current = true;
        }}
        onZoomStart={() => {
          userMoved.current = true;
        }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {points.map((point) => {
          const [longitude, latitude] = point.geometry.coordinates;
          const clusterId = point.id;
          const props = point.properties as FeatureProps & { point_count?: number; cluster?: boolean };
          const count = props.point_count;
          const propertyId = props.id;
          const property = propertyId ? byId[propertyId] : undefined;
          return (
            <Marker
              key={`${clusterId ?? propertyId}-${longitude}-${latitude}`}
              longitude={longitude}
              latitude={latitude}
              anchor="bottom"
            >
              <PropertyPin
                count={count}
                listingType={property?.listingType}
                price={property?.price}
                showPrice={Boolean(propertyId && (hoverPinId === propertyId || hoveredId === propertyId) && !count)}
                active={propertyId === hoveredId || propertyId === selectedId}
                onHoverChange={(hovered) => setHoverPinId(hovered && propertyId ? propertyId : null)}
                onClick={() => {
                  if (count && clusterId != null) {
                    const expansion = index.getClusterExpansionZoom(Number(clusterId));
                    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: expansion, duration: 500 });
                    return;
                  }
                  setSelectedId(propertyId);
                }}
              />
            </Marker>
          );
        })}
        {selected && (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            anchor="top"
            closeOnClick={false}
            onClose={() => setSelectedId(null)}
            offset={16}
            maxWidth="280px"
            className="bharwana-map-popup"
          >
            <MapPreviewCard
              title={selected.title}
              price={formatPrice(selected.price)}
              image={selected.images[0]}
              href={`/property/${selected.id}`}
              badge={listingBadge(selected.listingType)}
              listingType={selected.listingType}
              bedrooms={selected.bedrooms}
              bathrooms={selected.bathrooms}
              areaSqft={selected.areaSqft}
            />
          </Popup>
        )}
      </Map>

      {showSearchArea && onBoundsSearch && (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center">
          <Button
            className="pointer-events-auto shadow-lift"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              const next = boundsFromMap(map);
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
          Developer
        </span>
      </div>

      {styleLoaded && properties.length === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ivory/70 px-6 backdrop-blur-[2px]">
          <div className="max-w-sm border border-forest/10 bg-ivory p-6 text-center shadow-lift">
            <p className="font-serif text-xl text-forest">No residences match this area</p>
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

  useEffect(() => {
    warnMissingMapboxToken();
  }, []);

  return (
    <div className="relative h-64 overflow-hidden">
      <Map
        mapStyle={MAP_STYLE}
        initialViewState={{
          latitude: property.latitude,
          longitude: property.longitude,
          zoom: 13.5,
        }}
        attributionControl={false}
      >
        <Marker longitude={property.longitude} latitude={property.latitude} anchor="bottom">
          <PropertyPin listingType={property.listingType} />
        </Marker>
      </Map>
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
