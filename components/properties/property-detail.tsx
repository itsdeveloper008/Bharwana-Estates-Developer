"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Bath, BedDouble, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HistoryBackButton } from "@/components/ui/history-back-button";
import { InquiryModal } from "@/components/inquiries/inquiry-modal";
import { PropertyGallery } from "@/components/properties/property-gallery";
import { PropertySaveButton } from "@/components/properties/property-save-button";
import { PropertyShareButton } from "@/components/properties/property-share-button";
import { PropertyVideo } from "@/components/properties/property-video";
import { useMockAuth } from "@/lib/mock-auth";
import { formatArea, formatDate, formatPrice, formatPriceFull, listingBadge, statusLabel } from "@/lib/format";
import { propertyHighlightDisplay } from "@/lib/property-features";
import type { Property } from "@/lib/types";

const MiniMap = dynamic(() => import("@/components/map/map-canvas").then((mod) => mod.MiniMap), { ssr: false });

function PropertyDetailInner({
  property,
  hideTitle = false,
}: {
  property: Property;
  hideTitle?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { user, isReady } = useMockAuth();
  const searchParams = useSearchParams();
  const ownerListing = property.listingType === "DIRECT_OWNER";
  const TitleTag = hideTitle ? "p" : "h1";

  useEffect(() => {
    if (!isReady) return;
    if (searchParams.get("intent") === "contact" && user) {
      setOpen(true);
    }
  }, [isReady, user, searchParams]);

  const specs = useMemo(() => {
    const highlighted = propertyHighlightDisplay(property).filter((item) => item.key !== "price");
    if (highlighted.length > 0) return highlighted;
    const category = property.category ?? "HOME";
    const area = {
      key: "area",
      label: "Area",
      value: formatArea(property.areaSqft, {
        areaValue: property.areaValue,
        areaUnit: property.areaUnit,
      }),
      icon: Maximize2,
    };
    if (category === "PLOTS" || category === "COMMERCIAL") return [area];
    return [
      { key: "bedrooms", label: "Bedrooms", value: String(property.bedrooms), icon: BedDouble },
      { key: "bathrooms", label: "Bathrooms", value: String(property.bathrooms), icon: Bath },
      area,
    ];
  }, [property]);

  const tags = property.featureTags ?? [];

  const primaryCta = ownerListing ? "How to proceed" : "Inquire / book visit";
  const callHref = "tel:+923001713811";
  const whatsappHref = `https://wa.me/923001713811?text=${encodeURIComponent(
    `Hi Bharwana Estates, I'm interested in ${property.title}`,
  )}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6 lg:pb-10">
      <div className="mb-6">
        <HistoryBackButton fallbackHref="/properties" label="Back" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:gap-12">
        <div className="min-w-0">
          <PropertyGallery images={property.images} title={property.title} />
          <div className="mt-10">
            <p className="type-eyebrow">The residence</p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-forest/80 sm:text-lg">
              {property.description}
            </p>
          </div>
          <PropertyVideo youtubeVideoId={property.youtubeVideoId} />
          <div className="mt-10">
            <p className="mb-3 type-eyebrow">Location</p>
            <MiniMap property={property} />
          </div>
        </div>
        <aside className="min-w-0 lg:sticky lg:top-[calc(var(--site-header-height)+1rem)] lg:self-start">
          <Badge variant={ownerListing ? "owner" : "verified"} className="rounded-full uppercase">
            {listingBadge(property.listingType)}
          </Badge>
          <TitleTag className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">{property.title}</TitleTag>
          <p className="mt-2 text-sm text-muted-foreground">
            {property.address}, {property.city}
          </p>
          <p className="mt-6 font-serif text-3xl text-gold-700 sm:text-4xl">{formatPrice(property.price)}</p>
          <p className="text-xs text-muted-foreground">{formatPriceFull(property.price)}</p>
          <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border-y border-forest/10 py-5">
            {specs.map((spec) => (
              <div key={spec.key ?? spec.label} className="min-w-0">
                <spec.icon className="h-4 w-4 text-gold" />
                <p className="mt-2 truncate text-sm font-semibold text-forest">{spec.value}</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{spec.label}</p>
              </div>
            ))}
          </div>
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
          <p className="mt-4 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {statusLabel(property.status)} · Listed {formatDate(property.createdAt)}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" className="w-full rounded-full" onClick={() => setOpen(true)}>
              {primaryCta}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <PropertySaveButton
                propertyId={property.id}
                showLabel
                variant="detail"
                className="w-full sm:flex-1"
              />
              <PropertyShareButton property={property} className="w-full sm:flex-1" />
            </div>
          </div>
        </aside>
      </div>

      {/* Phone sticky actions — padded page bottom so content isn't covered */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-forest/10 bg-ivory/95 px-3 pt-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-7xl gap-2">
          <a
            href={callHref}
            className="inline-flex h-11 min-w-[2.75rem] flex-1 items-center justify-center rounded-full border border-forest/20 bg-white text-sm font-medium text-forest transition hover:bg-cream"
          >
            Call
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 min-w-[2.75rem] flex-1 items-center justify-center rounded-full border border-[#25D366]/40 bg-[#25D366]/10 text-sm font-medium text-[#128C7E] transition hover:bg-[#25D366]/20"
          >
            WhatsApp
          </a>
          <Button size="lg" className="h-11 flex-[1.35] rounded-full px-3 text-sm" onClick={() => setOpen(true)}>
            {ownerListing ? "Proceed" : "Inquire"}
          </Button>
        </div>
      </div>

      <InquiryModal property={property} open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function PropertyDetail({
  property,
  hideTitle = false,
}: {
  property: Property;
  hideTitle?: boolean;
}) {
  return (
    <Suspense fallback={<div className="px-6 py-20 text-sm text-muted-foreground">Loading residence…</div>}>
      <PropertyDetailInner property={property} hideTitle={hideTitle} />
    </Suspense>
  );
}
