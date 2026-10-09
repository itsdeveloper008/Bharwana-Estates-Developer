"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { preloadGoogleMaps } from "@/lib/map";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname === "/map";

  // Warm Maps JS after first paint so /properties opens with tiles ready sooner.
  useEffect(() => {
    if (pathname === "/properties" || pathname === "/map") {
      void preloadGoogleMaps();
      return;
    }
    if (pathname !== "/") return;
    const warm = () => {
      void preloadGoogleMaps();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      <Navbar />
      <main className="flex-1">{children}</main>
      {/* Map view scrolls filters away; footer would sit under the sticky map — keep it off. */}
      {!fullBleed && <Footer />}
      <WhatsAppFloat />
    </div>
  );
}
