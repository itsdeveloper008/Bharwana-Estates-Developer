"use client";

import { useEffect, useState } from "react";
import { GoogleMap, OverlayView, OverlayViewF, useJsApiLoader } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { PlaceSearchInput } from "@/components/map/place-search-input";
import { PropertyPin } from "@/components/map/property-pin";
import {
  DEFAULT_MAP_VIEW,
  GOOGLE_MAPS_API_KEY,
  GOOGLE_MAPS_LIBRARIES,
  PLACE_SEARCH_ZOOM,
  hasGoogleMapsKey,
} from "@/lib/map";

export function MapPicker({
  latitude,
  longitude,
  onChange,
  showSearch = true,
}: {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  /** When false, address search is omitted (parent City field drives coords). */
  showSearch?: boolean;
}) {
  const [center, setCenter] = useState({
    lat: latitude || DEFAULT_MAP_VIEW.latitude,
    lng: longitude || DEFAULT_MAP_VIEW.longitude,
  });
  const [zoom, setZoom] = useState(11);

  const { isLoaded } = useJsApiLoader({
    id: "bharwana-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setCenter({ lat: latitude, lng: longitude });
  }, [latitude, longitude]);

  return (
    <div className="space-y-3">
      {showSearch && isLoaded ? (
        <PlaceSearchInput
          placeholder="Search address or neighborhood, then drag the pin"
          onPlaceSelected={(result) => {
            setCenter({ lat: result.latitude, lng: result.longitude });
            setZoom(PLACE_SEARCH_ZOOM);
            onChange({ latitude: result.latitude, longitude: result.longitude });
          }}
        />
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
          ? "Search a place or click the map to place the pin. Switch Map / Satellite from the control."
          : "City above centers the map. Click the map to place the pin precisely."}
      </p>
    </div>
  );
}
