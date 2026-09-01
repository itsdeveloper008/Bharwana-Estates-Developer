import Image from "next/image";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata = {
  title: "Admin Sign In",
};

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-forest px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_45%,rgba(0,0,0,0.12)_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, transparent, transparent 14px, rgba(255,255,255,0.035) 14px, rgba(255,255,255,0.035) 28px)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <header className="mb-6 text-center">
          <Image
            src="/logo.png"
            alt="Bharwana Estates"
            width={88}
            height={88}
            className="mx-auto h-[5.5rem] w-[5.5rem] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
            priority
          />
          <p className="mt-5 font-serif text-lg tracking-[0.12em] text-ivory sm:text-xl">
            BHARWANA ESTATES DEVELOPER
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
            Trust · Clarity · Service
          </p>
        </header>

        <div className="w-full rounded-2xl border border-white/10 bg-ivory px-8 py-8 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.45)] sm:px-10 sm:py-9">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
