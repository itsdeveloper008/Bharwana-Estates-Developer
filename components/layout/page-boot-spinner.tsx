"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Full-viewport boot state — ivory brand field, no white flash. */
export function PageBootSpinner({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-svh w-full flex-col items-center justify-center gap-4 bg-ivory px-6",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.webp"
        alt=""
        width={72}
        height={72}
        className="h-[72px] w-[72px] object-contain opacity-90"
      />
      <Loader2 className="h-8 w-8 animate-spin text-forest/70" aria-hidden />
      <p className="text-sm text-forest/60">{label}</p>
    </div>
  );
}
