"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Keep Firebase / mock-store / auth out of the first paint bundle.
 * Lighthouse LCP was ~11s because ~1.7MB of JS (mostly Firebase) ran before the hero settled.
 */
const ProvidersFull = dynamic(
  () => import("@/components/providers-full").then((mod) => mod.ProvidersFull),
  { ssr: false },
);

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setReady(true);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 1600 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const timer = window.setTimeout(enable, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>;
  }

  return <ProvidersFull>{children}</ProvidersFull>;
}
