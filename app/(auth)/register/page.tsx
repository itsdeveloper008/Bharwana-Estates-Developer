import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <>
      <p className="type-eyebrow">Join</p>
      <h1 className="mt-1.5 mb-4 font-serif text-3xl sm:text-4xl sm:mb-6">Create an account</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <RegisterForm />
      </Suspense>
    </>
  );
}
