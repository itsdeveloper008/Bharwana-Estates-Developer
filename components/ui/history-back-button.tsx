"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Prefer browser history; fall back when opened via direct/shared URL.
 */
export function HistoryBackButton({
  fallbackHref,
  label = "Back",
  className,
  variant = "ghost",
}: {
  fallbackHref: string;
  label?: string;
  className?: string;
  variant?: "ghost" | "outline" | "link";
}) {
  const router = useRouter();

  function handleClick() {
    if (typeof window === "undefined") {
      router.push(fallbackHref);
      return;
    }
    let sameOriginReferrer = false;
    try {
      sameOriginReferrer =
        Boolean(document.referrer) &&
        new URL(document.referrer).origin === window.location.origin;
    } catch {
      sameOriginReferrer = false;
    }
    if (sameOriginReferrer || window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={handleClick}
      className={cn("-ml-2 gap-1.5 text-forest/70 hover:text-forest", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
