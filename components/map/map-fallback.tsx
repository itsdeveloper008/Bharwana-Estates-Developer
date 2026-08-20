"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPinned } from "lucide-react";
import { MAPBOX_TOKEN } from "@/lib/map";

export function MapFallback({ message }: { message?: string }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-forest px-6 text-center text-ivory">
      <MapPinned className="h-8 w-8 text-gold" />
      <p className="mt-4 font-serif text-2xl">Map awaits a token</p>
      <p className="mt-2 max-w-sm text-sm text-ivory/70">
        {message ??
          "Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local to render Mapbox pins. The listing grid still works from mock data."}
      </p>
      {!MAPBOX_TOKEN && (
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
}: {
  title: string;
  price: string;
  image: string;
  href: string;
  badge: string;
}) {
  return (
    <Link href={href} className="block w-56 overflow-hidden bg-ivory text-left">
      <div className="relative h-28 w-full">
        <Image src={image} alt="" fill className="object-cover" sizes="224px" />
      </div>
      <div className="p-3">
        <p className="text-[10px] uppercase tracking-[0.14em] text-gold-700">{badge}</p>
        <p className="mt-1 font-serif text-lg text-gold-700">{price}</p>
        <p className="mt-0.5 line-clamp-2 text-sm text-forest">{title}</p>
      </div>
    </Link>
  );
}
