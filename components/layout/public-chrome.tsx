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

  // Warm Maps only on map-adjacent routes — never on the homepage (hurts LCP/TBT).
  useEffect(() => {
    if (pathname !== "/properties" && pathname !== "/map") return;
    const linkApis = document.createElement("link");
    linkApis.rel = "preconnect";
    linkApis.href = "https://maps.googleapis.com";
    const linkStatic = document.createElement("link");
    linkStatic.rel = "preconnect";
    linkStatic.href = "https://maps.gstatic.com";
    linkStatic.crossOrigin = "anonymous";
    document.head.append(linkApis, linkStatic);
    void preloadGoogleMaps();
    return () => {
      linkApis.remove();
      linkStatic.remove();
    };
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
