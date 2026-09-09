import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Set new password" };

export default function ResetPasswordPage() {
  return (
    <>
      <p className="type-eyebrow">Account</p>
      <h1 className="mt-2 mb-3 font-serif text-4xl">Set a new password</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted-foreground">
        Choose a new password for your Bharwana account. The reset link from your email is only used
        when you submit this form.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
