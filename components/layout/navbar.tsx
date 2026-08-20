"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserRound } from "lucide-react";
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

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useMockAuth();
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

  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Bharwana Estates Developer"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
            priority
          />
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-[11px] font-semibold tracking-crest text-forest">
              BHARWANA
            </span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-gold-700">
              Estates Developer
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-[13px] uppercase tracking-[0.16em] text-forest/70 transition-colors hover:text-forest",
                pathname === link.href && "text-forest",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="hidden gap-2 md:inline-flex">
                  <UserRound className="h-4 w-4" />
                  {user.fullName.split(" ")[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium text-forest">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.role.replace("_", " ")}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {roleLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href}>{link.label}</Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/owner/add-property">List a property</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-ivory">
              <SheetHeader>
                <SheetTitle className="font-display tracking-crest text-forest">BHARWANA</SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-4">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-sm uppercase tracking-[0.16em] text-forest"
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <Button variant="outline" onClick={() => { logout(); setOpen(false); }}>
                    Sign out
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" asChild>
                      <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/register" onClick={() => setOpen(false)}>Create account</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
