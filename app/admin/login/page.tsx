import Image from "next/image";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata = {
  title: "Admin Sign In",
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-16">
      <div className="w-full max-w-md border border-forest/10 bg-card px-8 py-10 shadow-lift">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Bharwana"
            width={48}
            height={48}
            className="mx-auto h-12 w-12 object-contain"
          />
          <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-gold-700">Admin access</p>
          <h1 className="mt-3 font-serif text-4xl">Sign In</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter your credentials to manage listings and inquiries.
          </p>
        </div>
        <AdminLoginForm />
      </div>
    </div>
  );
}
