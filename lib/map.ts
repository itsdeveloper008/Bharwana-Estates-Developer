import type { Property } from "@/lib/types";

/** Optional. Used only for Mapbox Geocoding in the listing pin picker. */
export const MAPBOX_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "").trim();

export function hasMapboxToken() {
  return MAPBOX_TOKEN.length > 0;
}

export function warnMissingMapboxToken() {
  if (process.env.NODE_ENV !== "development") return;
  if (hasMapboxToken()) return;
  console.info(
    "[Bharwana] Map uses free MapLibre tiles (no token required). Optional NEXT_PUBLIC_MAPBOX_TOKEN enables address geocoding in the property form.",
  );
}

/** Light basemap that fits ivory/charcoal (no API key). */
export const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export const DEFAULT_MAP_VIEW = {
  latitude: 31.52,
  longitude: 74.34,
  zoom: 5.5,
};

export const CITY_COORDS: Record<string, { latitude: number; longitude: number; zoom: number }> = {
  Lahore: { latitude: 31.5204, longitude: 74.3587, zoom: 11.2 },
  Islamabad: { latitude: 33.6844, longitude: 73.0479, zoom: 11 },
  Karachi: { latitude: 24.8607, longitude: 67.0011, zoom: 10.6 },
  Rawalpindi: { latitude: 33.5651, longitude: 73.0169, zoom: 11.4 },
  Faisalabad: { latitude: 31.4504, longitude: 73.135, zoom: 11.4 },
  Multan: { latitude: 30.1575, longitude: 71.5249, zoom: 11.4 },
};

/** [west, south, east, north] */
export function boundsFromProperties(properties: Pick<Property, "latitude" | "longitude">[]): [number, number, number, number] | null {
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
