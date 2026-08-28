"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMockAuth } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/properties", label: "Properties" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
] as const;

const phoneDisplay = "+92 300 1713811";
const phoneHref = "tel:+923001713811";

const ease = [0.22, 1, 0.36, 1] as const;

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isReady } = useMockAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuId = useId();

  const listPropertyHref = user?.role === "DEALER" ? "/dealer/add-property" : "/owner/add-property";

  const isHome = pathname === "/";
  const overHero = isHome && !scrolled;

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        // Hysteresis stops flicker when scroll sits near the threshold
        setScrolled((prev) => {
          if (prev) return y > 8;
          return y > 40;
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const initials = user
    ? user.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  const ownerLinks =
    user?.role === "HOUSE_OWNER"
      ? [
          { href: "/owner", label: "My listings" },
          { href: "/owner/add-property", label: "Add property" },
        ]
      : user?.role === "DEALER"
        ? [
            { href: "/dealer", label: "My listings" },
            { href: "/dealer/add-property", label: "Add property" },
            { href: "/dealer?tab=commission", label: "Commission" },
          ]
        : user?.role === "SALES_REP"
          ? [{ href: "/sales", label: "Pipeline" }]
          : user?.role === "ADMIN"
            ? [{ href: "/admin", label: "Admin" }]
            : [];

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full",
          // Fixed height on every page — never animate height (that causes navbar shiver)
          "h-[72px] md:h-[80px]",
          overHero
            ? "border-b border-white/10 bg-gradient-to-b from-[#082B1D]/70 to-transparent transition-[background-color,border-color,box-shadow] duration-300 ease-out"
            : "border-b border-[#082B1D]/10 bg-[#FBFAF6] shadow-[0_8px_30px_-18px_rgba(8,43,29,0.35)] transition-[background-color,border-color,box-shadow] duration-300 ease-out",
        )}
      >
        <div className="mx-auto flex h-full max-w-[1360px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-10">
          {/* Brand */}
          <Link
            href="/"
            aria-label="Bharwana Estates home"
            className="group flex shrink-0 items-center gap-3.5 transition-transform duration-300 hover:-translate-y-px"
          >
            <span
              className={cn(
                "relative flex h-11 w-11 items-center justify-center md:h-12 md:w-12",
                "after:absolute after:inset-[-3px] after:rounded-full after:border after:border-[#B89545]/0 after:transition-colors after:duration-300 group-hover:after:border-[#B89545]/45",
              )}
            >
              <Image
                src="/logo.png"
                alt=""
                width={48}
                height={48}
                className="relative z-10 h-10 w-10 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:scale-[1.04] md:h-11 md:w-11"
                priority
              />
            </span>
            <span
              className={cn(
                "hidden font-display text-[11px] font-semibold uppercase leading-none tracking-[0.3em] transition-colors duration-300 sm:block",
                overHero ? "text-[#F5F1E8]" : "text-[#06291C]",
              )}
            >
              Bharwana
              <span
                className={cn(
                  "mt-1.5 block font-medium tracking-[0.34em] transition-colors duration-300",
                  overHero ? "text-[#F5F1E8]/90" : "text-[#06291C]/90",
                )}
              >
                Estates
              </span>
            </span>
          </Link>

          {/* Primary nav — desktop */}
          <nav
            aria-label="Primary"
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex"
          >
            {publicLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group relative mx-1 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 xl:mx-1.5 xl:tracking-[0.22em]",
                    overHero
                      ? active
                        ? "text-[#F5F1E8]"
                        : "text-[#F5F1E8]/95 hover:text-[#F5F1E8]"
                      : active
                        ? "text-[#06291C]"
                        : "text-[#06291C] hover:text-[#082B1D]",
                  )}
                >
                  {link.label}
                  <span
                    className={cn(
                      "absolute bottom-1 left-1/2 h-px -translate-x-1/2 bg-[#B89545] transition-all duration-300 ease-out",
                      active
                        ? "w-5 opacity-100"
                        : "w-0 opacity-0 group-hover:w-5 group-hover:opacity-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Actions — desktop */}
          <div className="hidden items-center gap-4 lg:flex xl:gap-5">
            {!isReady ? null : user ? null : (
              <Link
                href="/login"
                className={cn(
                  "group relative py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89545]",
                  overHero
                    ? "text-[#F5F1E8]/95 hover:text-[#F5F1E8]"
                    : "text-[#06291C] hover:text-[#082B1D]",
                )}
              >
                Sign in
                <span className="absolute bottom-1 left-0 h-px w-0 bg-[#B89545] transition-all duration-300 group-hover:w-full" />
              </Link>
            )}

            <Link
              href={listPropertyHref}
              className={cn(
                "group relative inline-flex items-center overflow-hidden bg-[#B89545] px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#082B1D]",
                "shadow-[0_10px_24px_-12px_rgba(184,149,69,0.85)] transition-[transform,background-color,box-shadow] duration-300",
                "hover:-translate-y-px hover:bg-[#c4a455] hover:shadow-[0_14px_28px_-12px_rgba(184,149,69,0.95)]",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#082B1D]",
              )}
            >
              <span className="relative z-10">List a property</span>
              <span className="pointer-events-none absolute inset-0 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-[120%]" />
            </Link>

            <div
              className={cn(
                "mx-0.5 hidden h-8 w-px xl:block",
                overHero ? "bg-[#F5F1E8]/25" : "bg-[#082B1D]/15",
              )}
              aria-hidden
            />

            <a
              href={phoneHref}
              className={cn(
                "group flex items-center gap-3 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89545]",
                overHero
                  ? "text-[#F5F1E8] hover:text-[#B89545]"
                  : "text-[#082B1D] hover:text-[#B89545]",
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center border transition-colors duration-300",
                  overHero
                    ? "border-[#F5F1E8]/35 bg-[#F5F1E8]/10 group-hover:border-[#B89545]/60"
                    : "border-[#082B1D]/20 bg-[#082B1D]/[0.04] group-hover:border-[#B89545]/50",
                )}
              >
                <Phone className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:-translate-y-px" strokeWidth={1.5} />
              </span>
              <span className="flex flex-col leading-tight">
                <span
                  className={cn(
                    "text-[9px] font-medium uppercase tracking-[0.22em]",
                    overHero ? "text-[#F5F1E8]/85" : "text-[#06291C]/80",
                  )}
                >
                  Call us
                </span>
                <span className="text-[12px] font-semibold tracking-[0.03em]">{phoneDisplay}</span>
              </span>
            </a>

            {isReady && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-medium tracking-[0.1em] transition-all duration-300",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89545]",
                      overHero
                        ? "border-[#B89545]/80 bg-[#082B1D]/60 text-[#B89545] hover:border-[#B89545] hover:shadow-[0_0_0_3px_rgba(184,149,69,0.2)]"
                        : "border-[#B89545] bg-[#082B1D] text-[#B89545] hover:bg-[#103A2A] hover:shadow-[0_0_0_3px_rgba(184,149,69,0.18)]",
                    )}
                  >
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 rounded-sm border-forest/10 bg-ivory p-1.5 shadow-[0_20px_40px_-20px_rgba(8,43,29,0.35)]">
                  <DropdownMenuLabel className="px-3 py-2.5 font-normal">
                    <p className="font-serif text-lg text-forest">{user.fullName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-forest/10" />
                  {(user.role === "HOUSE_OWNER"
                    ? [
                        { href: "/owner", label: "My Listings" },
                        { href: "/owner/add-property", label: "Add Property" },
                      ]
                    : user.role === "DEALER"
                      ? [
                          { href: "/dealer", label: "My Listings" },
                          { href: "/dealer/add-property", label: "Add Property" },
                          { href: "/dealer?tab=commission", label: "Commission" },
                        ]
                      : user.role === "SALES_REP"
                        ? [{ href: "/sales", label: "Pipeline" }]
                        : user.role === "ADMIN"
                          ? [{ href: "/admin", label: "Admin" }]
                          : [
                              { href: "/owner", label: "My Listings" },
                              { href: "/owner/add-property", label: "Add Property" },
                            ]
                  ).map((link) => (
                    <DropdownMenuItem key={link.href} asChild className="cursor-pointer rounded-sm focus:bg-cream focus:text-forest">
                      <Link href={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-forest/10" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="cursor-pointer rounded-sm text-destructive focus:bg-cream focus:text-destructive"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-3 lg:hidden">
            <a
              href={phoneHref}
              aria-label={`Call ${phoneDisplay}`}
              className={cn(
                "inline-flex h-10 w-10 items-center justify-center transition-colors duration-300",
                overHero ? "text-[#F5F1E8] hover:text-[#B89545]" : "text-[#082B1D] hover:text-[#B89545]",
              )}
            >
              <Phone className="h-5 w-5" strokeWidth={1.5} />
            </a>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((value) => !value)}
              className={cn(
                "inline-flex h-10 w-10 flex-col items-center justify-center gap-[5px] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89545]",
                overHero ? "text-[#F5F1E8]" : "text-[#082B1D]",
              )}
            >
              <span className={cn("h-px w-5 bg-current transition-transform duration-300", open && "translate-y-[6px] rotate-45")} />
              <span className={cn("h-px w-5 bg-current transition-opacity duration-300", open && "opacity-0")} />
              <span className={cn("h-px w-5 bg-current transition-transform duration-300", open && "-translate-y-[6px] -rotate-45")} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="fixed inset-0 z-[60] flex flex-col bg-[#082B1D] lg:hidden"
          >
            <div className="mx-auto flex h-[72px] w-full max-w-[1360px] items-center justify-between px-5 sm:px-8">
              <Link href="/" aria-label="Bharwana Estates home" onClick={() => setOpen(false)} className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt=""
                  width={40}
                  height={40}
                  className="h-9 w-9 object-contain"
                />
                <span className="font-display text-[11px] uppercase tracking-[0.28em] text-[#F5F1E8]">
                  Bharwana
                </span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center text-[#F5F1E8] transition-colors hover:text-[#B89545] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89545]"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <nav aria-label="Mobile" className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col justify-center px-5 sm:px-8">
              <ul className="space-y-1">
                {publicLinks.map((link, index) => {
                  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <motion.li
                      key={link.href}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.4, delay: 0.06 * index, ease }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block py-2 font-serif text-[2rem] leading-tight tracking-tight text-[#F5F1E8] transition-colors hover:text-[#B89545] sm:text-[2.5rem]",
                          active && "text-[#B89545]",
                        )}
                      >
                        {link.label}
                      </Link>
                    </motion.li>
                  );
                })}

                {ownerLinks.map((link, index) => (
                  <motion.li
                    key={link.href}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.06 * (publicLinks.length + index), ease }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="block py-2 font-serif text-[1.75rem] leading-tight tracking-tight text-[#F5F1E8]/80 transition-colors hover:text-[#B89545] sm:text-[2rem]"
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}

                {!user && (
                  <motion.li
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.28, ease }}
                  >
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="block py-2 font-serif text-[2rem] leading-tight tracking-tight text-[#F5F1E8] transition-colors hover:text-[#B89545] sm:text-[2.5rem]"
                    >
                      Sign in
                    </Link>
                  </motion.li>
                )}
              </ul>
            </nav>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.32, ease }}
              className="mx-auto w-full max-w-[1360px] space-y-5 px-5 pb-10 pt-4 sm:px-8"
            >
              <Link
                href={listPropertyHref}
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center bg-[#B89545] px-6 py-4 text-[12px] font-medium uppercase tracking-[0.16em] text-[#082B1D] transition-colors hover:bg-[#a8843c]"
              >
                List a property
              </Link>

              <a
                href={phoneHref}
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2.5 text-[#F5F1E8]/80 transition-colors hover:text-[#B89545]"
              >
                <Phone className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-[13px] tracking-[0.04em]">Call {phoneDisplay}</span>
              </a>

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="mx-auto block text-[11px] uppercase tracking-[0.18em] text-[#F5F1E8]/50 transition-colors hover:text-[#F5F1E8]"
                >
                  Sign out · {user.fullName.split(" ")[0]}
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
