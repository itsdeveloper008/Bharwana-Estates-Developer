"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { preloadGoogleMaps } from "@/lib/map";
import { cn } from "@/lib/utils";

const Navbar = dynamic(
  () => import("@/components/layout/navbar").then((mod) => mod.Navbar),
  { ssr: false },
);

const Footer = dynamic(
  () => import("@/components/layout/footer").then((mod) => mod.Footer),
  { ssr: false },
);

const WhatsAppFloat = dynamic(
  () => import("@/components/layout/whatsapp-float").then((mod) => mod.WhatsAppFloat),
  { ssr: false },
);

/** Lightweight header for first paint — no Firebase / framer-motion. */
function NavbarShell({ overHero }: { overHero: boolean }) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 w-full overflow-visible",
        "h-16 md:h-[96px] xl:h-[108px]",
        overHero
          ? "border-b border-white/10 bg-gradient-to-b from-[#082B1D]/70 to-transparent"
          : "border-b border-[#082B1D]/10 bg-[#FBFAF6] shadow-[0_8px_30px_-18px_rgba(8,43,29,0.35)]",
      )}
    >
      <div className="relative mx-auto flex h-full max-w-[1360px] items-center justify-between gap-3 px-5 sm:px-8 xl:px-10">
        <Link
          href="/"
          aria-label="Bharwana Estates home"
          className="flex shrink-0 items-center gap-3.5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.webp"
            alt=""
            width={96}
            height={96}
            className="h-12 w-12 object-contain md:h-[4.75rem] md:w-[4.75rem] xl:h-[5.5rem] xl:w-[5.5rem]"
          />
          <span
            className={cn(
              "hidden font-display text-[14px] font-bold uppercase leading-none tracking-[0.32em] sm:block",
              overHero ? "text-[#F5F1E8]" : "text-[#06291C]",
            )}
          >
            Bharwana
            <span className="mt-1.5 block font-medium tracking-[0.36em]">Estates</span>
          </span>
        </Link>
        <Link
          href="/login"
          className={cn(
            "rounded-xl border px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em]",
            overHero
              ? "border-white/30 text-[#F5F1E8]"
              : "border-[#082B1D]/20 text-[#082B1D]",
          )}
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = pathname === "/map";
  const overHero = pathname === "/";
  const [chromeReady, setChromeReady] = useState(false);

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

  // Mount full Navbar/Footer after idle so Firebase/framer stay off the LCP path.
  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setChromeReady(true);
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 1800 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const timer = window.setTimeout(enable, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-ivory">
      {chromeReady ? <Navbar /> : <NavbarShell overHero={overHero} />}
      {/* Fixed header is out of flow — reserve height except on home (hero is full-bleed under nav). */}
      {!overHero ? (
        <div className="h-[var(--site-header-height)] shrink-0" aria-hidden />
      ) : null}
      <main className="flex-1">{children}</main>
      {!fullBleed && chromeReady ? <Footer /> : null}
      {chromeReady ? <WhatsAppFloat /> : null}
    </div>
  );
}
