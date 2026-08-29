"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function PropertyGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-3">
        <div className="relative aspect-[16/10] overflow-hidden bg-cream">
        {images[active]?.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={images[active]} alt={title} className="h-full w-full object-cover" />
        ) : (
          <Image
            src={images[active]}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 70vw"
            priority
          />
        )}
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
            {image.startsWith("data:") ? (
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
