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

      <div className="relative z-10 h-dvh min-w-0 overflow-y-auto overscroll-contain bg-white">
        {/* my-auto (not justify-center) so tall Sign Up content can scroll without clipping the logo */}
        <div className="flex min-h-full flex-col items-center px-5 py-8 sm:px-10 sm:py-10 lg:px-14 xl:px-20">
          <div className="my-auto w-full">
            <AuthFormEntrance>
              <AuthFormHeader />
              <FirebaseConfigBanner context="auth" />
              <Suspense fallback={null}>
                <AuthGuestGate>{children}</AuthGuestGate>
              </Suspense>
            </AuthFormEntrance>
          </div>
        </div>
      </div>
    </div>
  );
}
