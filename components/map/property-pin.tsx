"use client";

import { formatPrice } from "@/lib/format";
import type { ListingType } from "@/lib/types";
import { cn } from "@/lib/utils";

function clusterSize(count: number) {
  if (count >= 10) return "h-11 min-w-11 text-base";
  if (count >= 5) return "h-10 min-w-10 text-sm";
  return "h-9 min-w-9 text-sm";
}

export function PropertyPin({
  count,
  active,
  listingType,
  price,
  showPrice,
  onClick,
  onHoverChange,
}: {
  count?: number;
  active?: boolean;
  listingType?: ListingType;
  price?: number;
  showPrice?: boolean;
  onClick?: () => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  if (count && count > 1) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex items-center justify-center rounded-full border-2 border-forest bg-gold px-2 font-display text-forest shadow-lift transition-transform hover:scale-110",
          clusterSize(count),
          active && "scale-110 ring-2 ring-gold/60",
        )}
      >
        {count}
      </button>
    );
  }

  const isDeveloper = listingType === "BUSINESS";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className="relative block"
      aria-label="Property pin"
    >
      {showPrice && typeof price === "number" ? (
        <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-forest px-2 py-1 text-[10px] font-medium text-gold shadow-lift">
          {formatPrice(price)}
        </span>
      ) : null}
      <span
        className={cn(
          "relative mx-auto block h-7 w-7 transition-transform duration-200",
          (active || showPrice) && "scale-125",
        )}
      >
        <span
          className={cn(
            "absolute inset-0 rounded-full border-2 shadow-lift",
            isDeveloper ? "border-forest bg-gold" : "border-gold bg-forest",
          )}
        />
        <span
          className={cn(
            "absolute left-1/2 top-[78%] h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent",
            isDeveloper ? "border-t-gold" : "border-t-forest",
          )}
        />
        {!isDeveloper ? (
          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-[60%] rounded-full bg-gold" />
        ) : null}
      </span>
    </button>
  );
}
