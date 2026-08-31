import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Join</p>
      <h1 className="mt-1.5 font-serif text-3xl">Create an account</h1>
      <p className="mt-1.5 mb-4 text-sm text-muted-foreground">
        Register with email, phone OTP, or Google as a buyer, house owner, or dealer.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
