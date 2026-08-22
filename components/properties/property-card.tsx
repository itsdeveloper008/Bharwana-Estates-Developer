"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/lib/favorites-context";
import { formatArea, formatPrice, listingBadge } from "@/lib/format";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

function truncate(text: string, max = 110) {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

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
  const href = `/property/${property.id}`;

  const media = (
    <>
      {property.images[0]?.startsWith("data:") || property.images[0]?.startsWith("blob:") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={property.images[0]}
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <Image
          src={property.images[0]}
          alt={property.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
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

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight text-forest">{property.title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{property.city}</p>
        </div>
        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save property"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggle(property.id);
          }}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-forest/10 bg-white text-forest/50 transition-colors hover:border-gold/40 hover:text-gold",
            saved && "border-gold/40 text-gold",
          )}
        >
          <Heart className={cn("h-4 w-4", saved && "fill-gold")} />
        </button>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {truncate(property.description)}
      </p>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
          <div>
            <p className="text-sm font-semibold text-forest">{property.bedrooms}</p>
            <p className="text-[11px] text-muted-foreground">Bedrooms</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-forest">{property.bathrooms}</p>
            <p className="text-[11px] text-muted-foreground">Bathrooms</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-forest">{formatArea(property.areaSqft).replace(" sqft", "")}</p>
            <p className="text-[11px] text-muted-foreground">Sqft</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-forest to-[#1a4a30] px-4 py-2 text-xs font-medium text-ivory shadow-sm transition group-hover:from-forest group-hover:to-gold-700">
          See more
        </span>
      </div>

      <p className="mt-3 text-sm font-medium text-gold-700">{formatPrice(property.price)}</p>
    </>
  );

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-[1.35rem] border border-forest/5 bg-white shadow-[0_8px_30px_rgba(15,46,29,0.06)] transition-shadow duration-300 hover:shadow-[0_12px_36px_rgba(15,46,29,0.1)]",
        layout === "list" && "sm:grid sm:grid-cols-[240px_1fr]",
      )}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {onSelect ? (
        <button
          type="button"
          className={cn(
            "relative block w-full overflow-hidden text-left",
            layout === "list" ? "aspect-[4/3] sm:h-full sm:min-h-[220px]" : "aspect-[16/11]",
          )}
          onClick={() => onSelect(property.id)}
        >
          {media}
        </button>
      ) : (
        <Link
          href={href}
          className={cn(
            "relative block overflow-hidden",
            layout === "list" ? "aspect-[4/3] sm:h-full sm:min-h-[220px]" : "aspect-[16/11]",
          )}
        >
          {media}
        </Link>
      )}

      {onSelect ? (
        <button type="button" className="flex w-full flex-col p-5 text-left" onClick={() => onSelect(property.id)}>
          {body}
        </button>
      ) : (
        <Link href={href} className="flex flex-col p-5">
          {body}
        </Link>
      )}
    </article>
  );
}
