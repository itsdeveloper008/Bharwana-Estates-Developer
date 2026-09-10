import { Suspense } from "react";
import { AuthCrossLink } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">Members.</p>
      <h1 className="mt-1 mb-4 font-serif text-3xl text-forest sm:text-4xl">Sign in</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LoginForm />
      </Suspense>
      <p className="mt-5 text-center text-sm text-forest/55">
        New to Bharwana?{" "}
        <AuthCrossLink href="/register">
          Create an account <span aria-hidden>→</span>
        </AuthCrossLink>
      </p>
    </>
  );
}
