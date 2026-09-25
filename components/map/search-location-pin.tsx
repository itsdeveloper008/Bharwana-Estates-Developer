"use client";

import { MapPin } from "lucide-react";

/** Temporary marker for a Places/Geocoder search — visually distinct from listing pins. */
export function SearchLocationPin({ label }: { label?: string }) {
  return (
    <div className="relative flex flex-col items-center" aria-label={label ? `Searched: ${label}` : "Searched location"}>
      {label ? (
        <span className="mb-1.5 max-w-[11rem] truncate rounded-lg bg-ivory px-2 py-1 text-[10px] font-medium text-forest shadow-lift ring-1 ring-forest/10">
          {label}
        </span>
      ) : null}
      <span className="relative flex h-10 w-10 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#C45C26]/35" />
        <span className="absolute inset-1 rounded-full bg-[#C45C26]/20" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-ivory bg-[#C45C26] shadow-lift">
          <MapPin className="h-4 w-4 text-ivory" strokeWidth={2.25} fill="currentColor" fillOpacity={0.25} />
        </span>
      </span>
      <span className="mt-0.5 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-[#C45C26]" />
    </div>
  );
}
