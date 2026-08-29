"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PropertyShareButton({ property, className }: { property: Property; className?: string }) {
  const [label, setLabel] = useState("Share");

  function shareUrl() {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/property/${property.id}`;
  }

  async function copyLink() {
    const url = shareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setLabel("Link copied ✓");
      window.setTimeout(() => setLabel("Share"), 2000);
    } catch {
      toast.error("Could not copy link. Copy the URL from your browser bar.");
    }
  }

  async function handleShare() {
    const url = shareUrl();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: property.description.slice(0, 140),
          url,
        });
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-forest/20 bg-transparent px-4 py-2.5 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-ivory",
        className,
      )}
    >
      <Share2 className="h-4 w-4" />
      {label}
    </button>
  );
}
