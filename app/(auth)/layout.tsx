import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFormEntrance, AuthGuestGate, AuthSidePanel } from "@/components/auth/auth-shell";
import { FirebaseConfigBanner } from "@/components/firebase/firebase-config-banner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)_minmax(0,1fr)]">
      <AuthSidePanel side="left" />

      <div className="relative z-10 flex min-h-0 flex-col overflow-y-auto bg-ivory px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Link href="/" className="mb-8 flex w-full shrink-0 items-center justify-center gap-3">
          <Image src="/logo.png" alt="Bharwana" width={44} height={44} className="h-11 w-11 object-contain" priority />
          <span className="flex flex-col items-start leading-tight">
            <span className="font-display text-xs tracking-crest text-forest">BHARWANA</span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-forest/55">
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
  );
}
