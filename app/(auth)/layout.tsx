import Image from "next/image";
import Link from "next/link";
import { AuthFormEntrance, AuthVisualPanel } from "@/components/auth/auth-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <AuthVisualPanel />
      <div className="flex flex-col bg-ivory px-6 py-10">
        <Link href="/" className="mb-10 flex items-center gap-3">
          <Image src="/logo.png" alt="Bharwana" width={44} height={44} className="h-11 w-11 object-contain" />
          <span className="font-display text-xs tracking-crest text-forest">BHARWANA</span>
        </Link>
        <AuthFormEntrance>{children}</AuthFormEntrance>
      </div>
    </div>
  );
}
