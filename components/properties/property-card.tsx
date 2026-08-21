"use client";

import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Heart, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/favorites-context";
import { formatArea, formatPrice, listingBadge } from "@/lib/format";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PropertyCard({
  property,
  layout = "grid",
  onHover,
  onSelect,
}: {
  property: Property;
  layout?: "grid" | "list";
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}) {
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(property.id);

  const media = (
    <>
      {property.images[0]?.startsWith("data:") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={property.images[0]}
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      )}
      <Badge
        variant={property.listingType === "DIRECT_OWNER" ? "owner" : "verified"}
        className="absolute left-3 top-3 text-[10px] uppercase"
      >
        {listingBadge(property.listingType)}
      </Badge>
    </>
  );

  return (
    <article
      className={cn(
        "group overflow-hidden bg-card transition-shadow duration-300 hover:shadow-lift",
        layout === "list" && "grid grid-cols-1 sm:grid-cols-[220px_1fr]",
      )}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {onSelect ? (
        <button
          type="button"
          className="relative block aspect-[4/3] w-full overflow-hidden text-left"
          onClick={() => onSelect(property.id)}
        >
          {media}
        </button>
      ) : (
        <Link href={`/property/${property.id}`} className="relative block aspect-[4/3] overflow-hidden">
          {media}
        </Link>
      )}
      <div className="flex flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-xl text-gold-700">{formatPrice(property.price)}</p>
            <Link href={`/property/${property.id}`} className="mt-1 block font-medium text-forest hover:text-gold-700">
              {property.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
              {property.address}, {property.city}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={saved ? "Remove from saved" : "Save property"}
            onClick={() => toggle(property.id)}
            className={cn(saved && "text-gold")}
          >
            <Heart className={cn("h-4 w-4", saved && "fill-gold")} />
          </Button>
        </div>
        <div className="mt-4 flex gap-4 text-xs uppercase tracking-[0.12em] text-forest/70">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" /> {property.bedrooms} bed
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" /> {property.bathrooms} bath
          </span>
          <span className="inline-flex items-center gap-1">
            <Maximize2 className="h-3.5 w-3.5" /> {formatArea(property.areaSqft)}
          </span>
        </div>
      </div>
    </article>
  );
}
