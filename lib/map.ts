export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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
