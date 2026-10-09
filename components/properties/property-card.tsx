"use client";

import Image from "next/image";
import Link from "next/link";
import { PropertySaveButton } from "@/components/properties/property-save-button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatPrice, listingBadge } from "@/lib/format";
import { propertyHighlightDisplay } from "@/lib/property-features";
import { propertyCoverImage } from "@/lib/property-images";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PropertyCard({
  property,
  layout = "grid",
  highlighted = false,
  priority = false,
  selectOnly = false,
  onHover,
  onSelect,
}: {
  property: Property;
  layout?: "grid" | "list";
  highlighted?: boolean;
  /** Eager-load cover (featured above the fold). */
  priority?: boolean;
  /**
   * Map list mode: card click selects/pans only; "See more" navigates.
   * Grid/list marketplace cards keep full-card navigation when false.
   */
  selectOnly?: boolean;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}) {
  const href = `/property/${property.id}`;
  const isList = layout === "list";
  const cover = propertyCoverImage(property.images) ?? "";
  const highlights = propertyHighlightDisplay(property).filter((item) => item.key !== "price");

  function selectProperty() {
    onSelect?.(property.id);
  }

  const image = cover ? (
    cover.startsWith("data:") || cover.startsWith("blob:") ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={cover}
        alt={property.title}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
    ) : (
      <Image
        src={cover}
        alt={property.title}
        fill
        priority={priority}
        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        sizes={isList ? "96px" : "(max-width: 768px) 100vw, 33vw"}
      />
    )
  ) : (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-cream text-[10px] uppercase tracking-[0.14em]",
        highlighted ? "text-ivory/50" : "text-muted-foreground",
      )}
    >
      No photo
    </div>
  );

  const mediaShell = (
    <div
      className={cn(
        "relative overflow-hidden",
        isList ? "h-[96px] w-full" : "aspect-[16/10] w-full",
      )}
    >
      {selectOnly ? (
        <button
          type="button"
          className="absolute inset-0 block cursor-pointer"
          aria-label={`Select ${property.title} on map`}
          onClick={(event) => {
            event.preventDefault();
            selectProperty();
          }}
        >
          {image}
        </button>
      ) : (
        <Link
          href={href}
          className="absolute inset-0 block"
          aria-label={`View ${property.title}`}
          onClick={() => onSelect?.(property.id)}
        >
          {image}
        </Link>
      )}
      <Badge
        variant={property.listingType === "DIRECT_OWNER" ? "owner" : "verified"}
        className={cn(
          "pointer-events-none absolute rounded-full uppercase",
          isList ? "left-1.5 top-1.5 scale-90 text-[8px]" : "left-2.5 top-2.5 text-[10px]",
        )}
      >
        {listingBadge(property.listingType)}
      </Badge>
      <PropertySaveButton propertyId={property.id} variant="card" />
    </div>
  );

  const seeMoreClass = isList
    ? cn(
        "mt-1 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-medium transition",
        highlighted
          ? "bg-gold text-forest hover:bg-gold-600"
          : "bg-forest text-ivory hover:bg-[#1a4a30]",
      )
    : "inline-flex shrink-0 items-center rounded-full bg-forest px-3.5 py-2 text-xs font-medium text-ivory transition hover:bg-[#1a4a30]";

  const titleBlock = (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <h3
            className={cn(
              isList ? "line-clamp-2 font-serif text-[13px] leading-snug" : "truncate font-serif text-lg leading-snug",
              highlighted && !selectOnly ? "text-ivory" : "text-forest",
            )}
          >
            {property.title}
          </h3>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs rounded-[10px] font-semibold">
          {property.title}
        </TooltipContent>
      </Tooltip>
      <p
        className={cn(
          isList ? "text-[11px]" : "mt-0.5 text-sm",
          highlighted && !selectOnly ? "text-ivory/70" : "text-muted-foreground",
        )}
      >
        {property.city}
      </p>
      <p
        className={cn(
          isList ? "text-[12px] font-medium" : "mt-2 text-sm font-medium",
          highlighted && !selectOnly ? "text-gold" : "text-gold-700",
        )}
      >
        {formatPrice(property.price)}
      </p>
    </>
  );

  return (
    <article
      data-property-id={property.id}
      className={cn(
        "group overflow-hidden border shadow-[0_8px_24px_rgba(15,46,29,0.06)] transition-all duration-300 hover:shadow-[0_10px_28px_rgba(15,46,29,0.1)]",
        isList ? "grid grid-cols-[88px_1fr] rounded-xl" : "rounded-2xl",
        selectOnly && "cursor-pointer",
        highlighted && selectOnly
          ? "border-gold bg-gold/10 ring-2 ring-gold/50"
          : highlighted
            ? "border-forest bg-forest shadow-[0_10px_28px_rgba(15,46,29,0.22)] ring-1 ring-forest"
            : "border-forest/5 bg-white",
      )}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={
        selectOnly
          ? (event) => {
              // Ignore clicks that bubbled from interactive children that stopPropagation.
              if ((event.target as HTMLElement).closest("a, button")) return;
              selectProperty();
            }
          : undefined
      }
    >
      {mediaShell}

      {isList ? (
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-2.5">
          {selectOnly ? (
            <div className="min-w-0">{titleBlock}</div>
          ) : (
            <Link href={href} className="min-w-0" onClick={() => onSelect?.(property.id)}>
              {titleBlock}
            </Link>
          )}
          <Link
            href={href}
            className={seeMoreClass}
            onClick={(event) => event.stopPropagation()}
          >
            See more
          </Link>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3 p-4">
          {selectOnly ? (
            <div className="min-w-0 flex-1">
              {titleBlock}
              {highlights.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-forest/10 pt-3">
                  {highlights.slice(0, 3).map((spec) => (
                    <div key={spec.key} className="min-w-0">
                      <spec.icon className="h-3.5 w-3.5 text-gold" />
                      <p className="mt-1 truncate text-xs font-semibold text-forest">{spec.value}</p>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        {spec.label}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href={href}
              className="min-w-0 flex-1"
              onClick={() => onSelect?.(property.id)}
            >
              {titleBlock}
              {highlights.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-forest/10 pt-3">
                  {highlights.slice(0, 3).map((spec) => (
                    <div key={spec.key} className="min-w-0">
                      <spec.icon
                        className={cn("h-3.5 w-3.5", highlighted ? "text-gold" : "text-gold")}
                      />
                      <p
                        className={cn(
                          "mt-1 truncate text-xs font-semibold",
                          highlighted ? "text-ivory" : "text-forest",
                        )}
                      >
                        {spec.value}
                      </p>
                      <p
                        className={cn(
                          "text-[9px] uppercase tracking-[0.12em]",
                          highlighted ? "text-ivory/60" : "text-muted-foreground",
                        )}
                      >
                        {spec.label}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </Link>
          )}
          <Link href={href} className={seeMoreClass} onClick={(event) => event.stopPropagation()}>
            See more
          </Link>
        </div>
      )}
    </article>
  );
}
