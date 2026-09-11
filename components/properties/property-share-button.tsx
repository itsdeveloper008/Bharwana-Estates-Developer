"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function PropertyShareButton({ property, className }: { property: Property; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function shareUrl() {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/property/${property.id}`;
  }

  function shareText() {
    return `${property.title} — ${shareUrl()}`;
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyLink() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied");
      setOpen(false);
    } catch {
      toast.error("Could not copy link. Copy the URL from your browser bar.");
    }
  }

  function shareWhatsApp() {
    const href = `https://wa.me/?text=${encodeURIComponent(shareText())}`;
    window.open(href, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function shareNative() {
    const url = shareUrl();
    if (typeof navigator === "undefined" || !navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: property.title,
        text: property.description.slice(0, 140),
        url,
      });
      setOpen(false);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      await copyLink();
    }
  }

  return (
    <div ref={rootRef} className={cn("relative flex-1", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-forest/20 bg-transparent px-4 py-2.5 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-ivory"
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+0.5rem)] left-0 z-30 w-full min-w-[12rem] overflow-hidden rounded-xl border border-forest/10 bg-ivory py-1 shadow-[0_16px_40px_-20px_rgba(8,43,29,0.45)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={shareWhatsApp}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-forest transition-colors hover:bg-cream"
          >
            <WhatsAppGlyph className="h-4 w-4 text-[#25D366]" />
            WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void copyLink()}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-forest transition-colors hover:bg-cream"
          >
            {copied ? <Check className="h-4 w-4 text-forest" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => void shareNative()}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-forest transition-colors hover:bg-cream"
            >
              <Share2 className="h-4 w-4" />
              More…
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
