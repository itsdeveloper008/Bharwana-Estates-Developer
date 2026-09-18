"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const total = images.length;

  function go(delta: number) {
    if (total < 2) return;
    setActive((current) => (current + delta + total) % total);
  }

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
        {current.startsWith("data:") || current.startsWith("blob:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={title} className="h-full w-full object-cover" />
        ) : (
          <Image
            src={current}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
            priority
          />
        )}

        {total > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-forest/75 text-ivory shadow-md backdrop-blur-sm transition hover:bg-forest"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-forest/75 text-ivory shadow-md backdrop-blur-sm transition hover:bg-forest"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-forest/70 px-2.5 py-1 text-[10px] font-medium tracking-wide text-ivory backdrop-blur-sm">
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
            onClick={() => setActive(index)}
            className={cn(
              "relative aspect-[4/3] overflow-hidden",
              active === index ? "ring-1 ring-gold" : "opacity-70 hover:opacity-100",
            )}
          >
            {image.startsWith("data:") || image.startsWith("blob:") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <Image src={image} alt="" fill className="object-cover" sizes="120px" loading="lazy" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
