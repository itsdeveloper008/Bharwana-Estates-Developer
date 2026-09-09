"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PasswordCreateField } from "@/components/auth/password-create-field";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { passwordCreateSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const formSchema = z
  .object({
    password: passwordCreateSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof formSchema>;

type InvalidReason = "missing" | "expired" | "used" | "invalid" | "error";

type LinkState =
  | { status: "loading" }
  | { status: "ready"; oobCode: string; email: string }
  | { status: "invalid"; reason: InvalidReason; detail?: string }
  | { status: "success" };

function classifyVerifyError(code: string): InvalidReason {
  if (code === "auth/expired-action-code") return "expired";
  if (code === "auth/invalid-action-code") return "used";
  return "invalid";
}

/** Completes Firebase password reset on our domain — only confirmPasswordReset consumes the code. */
export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const verifiedOnce = useRef(false);
  const [link, setLink] = useState<LinkState>({ status: "loading" });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (verifiedOnce.current) return;
    verifiedOnce.current = true;

    const mode = searchParams.get("mode");
    const oobCode = searchParams.get("oobCode")?.trim() ?? "";

    if (!oobCode || (mode && mode !== "resetPassword")) {
      setLink({ status: "invalid", reason: "missing" });
      return;
    }

    if (!isFirebaseConfigured()) {
      setLink({
        status: "invalid",
        reason: "error",
        detail: "Password reset needs Firebase on this deploy.",
      });
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setLink({
        status: "invalid",
        reason: "error",
        detail: "Password reset is unavailable right now.",
      });
      return;
    }

    void (async () => {
      try {
        // verifyPasswordResetCode does NOT consume the oobCode — safe on load / for scanners.
        console.info("[reset-password] verifying oobCode (non-consuming)");
        const email = await verifyPasswordResetCode(auth, oobCode);
        setLink({ status: "ready", oobCode, email });
      } catch (err) {
        const code =
          err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
        console.error("[reset-password] verify failed", code, err);
        setLink({ status: "invalid", reason: classifyVerifyError(code) });
      }
    })();
  }, [searchParams]);

  async function onSubmit(values: FormValues) {
    if (link.status !== "ready") return;
    setSubmitError(null);
    const auth = getFirebaseAuth();
    if (!auth) {
      setSubmitError("Password reset is unavailable right now.");
      return;
    }
    try {
      console.info("[reset-password] confirming reset (consumes oobCode)");
      await confirmPasswordReset(auth, link.oobCode, values.password);
      setLink({ status: "success" });
      toast.success("Password updated.");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      console.error("[reset-password] confirm failed", code, err);
      if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
        setLink({ status: "invalid", reason: code === "auth/expired-action-code" ? "expired" : "used" });
        return;
      }
      if (code === "auth/weak-password") {
        setSubmitError("Choose a stronger password.");
        return;
      }
      setSubmitError("Could not update your password. Try again or request a new link.");
    }
  }

  if (link.status === "loading") {
    return <p className="text-sm text-muted-foreground">Checking your reset link…</p>;
  }

  if (link.status === "success") {
    return (
      <div className="space-y-4 rounded-2xl border border-forest/10 bg-cream/40 px-5 py-6">
        <p className="font-serif text-2xl text-forest">Password updated</p>
        <p className="text-sm leading-relaxed text-forest/75">
          Your password has been changed. You can sign in with your new password.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Go to Sign In</Link>
        </Button>
      </div>
    );
  }

  if (link.status === "invalid") {
    const scannerHint =
      link.reason === "used" || link.reason === "expired"
        ? "Email security scanners (common with Gmail and corporate inboxes) sometimes open reset links before you do, which can invalidate a one-time link."
        : null;

    let title = "This link is no longer valid";
    let body = "Request a new reset link below.";
    if (link.reason === "missing") {
      title = "Reset link incomplete";
      body =
        "Open the full link from your password-reset email, or request a new link below. If you just changed the Firebase Action URL, send a fresh email after saving that setting.";
    } else if (link.reason === "expired") {
      title = "This reset link has expired";
    } else if (link.reason === "used") {
      title = "This reset link was already used";
    } else if (link.reason === "error" && link.detail) {
      title = "Could not open reset link";
      body = link.detail;
    }

    return (
      <div className="space-y-6">
        <div className="space-y-3 rounded-2xl border border-forest/10 bg-cream/40 px-5 py-6">
          <p className="font-serif text-2xl text-forest">{title}</p>
          <p className="text-sm leading-relaxed text-forest/75">{body}</p>
          {scannerHint ? (
            <p className="text-sm leading-relaxed text-forest/65">{scannerHint}</p>
          ) : null}
        </div>
        <div>
          <p className="mb-4 text-sm font-medium text-forest">Send a new reset link</p>
          <ForgotPasswordForm />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
        <div className="space-y-1.5">
          <FormLabel>Account email</FormLabel>
          <Input value={link.email} readOnly className="bg-cream/60" />
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <PasswordCreateField field={field} fieldState={fieldState} />
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Confirm password"
                  className={cn(
                    "bg-white",
                    fieldState.error && "border-destructive focus-visible:ring-destructive",
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {submitError ? (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating password…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </Form>
  );
}
