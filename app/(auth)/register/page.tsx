import { Suspense } from "react";
import { AuthCrossLink } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">Join.</p>
      <h1 className="mt-1 mb-3 font-serif text-2xl text-forest sm:text-3xl">Create account</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <RegisterForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-forest/55">
        Already have an account?{" "}
        <AuthCrossLink href="/login">
          Sign in <span aria-hidden>→</span>
        </AuthCrossLink>
      </p>
    </>
  );
}
