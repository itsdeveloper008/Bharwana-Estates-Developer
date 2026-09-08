import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFormEntrance, AuthGuestGate, AuthSidePanel } from "@/components/auth/auth-shell";
import { FirebaseConfigBanner } from "@/components/firebase/firebase-config-banner";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grid min-h-screen min-w-0 grid-cols-1 overflow-x-hidden lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)_minmax(0,1fr)]">
        <AuthSidePanel side="left" />

        <div className="relative z-10 mx-auto flex min-h-0 w-full min-w-0 max-w-lg flex-col overflow-y-auto bg-ivory px-4 py-6 sm:max-w-md sm:px-6 lg:max-w-none lg:px-8 lg:py-10">
          <Link
            href="/"
            className="mb-6 flex w-full shrink-0 items-center justify-center gap-3 sm:mb-8 sm:gap-4"
          >
            <Image
              src="/logo.png"
              alt="Bharwana"
              width={112}
              height={112}
              className="h-20 w-20 object-contain sm:h-[6.5rem] sm:w-[6.5rem]"
              priority
            />
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span className="font-display text-base tracking-crest text-forest sm:text-[1.45rem]">
                BHARWANA
              </span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-forest/55 sm:text-[11px]">
                Estate Developer
              </span>
            </span>
          </Link>
          <AuthFormEntrance>
            <FirebaseConfigBanner context="auth" />
            <Suspense fallback={<p className="text-sm text-muted-foreground">Checking your session…</p>}>
              <AuthGuestGate>{children}</AuthGuestGate>
            </Suspense>
          </AuthFormEntrance>
        </div>

        <AuthSidePanel side="right" />
      </div>
      <WhatsAppFloat />
    </>
  );
}
