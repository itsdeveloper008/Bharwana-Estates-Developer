import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Join</p>
      <h1 className="mt-1.5 font-serif text-3xl sm:text-4xl">Create an account</h1>
      <p className="type-subheading mb-4 sm:mb-6">
        Register with email, phone OTP, or Google as a buyer, house owner, or dealer.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
