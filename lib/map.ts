import type { Property } from "@/lib/types";

/** Google Maps JavaScript API - /map view + map type modes (roadmap / satellite / hybrid / terrain). */
export const GOOGLE_MAPS_API_KEY = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();

/** Must match every useJsApiLoader / Loader call that shares GOOGLE_MAPS_LOADER_ID. */
export const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

/**
 * Loader id + options must be identical everywhere (preload, useJsApiLoader, PlaceSearchInput).
 * @react-google-maps/api's useJsApiLoader defaults language/region/authReferrerPolicy — preload
 * used to omit those, which threw:
 * "Loader must not be called again with different options."
 */
export const GOOGLE_MAPS_LOADER_ID = "bharwana-google-maps";

export const GOOGLE_MAPS_LOADER_OPTIONS = {
  id: GOOGLE_MAPS_LOADER_ID,
  apiKey: GOOGLE_MAPS_API_KEY,
  version: "weekly",
  libraries: GOOGLE_MAPS_LIBRARIES,
  language: "en",
  region: "US",
  mapIds: [] as string[],
  nonce: "",
  authReferrerPolicy: "origin" as const,
};

/** Props for @react-google-maps/api useJsApiLoader — must stay aligned with GOOGLE_MAPS_LOADER_OPTIONS. */
export const GOOGLE_MAPS_JS_API_LOADER_PROPS = {
  id: GOOGLE_MAPS_LOADER_ID,
  googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  version: "weekly" as const,
  libraries: GOOGLE_MAPS_LIBRARIES,
  language: "en",
  region: "US",
  preventGoogleFontsLoading: true,
};

/** Neighborhood / street zoom after a place search result. */
export const PLACE_SEARCH_ZOOM = 15;

export function hasGoogleMapsKey() {
  return GOOGLE_MAPS_API_KEY.length > 0;
}

export function warnMissingMapKeys() {
  if (process.env.NODE_ENV !== "development") return;
  if (!hasGoogleMapsKey()) {
    console.warn(
      "[Bharwana] Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY - enable Maps JavaScript API, Places API, and Geocoding API, then add the key to .env.local.",
    );
  }
}

function placesAvailable() {
  return Boolean(typeof window !== "undefined" && window.google?.maps?.places);
}

let googleMapsPreload: Promise<void> | null = null;

/**
 * Single shared Maps JS + places load. Safe to call from navbar preload, /map, and PlaceSearchInput.
 */
export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!hasGoogleMapsKey()) {
    return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));
  }
  if (placesAvailable()) return Promise.resolve();
  if (googleMapsPreload) return googleMapsPreload;

  googleMapsPreload = import("@googlemaps/js-api-loader")
    .then(async ({ Loader }) => {
      try {
        await new Loader({ ...GOOGLE_MAPS_LOADER_OPTIONS }).load();
      } catch (error) {
        // Another caller already constructed Loader with matching or prior options.
        if (placesAvailable()) return;
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("different options")) {
          // Wait briefly for the in-flight script from the other Loader instance.
          const deadline = Date.now() + 8000;
          while (Date.now() < deadline) {
            if (placesAvailable()) return;
            await new Promise((resolve) => window.setTimeout(resolve, 50));
          }
        }
        throw error instanceof Error ? error : new Error(message);
      }
      if (!placesAvailable()) {
        throw new Error("Google Maps loaded but places library is unavailable");
      }
    })
    .catch((error) => {
      googleMapsPreload = null;
      throw error;
    });

  return googleMapsPreload;
}

/**
 * Start downloading the Maps JS API as early as possible (same options as useJsApiLoader).
 */
export function preloadGoogleMaps() {
  return loadGoogleMapsScript().catch((error) => {
    console.warn("[Bharwana] Google Maps preload failed", error);
  });
}

/** Default map camera — Multan (primary market); avoids loading all of Pakistan first. */
export const DEFAULT_MAP_VIEW = {
  latitude: 30.1575,
  longitude: 71.5249,
  zoom: 11.4,
};

export const CITY_COORDS: Record<string, { latitude: number; longitude: number; zoom: number }> = {
  Lahore: { latitude: 31.5204, longitude: 74.3587, zoom: 11.2 },
  Islamabad: { latitude: 33.6844, longitude: 73.0479, zoom: 11 },
  Karachi: { latitude: 24.8607, longitude: 67.0011, zoom: 10.6 },
  Rawalpindi: { latitude: 33.5651, longitude: 73.0169, zoom: 11.4 },
  Faisalabad: { latitude: 31.4504, longitude: 73.135, zoom: 11.4 },
  Multan: { latitude: 30.1575, longitude: 71.5249, zoom: 11.4 },
};

/** Hard search scope rectangles [south, west, north, east] in degrees. */
export type CityBoundsLiteral = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const CITY_BOUNDS_OVERRIDE: Partial<Record<string, CityBoundsLiteral>> = {
  // Multan metro — explicit so DHA Sector M Lahore cannot win under Multan scope.
  Multan: { south: 29.95, west: 71.3, north: 30.35, east: 71.75 },
};

/** ±0.2° around city center when no override is defined. */
const CITY_BOUNDS_PAD_DEG = 0.2;

export function cityBoundsLiteral(city: string): CityBoundsLiteral | null {
  const override = CITY_BOUNDS_OVERRIDE[city];
  if (override) return override;
  const center = CITY_COORDS[city];
  if (!center) return null;
  return {
    south: center.latitude - CITY_BOUNDS_PAD_DEG,
    west: center.longitude - CITY_BOUNDS_PAD_DEG,
    north: center.latitude + CITY_BOUNDS_PAD_DEG,
    east: center.longitude + CITY_BOUNDS_PAD_DEG,
  };
}

export function pointInCityBounds(lat: number, lng: number, city: string): boolean {
  const b = cityBoundsLiteral(city);
  if (!b) return true;
  return lat >= b.south && lat <= b.north && lng >= b.west && lng <= b.east;
}

/** Append city for Geocoder retries: `"DHA Sector M, Multan"`. */
export function formatScopedAddress(text: string, city: string | null | undefined): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (!city || city === "ALL") return trimmed;
  const lower = trimmed.toLowerCase();
  if (lower.includes(city.toLowerCase())) return trimmed;
  return `${trimmed}, ${city}`;
}

/** Match a Google locality string to one of our city keys. */
export function matchKnownCity(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const lower = raw.trim().toLowerCase();
  for (const name of Object.keys(CITY_COORDS)) {
    if (lower === name.toLowerCase() || lower.includes(name.toLowerCase())) return name;
  }
  return null;
}

/** [west, south, east, north] */
export function boundsFromProperties(
  properties: Pick<Property, "latitude" | "longitude">[],
): [number, number, number, number] | null {
  if (properties.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const property of properties) {
    west = Math.min(west, property.longitude);
    east = Math.max(east, property.longitude);
    south = Math.min(south, property.latitude);
    north = Math.max(north, property.latitude);
  }
  if (!Number.isFinite(west)) return null;
  const padLng = Math.max((east - west) * 0.12, 0.08);
  const padLat = Math.max((north - south) * 0.12, 0.08);
  return [west - padLng, south - padLat, east + padLng, north + padLat];
}

export function googleBoundsTuple(map: google.maps.Map | null): [number, number, number, number] | null {
  const b = map?.getBounds();
  if (!b) return null;
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  return [sw.lng(), sw.lat(), ne.lng(), ne.lat()];
}
