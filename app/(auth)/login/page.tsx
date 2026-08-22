import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold-700">Members</p>
      <h1 className="mt-2 font-serif text-4xl">Sign in</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Use your email and password to list homes or manage your listings.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to Bharwana?{" "}
        <Link href="/register" className="text-forest underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
