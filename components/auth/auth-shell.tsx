"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { pathAfterAuth } from "@/lib/auth-redirect";
import { useMockAuth } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

function safeReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** Left brand panel — house photo only (~35%). */
export function AuthBrandPanel() {
  return (
    <div className="relative hidden h-dvh overflow-hidden lg:block">
      <Image
        src="/auth-brand.jpeg"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 35vw, 0px"
        className="object-cover object-center"
      />
    </div>
  );
}

export function AuthFormEntrance({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      className="mx-auto w-full max-w-[22rem] sm:max-w-md"
    >
      {children}
    </motion.div>
  );
}

export function AuthFormHeader() {
  return (
    <Link href="/" className="mb-4 flex items-center justify-center gap-3 text-left">
      <Image
        src="/logo.png"
        alt="Bharwana"
        width={56}
        height={56}
        className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12"
        priority
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-display text-base font-semibold tracking-[0.18em] text-forest sm:text-lg">
          BHARWANA
        </span>
        <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-forest/65 sm:text-[10px]">
          Estate Developer
        </span>
      </span>
    </Link>
  );
}

/** Keeps signed-in users off /login and /register. */
export function AuthGuestGate({ children }: { children: ReactNode }) {
  const { user, isReady } = useMockAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isReady || !user) return;
    const returnTo = safeReturnTo(searchParams.get("returnTo"));
    router.replace(pathAfterAuth(returnTo, user.role));
  }, [isReady, user, router, searchParams]);

  if (!isReady) {
    return <p className="text-sm text-muted-foreground">Checking your session…</p>;
  }

  if (user) {
    return <p className="text-sm text-muted-foreground">Redirecting…</p>;
  }

  return <>{children}</>;
}

export function AuthCrossLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 font-medium text-[#1F6B4F] transition-colors duration-200",
        "hover:text-forest",
      )}
    >
      {children}
    </Link>
  );
}
