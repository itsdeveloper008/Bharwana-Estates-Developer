"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMockAuth } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

const publicLinks = [
  { href: "/properties", label: "Residences" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
];

const listPropertyHref = "/login?returnTo=%2Fowner%2Fadd-property";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isReady } = useMockAuth();
  const [open, setOpen] = useState(false);

  const roleLinks =
    user?.role === "HOUSE_OWNER"
      ? [
          { href: "/owner", label: "My listings" },
          { href: "/owner/add-property", label: "Add property" },
        ]
      : user?.role === "SALES_REP"
        ? [{ href: "/sales", label: "Pipeline" }]
        : user?.role === "ADMIN"
          ? [{ href: "/admin", label: "Admin" }]
          : [];

  const links = [...publicLinks, ...roleLinks];

  const initials = user
    ? user.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-forest/5 bg-white">
      <div className="mx-auto flex justify-center px-3 py-3 sm:px-4 sm:py-3.5">
        <div
          className={cn(
            "flex w-full max-w-4xl items-center gap-2 rounded-full border border-forest/10 bg-forest px-2 py-1.5 shadow-lift sm:gap-3 sm:px-2.5 sm:py-2",
          )}
        >
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ivory sm:h-11 sm:w-11"
            aria-label="Bharwana home"
          >
            <Image
              src="/logo.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex lg:gap-2">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-3 py-2 text-[12px] uppercase tracking-[0.14em] transition-colors lg:px-3.5",
                    active ? "bg-ivory/10 text-gold" : "text-ivory/75 hover:bg-ivory/5 hover:text-ivory",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {!isReady ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="hidden h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] uppercase tracking-[0.12em] text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory md:inline-flex"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ivory/15 text-[10px] font-medium text-gold">
                      {initials}
                    </span>
                    {user.fullName.split(" ")[0]}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <p className="font-medium text-forest">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.role.replace("_", " ")}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(user.role === "HOUSE_OWNER"
                    ? [
                        { href: "/owner", label: "My listings" },
                        { href: "/owner/add-property", label: "Add property" },
                      ]
                    : [{ href: "/owner/add-property", label: "List a property" }]
                  ).map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href}>{link.label}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full px-3 py-2 text-[12px] uppercase tracking-[0.12em] text-ivory/70 transition-colors hover:text-ivory md:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href={listPropertyHref}
                  className="hidden rounded-full px-3 py-2 text-[12px] uppercase tracking-[0.12em] text-gold transition-colors hover:bg-ivory/10 md:inline-flex"
                >
                  List a property
                </Link>
              </>
            )}

            <a
              href="tel:+923001713811"
              className="hidden items-center rounded-full bg-ivory px-4 py-2.5 text-[12px] font-medium tracking-[0.04em] text-forest transition-colors hover:bg-gold sm:inline-flex"
            >
              +92 300 1713811
            </a>
            <a
              href="mailto:info@bharwanaestate.com"
              className="inline-flex items-center rounded-full bg-ivory px-3.5 py-2.5 text-[11px] font-medium text-forest transition-colors hover:bg-gold sm:hidden"
            >
              Contact
            </a>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ivory transition-colors hover:bg-ivory/10 md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-ivory">
                <SheetHeader>
                  <SheetTitle className="font-display tracking-crest text-forest">BHARWANA</SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col gap-4">
                  {publicLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="text-sm uppercase tracking-[0.16em] text-forest"
                    >
                      {link.label}
                    </Link>
                  ))}
                  {user?.role === "HOUSE_OWNER" && (
                    <>
                      <Link
                        href="/owner"
                        onClick={() => setOpen(false)}
                        className="text-sm uppercase tracking-[0.16em] text-forest"
                      >
                        My listings
                      </Link>
                      <Link
                        href="/owner/add-property"
                        onClick={() => setOpen(false)}
                        className="text-sm uppercase tracking-[0.16em] text-forest"
                      >
                        Add property
                      </Link>
                    </>
                  )}
                  <a
                    href="tel:+923001713811"
                    className="text-sm uppercase tracking-[0.16em] text-gold-700"
                    onClick={() => setOpen(false)}
                  >
                    +92 300 1713811
                  </a>
                  {user ? (
                    <>
                      <p className="text-sm text-forest/70">
                        Signed in as <span className="font-medium text-forest">{user.fullName}</span>
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          logout();
                          setOpen(false);
                        }}
                      >
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" asChild>
                        <Link href="/login" onClick={() => setOpen(false)}>
                          Sign in
                        </Link>
                      </Button>
                      <Button asChild>
                        <Link href={listPropertyHref} onClick={() => setOpen(false)}>
                          List a property
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
