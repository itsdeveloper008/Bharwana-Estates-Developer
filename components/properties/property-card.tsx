"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatPrice, listingBadge } from "@/lib/format";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PropertyCard({
  property,
  layout = "grid",
  highlighted = false,
  onHover,
  onSelect,
}: {
  property: Property;
  layout?: "grid" | "list";
  highlighted?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}) {
  const href = `/property/${property.id}`;
  const isList = layout === "list";

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
          sizes={isList ? "96px" : "(max-width: 768px) 100vw, 33vw"}
        />
      )}
      <Badge
        variant={property.listingType === "DIRECT_OWNER" ? "owner" : "verified"}
        className={cn(
          "absolute uppercase",
          isList ? "left-1.5 top-1.5 scale-90 text-[8px]" : "left-2.5 top-2.5 text-[10px]",
        )}
      >
        {listingBadge(property.listingType)}
      </Badge>
    </>
  );

  const body = isList ? (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-2.5">
      <h3
        className={cn(
          "line-clamp-2 font-serif text-[13px] leading-snug",
          highlighted ? "text-ivory" : "text-forest",
        )}
      >
        {property.title}
      </h3>
      <p className={cn("text-[11px]", highlighted ? "text-ivory/70" : "text-muted-foreground")}>
        {property.city}
      </p>
      <p className={cn("text-[12px] font-medium", highlighted ? "text-gold" : "text-gold-700")}>
        {formatPrice(property.price)}
      </p>
      <span
        className={cn(
          "mt-1 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-medium transition",
          highlighted
            ? "bg-gold text-forest group-hover:bg-gold-600"
            : "bg-forest text-ivory group-hover:bg-[#1a4a30]",
        )}
      >
        See more
      </span>
    </div>
  ) : (
    <div className="flex items-end justify-between gap-3 p-4">
      <div className="min-w-0">
        <h3 className="truncate font-serif text-lg leading-snug text-forest">{property.title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{property.city}</p>
        <p className="mt-2 text-sm font-medium text-gold-700">{formatPrice(property.price)}</p>
      </div>
      <span className="inline-flex shrink-0 items-center rounded-full bg-forest px-3.5 py-2 text-xs font-medium text-ivory transition group-hover:bg-[#1a4a30]">
        See more
      </span>
    </div>
  );

  return (
    <article
      className={cn(
        "group overflow-hidden border shadow-[0_8px_24px_rgba(15,46,29,0.06)] transition-all duration-300 hover:shadow-[0_10px_28px_rgba(15,46,29,0.1)]",
        isList ? "grid grid-cols-[88px_1fr] rounded-xl" : "rounded-2xl",
        highlighted
          ? "border-forest bg-forest shadow-[0_10px_28px_rgba(15,46,29,0.22)] ring-1 ring-forest"
          : "border-forest/5 bg-white",
      )}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      {onSelect ? (
        <button
          type="button"
          className={cn(
            "relative block overflow-hidden text-left",
            isList ? "h-[96px] w-full" : "aspect-[16/10] w-full",
          )}
          onClick={() => onSelect(property.id)}
        >
          {media}
        </button>
      ) : (
        <Link
          href={href}
          className={cn("relative block overflow-hidden", isList ? "h-[96px] w-full" : "aspect-[16/10]")}
        >
          {media}
        </Link>
      )}

      {onSelect ? (
        <button type="button" className="flex w-full flex-col text-left" onClick={() => onSelect(property.id)}>
          {body}
        </button>
      ) : (
        <Link href={href} className="flex flex-col">
          {body}
        </Link>
      )}
    </article>
  );
}
