"use client";

import { useState } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { PropertyPin } from "@/components/map/property-pin";
import { Input } from "@/components/ui/input";
import { CITY_COORDS, DEFAULT_MAP_VIEW, MAP_STYLE, MAPBOX_TOKEN, hasMapboxToken } from "@/lib/map";
import { CITIES } from "@/lib/types";

export function MapPicker({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState({
    latitude: latitude || DEFAULT_MAP_VIEW.latitude,
    longitude: longitude || DEFAULT_MAP_VIEW.longitude,
    zoom: 11,
  });

  async function searchAddress() {
    const match = CITIES.find((city) => city.toLowerCase() === query.trim().toLowerCase());
    if (match && CITY_COORDS[match]) {
      const next = CITY_COORDS[match];
      setView({ ...next });
      onChange({ latitude: next.latitude, longitude: next.longitude });
      return;
    }
    if (!hasMapboxToken() || !query.trim()) return;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=pk&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    const feature = data.features?.[0];
    if (!feature) return;
    const [lng, lat] = feature.center as [number, number];
    setView({ latitude: lat, longitude: lng, zoom: 14 });
    onChange({ latitude: lat, longitude: lng });
  }

  return (
    <div className="space-y-3">
      <Input
        value={query}
        placeholder="Search a city (e.g. Lahore), then drag the pin"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void searchAddress();
          }
        }}
        className="bg-white"
      />
      <div className="h-72 overflow-hidden">
        <Map
          mapStyle={MAP_STYLE}
          {...view}
          onMove={(event) => setView(event.viewState)}
          onClick={(event) => {
            onChange({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
          }}
          attributionControl={false}
        >
          <Marker
            latitude={latitude}
            longitude={longitude}
            anchor="bottom"
            draggable
            onDragEnd={(event) => onChange({ latitude: event.lngLat.lat, longitude: event.lngLat.lng })}
          >
            <PropertyPin />
          </Marker>
        </Map>
      </div>
      <p className="text-xs text-muted-foreground">
        {latitude.toFixed(5)}, {longitude.toFixed(5)}, click the map or drag the pin.
      </p>
    </div>
  );
}
