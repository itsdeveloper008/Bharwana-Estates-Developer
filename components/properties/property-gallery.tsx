"use client";

import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function GalleryImage({
  src,
  alt,
  fill = false,
  priority = false,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={cn(fill ? "h-full w-full object-cover" : className)} />
    );
  }
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={cn("object-cover", className)}
        sizes={sizes}
        priority={priority}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}

export function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const total = images.length;

  function go(delta: number) {
    if (total < 2) return;
    setActive((current) => (current + delta + total) % total);
  }

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, total, active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (total === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center bg-cream text-sm text-muted-foreground">
        No photos
      </div>
    );
  }

  const current = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden bg-cream">
        <button
          type="button"
          className="absolute inset-0 block h-full w-full cursor-zoom-in"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View full size photo of ${title}`}
        >
          <GalleryImage
            src={current}
            alt={title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 70vw"
          />
        </button>

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-forest/75 text-ivory shadow-md backdrop-blur-sm transition hover:bg-forest"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-forest/75 text-ivory shadow-md backdrop-blur-sm transition hover:bg-forest"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 z-10 rounded-full bg-forest/70 px-2.5 py-1 text-[10px] font-medium tracking-wide text-ivory backdrop-blur-sm">
              {active + 1} / {total}
            </span>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {images.map((image, index) => (
          <button
            key={`${index}-${image.slice(0, 24)}`}
            type="button"
            onClick={() => {
              setActive(index);
              setLightboxOpen(true);
            }}
            className={cn(
              "relative aspect-[4/3] overflow-hidden",
              active === index ? "ring-1 ring-gold" : "opacity-70 hover:opacity-100",
            )}
            aria-label={`Open photo ${index + 1}`}
          >
            <GalleryImage src={image} alt="" fill sizes="120px" />
          </button>
        ))}
      </div>

      <DialogPrimitive.Root open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed left-1/2 top-1/2 z-50 flex w-[min(96vw,1100px)] max-w-none -translate-x-1/2 -translate-y-1/2 flex-col outline-none"
            onOpenAutoFocus={(event) => event.preventDefault()}
            aria-describedby={undefined}
          >
            <DialogPrimitive.Title className="sr-only">{title} photo gallery</DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="absolute right-0 top-0 z-20 flex h-10 w-10 -translate-y-12 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label="Close photo viewer"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>

            <div className="relative flex min-h-[50vh] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current}
                alt={title}
                className="max-h-[82vh] w-auto max-w-full object-contain"
              />

              {total > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => go(-1)}
                    aria-label="Previous photo"
                    className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 sm:left-3"
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => go(1)}
                    aria-label="Next photo"
                    className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 sm:right-3"
                  >
                    <ChevronRight className="h-6 w-6" strokeWidth={1.75} />
                  </button>
                  <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
                    {active + 1} / {total}
                  </span>
                </>
              ) : null}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
