"use client";

/** Temporary marker for a Places/Geocoder search — visually distinct from listing pins. */
export function SearchLocationPin({ label }: { label?: string }) {
  return (
    <div
      className="map-search-pin"
      aria-label={label ? `Searched: ${label}` : "Searched location"}
      role="img"
    >
      <span className="map-search-pin__ring" aria-hidden />
      <span className="map-search-pin__pulse" aria-hidden />
      <span className="map-search-pin__dot" aria-hidden />
    </div>
  );
}
