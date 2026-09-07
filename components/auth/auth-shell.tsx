"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { useMockAuth } from "@/lib/mock-auth";
import { cn } from "@/lib/utils";

function safeReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

/** Full-bleed crest panels flanking the centered auth form. */
export function AuthSidePanel({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";

  return (
    <div className="relative hidden overflow-hidden bg-ivory lg:block" aria-hidden>
      <motion.div
        className={cn(
          "absolute inset-y-0 flex w-[min(100%,30rem)] items-center",
          isLeft ? "left-0 justify-start" : "right-0 justify-end",
        )}
        initial={{ opacity: 0, x: isLeft ? -28 : 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        <div
          className={cn(
            "relative h-full max-h-[36rem] w-full",
            isLeft ? "-translate-x-[8%]" : "translate-x-[8%]",
          )}
        >
          <Image
            src="/lion-bharwana.png"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 32vw, 0px"
            className={cn(
              "object-contain opacity-90",
              isLeft ? "object-left -scale-x-100" : "object-right",
            )}
          />
        </div>
      </motion.div>
    </div>
  );
}

export function AuthFormEntrance({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      className="mx-auto w-full max-w-md flex-1"
    >
      {children}
    </motion.div>
  );
}

/** Keeps signed-in users off /login and /register; clears leftover auth toasts. */
export function AuthGuestGate({ children }: { children: ReactNode }) {
  const { user, isReady } = useMockAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    toast.dismiss();
  }, []);

  useEffect(() => {
    if (!isReady || !user) return;
    const returnTo = safeReturnTo(searchParams.get("returnTo"));
    router.replace(returnTo ?? "/");
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
      className="group relative inline-block text-forest transition-colors duration-200 hover:text-gold-700"
    >
      {children}
      <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
    </Link>
  );
}
