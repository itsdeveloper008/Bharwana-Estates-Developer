import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="type-eyebrow">Account</p>
      <h1 className="mt-2 mb-3 font-serif text-4xl">Reset password</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Reset with the email or phone number on your Bharwana account. Email receives a secure
        link; phone uses a one-time SMS code.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </>
  );
}
