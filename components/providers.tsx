"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { PageBootSpinner } from "@/components/layout/page-boot-spinner";
import { TooltipProvider } from "@/components/ui/tooltip";

type FullProviders = ComponentType<{ children: ReactNode }>;

/**
 * Keep Firebase out of the homepage first paint.
 * App routes boot the full stack immediately with a branded spinner (no white flash).
 * Marketing pages keep painting content, then swap in ProvidersFull after idle.
 */
function shouldDeferProviders(pathname: string | null): boolean {
  if (!pathname || pathname === "/") return true;
  // Public listing/SEO HTML must SSR (h1, cards, JSON-LD) — do not replace children with a boot spinner.
  if (pathname.startsWith("/properties")) return true;
  if (pathname.startsWith("/property/")) return true;
  // Map ships SSR listings too; paint it instead of the boot spinner.
  if (pathname.startsWith("/map")) return true;
  if (pathname.startsWith("/seo-landing")) return true;
  if (
    pathname === "/about" ||
    pathname === "/team" ||
    pathname === "/faq" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/cookies" ||
    pathname === "/disclaimer" ||
    pathname === "/deletion-policy"
  ) {
    return true;
  }
  return false;
}

export function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const defer = shouldDeferProviders(pathname);
  const [Full, setFull] = useState<FullProviders | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      void import("@/components/providers-full")
        .then((mod) => {
          if (!cancelled) setFull(() => mod.ProvidersFull);
        })
        .catch(() => {
          /* keep spinner / shell */
        });
    };

    if (!defer) {
      load();
      return () => {
        cancelled = true;
      };
    }

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 1600 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const timer = window.setTimeout(load, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [defer]);

  if (!Full) {
    if (defer) {
      // Homepage / marketing: paint shell content while Firebase stays deferred.
      return <TooltipProvider delayDuration={200}>{children}</TooltipProvider>;
    }
    // App routes: spinner until auth/store stack is ready (fixes white reload flash).
    return (
      <TooltipProvider delayDuration={200}>
        <PageBootSpinner label="Preparing your workspace…" />
      </TooltipProvider>
    );
  }

  return <Full>{children}</Full>;
}
