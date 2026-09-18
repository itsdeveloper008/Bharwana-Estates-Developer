"use client";

import { useEffect, useState } from "react";
import { GoogleMap, OverlayView, OverlayViewF, useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Search } from "lucide-react";
import { PropertyPin } from "@/components/map/property-pin";
import { Input } from "@/components/ui/input";
import {
  CITY_COORDS,
  DEFAULT_MAP_VIEW,
  GOOGLE_MAPS_API_KEY,
  MAPBOX_TOKEN,
  hasGoogleMapsKey,
  hasMapboxToken,
} from "@/lib/map";
import { CITIES } from "@/lib/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 rounded-xl border border-[#E8E2D6]/90 bg-[#FBF9F5] shadow-[inset_0_1px_2px_rgba(15,46,29,0.045)] transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-gold focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-gold/35";

export function MapPicker({
  latitude,
  longitude,
  onChange,
  showSearch = true,
}: {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  /** When false, city/address search is omitted (parent City field drives coords). */
  showSearch?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState({
    lat: latitude || DEFAULT_MAP_VIEW.latitude,
    lng: longitude || DEFAULT_MAP_VIEW.longitude,
  });
  const [zoom, setZoom] = useState(11);

  const { isLoaded } = useJsApiLoader({
    id: "bharwana-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setCenter({ lat: latitude, lng: longitude });
  }, [latitude, longitude]);

  async function searchAddress() {
    const match = CITIES.find((city) => city.toLowerCase() === query.trim().toLowerCase());
    if (match && CITY_COORDS[match]) {
      const next = CITY_COORDS[match];
      setCenter({ lat: next.latitude, lng: next.longitude });
      setZoom(next.zoom);
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
    setCenter({ lat, lng });
    setZoom(14);
    onChange({ latitude: lat, longitude: lng });
  }

  return (
    <div className="space-y-3">
      {showSearch ? (
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40"
            strokeWidth={1.5}
          />
          <Input
            value={query}
            placeholder="Search address or neighborhood, then drag the pin"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchAddress();
              }
            }}
            className={cn(fieldClass, "pl-9")}
          />
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_18px_48px_-26px_rgba(15,46,29,0.32)] ring-1 ring-[#EDE6D8]/70">
        <div className="h-72">
          {!hasGoogleMapsKey() || !isLoaded ? (
            <div className="flex h-full items-center justify-center gap-2 bg-cream/50 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-gold" />
              Loading Google Map…
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={center}
              zoom={zoom}
              options={{
                mapTypeId: "satellite",
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: "greedy",
              }}
              onClick={(event) => {
                const lat = event.latLng?.lat();
                const lng = event.latLng?.lng();
                if (lat == null || lng == null) return;
                onChange({ latitude: lat, longitude: lng });
              }}
            >
              <OverlayViewF
                position={{ lat: latitude, lng: longitude }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={(width, height) => ({ x: -(width / 2), y: -height })}
              >
                <div className="cursor-grab active:cursor-grabbing">
                  <PropertyPin />
                </div>
              </OverlayViewF>
            </GoogleMap>
          )}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {showSearch
          ? "Click the map to place the pin. Switch Map / Satellite from the control."
          : "City above centers the map. Click the map to place the pin precisely."}
      </p>
    </div>
  );
}
