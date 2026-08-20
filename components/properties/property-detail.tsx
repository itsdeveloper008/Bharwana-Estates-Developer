"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Bath, BedDouble, Heart, Maximize2, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InquiryModal } from "@/components/inquiries/inquiry-modal";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { useFavorites } from "@/lib/favorites-context";
import { formatArea, formatDate, formatPrice, formatPriceFull, listingBadge, statusLabel } from "@/lib/format";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

const MiniMap = dynamic(() => import("@/components/map/map-canvas").then((mod) => mod.MiniMap), { ssr: false });

export function PropertyDetail({ property }: { property: Property }) {
  const [open, setOpen] = useState(false);
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(property.id);
  const ownerListing = property.listingType === "DIRECT_OWNER";

  const specs = useMemo(
    () => [
      { label: "Bedrooms", value: property.bedrooms, icon: BedDouble },
      { label: "Bathrooms", value: property.bathrooms, icon: Bath },
      { label: "Area", value: formatArea(property.areaSqft), icon: Maximize2 },
    ],
    [property],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div>
          <PropertyGallery images={property.images} title={property.title} />
          <div className="mt-10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gold-700">The residence</p>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-forest/80">{property.description}</p>
          </div>
          <div className="mt-10">
            <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-gold-700">Location</p>
            <MiniMap property={property} />
          </div>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Badge variant={ownerListing ? "owner" : "verified"} className="uppercase">
            {listingBadge(property.listingType)}
          </Badge>
          <h1 className="mt-4 font-serif text-4xl leading-tight">{property.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {property.address}, {property.city}
          </p>
          <p className="mt-6 font-serif text-4xl text-gold-700">{formatPrice(property.price)}</p>
          <p className="text-xs text-muted-foreground">{formatPriceFull(property.price)}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 border-y border-forest/10 py-5">
            {specs.map((spec) => (
              <div key={spec.label}>
                <spec.icon className="h-4 w-4 text-gold" />
                <p className="mt-2 text-sm font-medium text-forest">{spec.value}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{spec.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {statusLabel(property.status)} · Listed {formatDate(property.createdAt)}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" onClick={() => setOpen(true)}>
              {ownerListing ? "Contact owner" : "Inquire / book visit"}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => toggle(property.id)}>
                <Heart className={cn("h-4 w-4", saved && "fill-gold text-gold")} />
                {saved ? "Saved" : "Save"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => console.log("share", property.id)}
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </aside>
      </div>
      <InquiryModal property={property} open={open} onOpenChange={setOpen} />
    </div>
  );
}
