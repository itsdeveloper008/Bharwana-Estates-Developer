import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFormEntrance, AuthGuestGate, AuthSidePanel } from "@/components/auth/auth-shell";
import { FirebaseConfigBanner } from "@/components/firebase/firebase-config-banner";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)_minmax(0,1fr)]">
        <AuthSidePanel side="left" />

        <div className="relative z-10 flex min-h-0 flex-col overflow-y-auto bg-ivory px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <Link href="/" className="mb-8 flex w-full shrink-0 items-center justify-center gap-4">
            <Image
              src="/logo.png"
              alt="Bharwana"
              width={88}
              height={88}
              className="h-[4.75rem] w-[4.75rem] object-contain sm:h-24 sm:w-24"
              priority
            />
            <span className="flex flex-col items-start leading-tight">
              <span className="font-display text-[1.15rem] tracking-crest text-forest sm:text-[1.35rem]">
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
