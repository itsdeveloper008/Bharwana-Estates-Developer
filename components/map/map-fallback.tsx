"use client";

import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, MapPinned, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatArea } from "@/lib/format";
import { hasMapboxToken } from "@/lib/map";
import type { ListingType } from "@/lib/types";

export function MapFallback({ message }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-forest px-6 text-center text-ivory">
      <MapPinned className="h-8 w-8 text-gold" />
      <p className="mt-4 font-serif text-2xl">Map awaits a token</p>
      <p className="mt-2 max-w-sm text-sm text-ivory/70">
        {message ??
          "Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local to render Mapbox pins. See .env.local.example. The listing grid still works from mock data."}
      </p>
      {!hasMapboxToken() && (
        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-gold">Frontend-only · no geocoding backend</p>
      )}
    </div>
  );
}

export function MapPreviewCard({
  title,
  price,
  image,
  href,
  badge,
  listingType,
  bedrooms,
  bathrooms,
  areaSqft,
}: {
  title: string;
  price: string;
  image: string;
  href: string;
  badge: string;
  listingType: ListingType;
  bedrooms: number;
  bathrooms: number;
  areaSqft: number;
}) {
  return (
    <div className="w-64 overflow-hidden bg-ivory text-left shadow-lift">
      <div className="relative h-28 w-full">
        {image.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <Image src={image} alt="" fill className="object-cover" sizes="256px" />
        )}
        <Badge
          variant={listingType === "DIRECT_OWNER" ? "owner" : "verified"}
          className="absolute left-2 top-2 text-[9px] uppercase"
        >
          {badge}
        </Badge>
      </div>
      <div className="p-3">
        <p className="font-serif text-lg text-gold-700">{price}</p>
        <p className="mt-0.5 line-clamp-2 text-sm font-medium text-forest">{title}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.1em] text-forest/65">
          <span className="inline-flex items-center gap-1">
            <BedDouble className="h-3 w-3" /> {bedrooms}
          </span>
          <span className="inline-flex items-center gap-1">
            <Bath className="h-3 w-3" /> {bathrooms}
          </span>
          <span className="inline-flex items-center gap-1">
            <Maximize2 className="h-3 w-3" /> {formatArea(areaSqft)}
          </span>
        </div>
        <Button asChild size="sm" className="mt-3 w-full">
          <Link href={href}>View details</Link>
        </Button>
      </div>
    </div>
  );
}
