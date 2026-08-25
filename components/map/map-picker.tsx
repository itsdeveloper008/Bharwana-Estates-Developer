"use client";

import { useState } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Search } from "lucide-react";
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
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" strokeWidth={1.5} />
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
          className="bg-white pl-9 transition-shadow duration-200 focus-visible:border-gold focus-visible:ring-gold/35"
        />
      </div>
      <div className="overflow-hidden rounded-md border border-forest/10 bg-white shadow-[0_12px_32px_-18px_rgba(15,46,29,0.35)]">
        <div className="h-72">
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
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-gold-700" strokeWidth={1.5} />
        <span>
          {latitude.toFixed(5)}, {longitude.toFixed(5)} — click the map or drag the pin.
        </span>
      </p>
    </div>
  );
}
