"use client";

import type { MouseEvent } from "react";
import { Building2, Home, Landmark } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { ListingType, PropertyCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

function shortPrice(amount: number) {
  return formatPrice(amount).replace(/^PKR\s*/, "");
}

function categoryLabel(category?: PropertyCategory) {
  if (category === "PLOTS") return "Plot";
  if (category === "COMMERCIAL") return "Commercial";
  return "House";
}

function CategoryIcon({ category }: { category?: PropertyCategory }) {
  const className = "map-pin__icon";
  if (category === "PLOTS") return <Landmark className={className} strokeWidth={2.25} aria-hidden />;
  if (category === "COMMERCIAL") return <Building2 className={className} strokeWidth={2.25} aria-hidden />;
  return <Home className={className} strokeWidth={2.25} aria-hidden />;
}

function clusterBadgeSize(count: number) {
  if (count >= 25) return "h-14 min-w-14 text-base";
  if (count >= 10) return "h-12 min-w-12 text-[15px]";
  return "h-10 min-w-10 text-sm";
}

export function PropertyPin({
  count,
  active,
  compact,
  listingType,
  category,
  price,
  city,
  onClick,
  onHoverChange,
}: {
  count?: number;
  active?: boolean;
  /** Low zoom: color dots only (no price text). */
  compact?: boolean;
  listingType?: ListingType;
  category?: PropertyCategory;
  price?: number;
  city?: string;
  onClick?: (event?: MouseEvent<HTMLButtonElement>) => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  if (count && count > 1) {
    return (
      <button
        type="button"
        aria-label={`${count} properties in this area`}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        className={cn(
          "map-cluster flex items-center justify-center rounded-full font-semibold tabular-nums",
          clusterBadgeSize(count),
          active && "map-cluster--active",
        )}
      >
        {count}
      </button>
    );
  }

  const isDealer = listingType === "BUSINESS";
  const priceLabel = typeof price === "number" ? shortPrice(price) : "";
  const fullPrice = typeof price === "number" ? formatPrice(price) : "";
  const aria = [categoryLabel(category), fullPrice, city].filter(Boolean).join(", ");

  return (
    <button
      type="button"
      aria-label={aria || "Property pin"}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className={cn(
        "map-pin",
        isDealer ? "map-pin--dealer" : "map-pin--owner",
        compact && "map-pin--compact",
        active && "map-pin--active",
      )}
    >
      <span className="map-pin__hit">
        <span className="map-pin__dot" aria-hidden />
        <span className="map-pin__pill">
          <CategoryIcon category={category} />
          <span className="map-pin__price">{priceLabel || "—"}</span>
        </span>
        <span className="map-pin__tail" aria-hidden />
      </span>
    </button>
  );
}

/** Mini pill swatch for the map legend (non-interactive). */
export function MapPinLegendSwatch({ variant }: { variant: "owner" | "dealer" | "search" }) {
  if (variant === "search") {
    return <span className="map-legend-search" aria-hidden />;
  }
  return (
    <span
      className={cn("map-legend-pill", variant === "dealer" ? "map-pin--dealer" : "map-pin--owner")}
      aria-hidden
    >
      <Home className="map-legend-pill__icon" strokeWidth={2.5} />
      <span className="map-legend-pill__bar" />
    </span>
  );
}
