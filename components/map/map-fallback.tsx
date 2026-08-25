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

/** Half-size preview — only shown on the map when a pin is clicked */
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
    <div className="w-[168px] overflow-hidden rounded-xl bg-white shadow-[0_12px_28px_rgba(15,46,29,0.2)]">
      <div className="relative h-[88px] w-full">
        {image.startsWith("data:") || image.startsWith("blob:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : image ? (
          <Image src={image} alt="" fill className="object-cover" sizes="168px" />
        ) : (
          <div className="h-full w-full bg-cream" />
        )}
        <Badge
          variant={property.listingType === "DIRECT_OWNER" ? "owner" : "verified"}
          className="absolute left-1.5 top-1.5 scale-90 text-[8px] uppercase"
        >
          {listingBadge(property.listingType)}
        </Badge>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-forest/60 transition hover:text-forest"
          >
            <X className="h-3 w-3" />
          </button>
        ) : null}
      </div>
      <div className="p-2.5">
        <p className="truncate font-serif text-sm leading-snug text-forest">{property.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{property.city}</p>
        <div className="mt-2 flex items-center justify-between gap-1.5">
          <p className="truncate text-[11px] font-medium text-gold-700">{formatPrice(property.price)}</p>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center rounded-full bg-forest px-2.5 py-1 text-[10px] font-medium text-ivory transition hover:bg-[#1a4a30]"
          >
            See more
          </Link>
        </div>
      </div>
    </div>
  );
}
