import { Suspense, type ReactNode } from "react";
import {
  AuthBrandPanel,
  AuthFormEntrance,
  AuthFormHeader,
  AuthGuestGate,
} from "@/components/auth/auth-shell";
import { FirebaseConfigBanner } from "@/components/firebase/firebase-config-banner";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-dvh min-w-0 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(12rem,35%)_minmax(0,1fr)]">
      <AuthBrandPanel />

      <div className="relative z-10 flex h-dvh min-w-0 flex-col items-center justify-center overflow-y-auto overscroll-contain bg-white px-5 py-4 sm:px-10 lg:px-14 xl:px-20">
        <AuthFormEntrance>
          <AuthFormHeader />
          <FirebaseConfigBanner context="auth" />
          <Suspense fallback={<p className="text-sm text-muted-foreground">Checking your session…</p>}>
            <AuthGuestGate>{children}</AuthGuestGate>
          </Suspense>
        </AuthFormEntrance>
      </div>
    </div>
  );
}
