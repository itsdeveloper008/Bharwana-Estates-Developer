"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useState } from "react";
import { SaveAuthDialog } from "@/components/properties/save-auth-dialog";
import { useFavorites } from "@/lib/favorites-context";
import { useMockAuth } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

export function PropertySaveButton({
  propertyId,
  className,
  showLabel = false,
  variant = "detail",
}: {
  propertyId: string;
  className?: string;
  showLabel?: boolean;
  variant?: "detail" | "card";
}) {
  const { user } = useMockAuth();
  const { isSaved, toggle } = useFavorites();
  const [authOpen, setAuthOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const saved = isSaved(propertyId);

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    toggle(propertyId);
    setPulse(true);
    window.setTimeout(() => setPulse(false), 300);
  }

  const heart = (
    <motion.span
      animate={pulse ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="inline-flex"
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          saved ? "fill-gold text-gold" : variant === "card" ? "text-ivory" : "text-forest",
        )}
      />
    </motion.span>
  );

  if (variant === "card") {
    return (
      <>
        <button
          type="button"
          aria-label={saved ? "Remove from saved" : "Save residence"}
          onClick={handleClick}
          className={cn(
            "absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-forest/70 backdrop-blur-sm transition-colors hover:bg-forest",
            className,
          )}
        >
          {heart}
        </button>
        <SaveAuthDialog propertyId={propertyId} open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-forest/20 bg-transparent px-4 py-2.5 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-ivory",
          saved && "border-gold/40 bg-gold/10 text-gold-700 hover:bg-gold/15 hover:text-gold-700",
          className,
        )}
      >
        {heart}
        {showLabel ? (saved ? "Saved" : "Save") : null}
      </button>
      <SaveAuthDialog propertyId={propertyId} open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
