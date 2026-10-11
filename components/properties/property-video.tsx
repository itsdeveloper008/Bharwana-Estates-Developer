"use client";

import { useCallback, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { getEmbedUrl, getThumbnailUrl, getWatchUrl, isYouTubeVideoId } from "@/lib/youtube";

type PropertyVideoProps = {
  youtubeVideoId?: string;
  className?: string;
};

function YouTubeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.75 15.5v-7l6.5 3.5-6.5 3.5Z" />
    </svg>
  );
}

export function PropertyVideo({ youtubeVideoId, className }: PropertyVideoProps) {
  const [playing, setPlaying] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const valid = isYouTubeVideoId(youtubeVideoId);
  const id = valid ? youtubeVideoId : "";
  const watchUrl = valid ? getWatchUrl(id) : "";

  const openOnYouTube = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setPlaying(false);
      if (watchUrl) window.open(watchUrl, "_blank", "noopener,noreferrer");
    },
    [watchUrl],
  );

  if (!valid) return null;

  return (
    <div className={cn("mt-10", className)}>
      <p className="type-eyebrow">Video tour</p>
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-forest/10 bg-forest shadow-lift">
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openOnYouTube}
          aria-label="Watch on YouTube"
          className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1.5 text-[11px] font-medium text-ivory backdrop-blur-sm transition hover:bg-black/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:px-3"
        >
          <YouTubeGlyph className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Watch on YouTube</span>
        </a>

        <div className="relative aspect-video w-full">
          {playing ? (
            <iframe
              title="Property video tour"
              src={getEmbedUrl(id)}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
            />
          ) : (
            <button
              type="button"
              aria-label="Play video tour"
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 flex w-full items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold"
            >
              {!thumbFailed ? (
                // eslint-disable-next-line @next/next/no-img-element -- facade only; avoids next/image until click
                <img
                  src={getThumbnailUrl(id)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={() => setThumbFailed(true)}
                />
              ) : (
                <div className="absolute inset-0 bg-forest" aria-hidden />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/25 to-forest/10"
                aria-hidden
              />
              <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gold text-forest shadow-lift transition group-hover:scale-105 group-focus-visible:scale-105">
                <Play className="ml-0.5 h-7 w-7 fill-current" aria-hidden />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
