"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPinned, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hasMapboxToken } from "@/lib/map";
import { formatPrice, listingBadge } from "@/lib/format";
import { propertyHighlightDisplay } from "@/lib/property-features";
import { propertyCoverImage } from "@/lib/property-images";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MapFallback({ message }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[320px] items-center justify-center bg-forest px-6 text-center text-ivory">
      <div>
        <MapPinned className="mx-auto h-8 w-8 text-gold" />
        <p className="mt-4 font-serif text-2xl">Map awaits a token</p>
        <p className="mt-2 max-w-sm text-sm text-ivory/70">
          {message ??
            "Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local to render Mapbox pins. See .env.local.example. The listing grid still works from mock data."}
        </p>
        {!hasMapboxToken() && (
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-gold-800">Frontend-only · no geocoding backend</p>
        )}
      </div>
    </div>
  );
}

/** Large left-side preview — map stays visible beside it */
export function MapPreviewCard({
  property,
  onClose,
}: {
  property: Property;
  onClose?: () => void;
}) {
  const href = `/property/${property.id}`;
  const image = propertyCoverImage(property.images) ?? "";
  const highlights = propertyHighlightDisplay(property).filter((item) => item.key !== "price");
  const tags = property.featureTags ?? [];

  return (
    <div className="flex max-h-full w-[min(560px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(15,46,29,0.3)] sm:w-[580px]">
      <div className="relative aspect-[16/10] w-full shrink-0 bg-cream">
        {image.startsWith("data:") || image.startsWith("blob:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : image ? (
          <Image src={image} alt="" fill className="object-cover" sizes="580px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-cream text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            No photo
          </div>
        )}
        <Badge
          variant={property.listingType === "DIRECT_OWNER" ? "owner" : "verified"}
          className="absolute left-3 top-3 text-[10px] uppercase"
        >
          {listingBadge(property.listingType)}
        </Badge>
        {onClose ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            aria-label="Close preview"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-forest shadow-sm transition hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 sm:px-7 sm:py-6">
        <p className="font-serif text-2xl leading-snug text-forest sm:text-[1.75rem]">{property.title}</p>
        <p className="mt-2 text-sm text-muted-foreground sm:text-[15px]">
          {property.city}
          {property.address ? ` · ${property.address}` : ""}
        </p>
        {highlights.length > 0 ? (
          <div
            className={cn(
              "mt-5 grid gap-4 border-y border-forest/10 py-4",
              highlights.length === 1 && "grid-cols-1",
              highlights.length === 2 && "grid-cols-2",
              highlights.length >= 3 && "grid-cols-3",
            )}
          >
            {highlights.map((spec) => (
              <div key={spec.key} className="min-w-0">
                <spec.icon className="h-4 w-4 text-gold" />
                <p className="mt-1.5 text-sm font-semibold leading-snug text-forest sm:text-[15px]">
                  {spec.value}
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {spec.label}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-forest/10 bg-cream/80 px-3 py-1 text-xs font-medium text-forest/80"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-semibold text-gold-700 sm:text-xl">{formatPrice(property.price)}</p>
          <Link
            href={href}
            className="inline-flex items-center rounded-full bg-forest px-5 py-2.5 text-xs font-medium text-ivory transition hover:bg-[#1a4a30]"
          >
            See more
          </Link>
        </div>
      </div>
    </div>
  );
}
