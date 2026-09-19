"use client";

import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function isInlineImageSrc(src: string) {
  return src.startsWith("data:") || src.startsWith("blob:");
}

function GalleryImage({
  src,
  alt,
  fill = false,
  priority = false,
  className,
  sizes,
  onLoad,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
  onLoad?: () => void;
}) {
  if (isInlineImageSrc(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(fill ? "h-full w-full object-cover" : className)}
        onLoad={onLoad}
      />
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
        onLoad={onLoad}
      />
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={1600}
      height={1200}
      className={className}
      sizes={sizes}
      quality={85}
      priority={priority}
      onLoad={onLoad}
    />
  );
}

function preloadAdjacentImages(images: string[], active: number) {
  if (images.length < 2 || typeof window === "undefined") return;
  const total = images.length;
  const neighbors = [
    images[(active - 1 + total) % total],
    images[(active + 1) % total],
  ].filter(Boolean) as string[];

  for (const src of neighbors) {
    if (isInlineImageSrc(src)) continue;
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
  }
}

export function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxLoading, setLightboxLoading] = useState(false);
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

  useEffect(() => {
    if (!lightboxOpen) {
      setLightboxLoading(false);
      return;
    }
    setLightboxLoading(true);
    preloadAdjacentImages(images, active);
    // Cached images may not fire onLoad reliably; clear spinner as a safety net.
    const safety = window.setTimeout(() => setLightboxLoading(false), 4_000);
    return () => window.clearTimeout(safety);
  }, [lightboxOpen, active, images]);

  const adjacentForOptimizer = useMemo(() => {
    if (!lightboxOpen || total < 2) return [] as string[];
    const prev = images[(active - 1 + total) % total];
    const next = images[(active + 1) % total];
    return [prev, next].filter(
      (src): src is string => Boolean(src) && src !== images[active] && !isInlineImageSrc(src),
    );
  }, [lightboxOpen, active, images, total]);

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
              {lightboxLoading ? (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center"
                  aria-hidden
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-40 w-56 animate-pulse rounded-md bg-white/10 sm:h-52 sm:w-72" />
                    <Loader2 className="h-6 w-6 animate-spin text-white/80" />
                  </div>
                </div>
              ) : null}

              {isInlineImageSrc(current) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={current}
                  src={current}
                  alt={title}
                  className={cn(
                    "max-h-[82vh] w-auto max-w-full object-contain transition-opacity duration-200",
                    lightboxLoading ? "opacity-0" : "opacity-100",
                  )}
                  onLoad={() => setLightboxLoading(false)}
                />
              ) : (
                <Image
                  key={current}
                  src={current}
                  alt={title}
                  width={1600}
                  height={1200}
                  sizes="(max-width: 1100px) 96vw, 1100px"
                  quality={85}
                  priority
                  className={cn(
                    "max-h-[82vh] h-auto w-auto max-w-full object-contain transition-opacity duration-200",
                    lightboxLoading ? "opacity-0" : "opacity-100",
                  )}
                  onLoad={() => setLightboxLoading(false)}
                />
              )}

              {/* Warm Next.js optimizer cache for neighbors (same sizes/quality as lightbox). */}
              {adjacentForOptimizer.map((src) => (
                <Image
                  key={`preload-${src.slice(0, 48)}`}
                  src={src}
                  alt=""
                  width={1600}
                  height={1200}
                  sizes="(max-width: 1100px) 96vw, 1100px"
                  quality={85}
                  className="pointer-events-none fixed left-[-9999px] top-0 h-px w-px opacity-0"
                  aria-hidden
                />
              ))}

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
                  <span className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-xs text-white">
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
