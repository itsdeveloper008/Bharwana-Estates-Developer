"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPinned, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hasMapboxToken } from "@/lib/map";
import { formatPrice, listingBadge } from "@/lib/format";
import type { Property } from "@/lib/types";

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
          <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-gold">Frontend-only · no geocoding backend</p>
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
  const image = property.images[0] ?? "";

  return (
    <div className="flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,46,29,0.28)] sm:w-[440px]">
      <div className="relative aspect-[16/11] w-full bg-cream">
        {image.startsWith("data:") || image.startsWith("blob:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : image ? (
          <Image src={image} alt="" fill className="object-cover" sizes="440px" />
        ) : (
          <div className="h-full w-full bg-cream" />
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
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        <p className="font-serif text-xl leading-snug text-forest sm:text-2xl">{property.title}</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {property.city}
          {property.address ? ` · ${property.address}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-medium text-gold-700 sm:text-lg">{formatPrice(property.price)}</p>
          <Link
            href={href}
            className="inline-flex items-center rounded-full bg-forest px-4 py-2 text-xs font-medium text-ivory transition hover:bg-[#1a4a30]"
          >
            See more
          </Link>
        </div>
      </div>
    </div>
  );
}
