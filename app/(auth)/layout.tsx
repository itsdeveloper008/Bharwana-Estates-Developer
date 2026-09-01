import Image from "next/image";
import Link from "next/link";
import { AuthFormEntrance, AuthVisualPanel } from "@/components/auth/auth-shell";
import { FirebaseConfigBanner } from "@/components/firebase/firebase-config-banner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthVisualPanel />
      <div className="flex min-h-0 flex-col overflow-y-auto bg-ivory px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <Link href="/" className="mb-8 flex shrink-0 items-center gap-3">
          <Image src="/logo.png" alt="Bharwana" width={44} height={44} className="h-11 w-11 object-contain" />
          <span className="font-display text-xs tracking-crest text-forest">BHARWANA</span>
        </Link>
        <AuthFormEntrance>
          <FirebaseConfigBanner context="auth" />
          {children}
        </AuthFormEntrance>
      </div>
    </div>
  );
}
