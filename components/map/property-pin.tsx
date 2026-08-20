"use client";

import { cn } from "@/lib/utils";

export function PropertyPin({
  count,
  active,
  onClick,
}: {
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  if (count && count > 1) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 border-forest bg-gold px-2 font-display text-sm text-forest shadow-lift"
      >
        {count}
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className="relative block h-6 w-6" aria-label="Property pin">
      <span
        className={cn(
          "absolute inset-0 rounded-full border-2 border-forest bg-gold shadow-lift transition-transform",
          active && "scale-125",
        )}
      />
      <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-forest" />
    </button>
  );
}
