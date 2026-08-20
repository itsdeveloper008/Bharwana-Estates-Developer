"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Map, { Marker, NavigationControl, Popup } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import Supercluster from "supercluster";
import "mapbox-gl/dist/mapbox-gl.css";
import { PropertyPin } from "@/components/map/property-pin";
import { MapFallback, MapPreviewCard } from "@/components/map/map-fallback";
import { Button } from "@/components/ui/button";
import { formatPrice, listingBadge } from "@/lib/format";
import { CITY_COORDS, DEFAULT_MAP_VIEW, MAPBOX_TOKEN } from "@/lib/map";
import type { MapBounds, Property } from "@/lib/types";

interface FeatureProps {
  id: string;
}

function boundsFromMap(map: { getBounds: () => { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number } | null } | null) {
  const b = map?.getBounds();
  if (!b) return null;
  return [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()] as [number, number, number, number];
}

export function MapCanvas({
  properties,
  hoveredId,
  onBoundsSearch,
}: {
  properties: Property[];
  hoveredId?: string | null;
  onBoundsSearch?: (bounds: MapBounds) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const searchParams = useSearchParams();
  const city = searchParams.get("city");
  const [zoom, setZoom] = useState(DEFAULT_MAP_VIEW.zoom);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const initial = city && CITY_COORDS[city] ? CITY_COORDS[city] : DEFAULT_MAP_VIEW;

  const index = useMemo(() => {
    const cluster = new Supercluster<FeatureProps>({ radius: 72, maxZoom: 16 });
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

  const selected = properties.find((property) => property.id === selectedId);

  useEffect(() => {
    if (city && CITY_COORDS[city] && mapRef.current) {
      mapRef.current.flyTo({
        center: [CITY_COORDS[city].longitude, CITY_COORDS[city].latitude],
        zoom: CITY_COORDS[city].zoom,
        duration: 800,
      });
    }
  }, [city]);

  if (!MAPBOX_TOKEN) {
    return <MapFallback />;
  }

  return (
    <div className="relative h-full min-h-[420px] w-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        initialViewState={initial}
        onMove={(event) => {
          setZoom(event.viewState.zoom);
          const next = boundsFromMap(event.target);
          if (next) setBounds(next);
        }}
        onMoveEnd={() => setDirty(true)}
        onLoad={(event) => {
          const next = boundsFromMap(event.target);
          if (next) setBounds(next);
        }}
        attributionControl={false}
      >
        <NavigationControl position="bottom-right" showCompass={false} />
        {points.map((point) => {
          const [longitude, latitude] = point.geometry.coordinates;
          const clusterId = point.id;
          const props = point.properties as FeatureProps & { point_count?: number };
          const count = props.point_count;
          const propertyId = props.id;
          return (
            <Marker key={`${clusterId ?? propertyId}-${longitude}`} longitude={longitude} latitude={latitude} anchor="bottom">
              <PropertyPin
                count={count}
                active={propertyId === hoveredId || propertyId === selectedId}
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
            offset={12}
          >
            <MapPreviewCard
              title={selected.title}
              price={formatPrice(selected.price)}
              image={selected.images[0]}
              href={`/property/${selected.id}`}
              badge={listingBadge(selected.listingType)}
            />
          </Popup>
        )}
      </Map>
      {dirty && onBoundsSearch && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
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
              setDirty(false);
            }}
          >
            Search this area
          </Button>
        </div>
      )}
    </div>
  );
}

export function MiniMap({ property }: { property: Property }) {
  const router = useRouter();
  if (!MAPBOX_TOKEN) {
    return <MapFallback message="Mapbox token required to preview this pin." />;
  }
  return (
    <div className="relative h-64 overflow-hidden">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v11"
        initialViewState={{
          latitude: property.latitude,
          longitude: property.longitude,
          zoom: 13.5,
        }}
        attributionControl={false}
      >
        <Marker longitude={property.longitude} latitude={property.latitude} anchor="bottom">
          <PropertyPin />
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
