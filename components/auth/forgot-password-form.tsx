"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { AuthCrossLink } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { sendPasswordResetLink } from "@/lib/auth-reset";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: defaultEmail },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const email = values.email.trim().toLowerCase();
    if (!isFirebaseConfigured()) {
      setError("Password reset needs Firebase on this deploy.");
      return;
    }
    try {
      await sendPasswordResetLink(email);
      setSentTo(email);
      toast.success("Reset email sent.");
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      console.error("[forgot-password]", code, err);
      if (code === "auth/user-not-found") {
        // Do not reveal whether the email exists.
        setSentTo(email);
        return;
      }
      if (code === "auth/invalid-email") {
        setError("Enter a valid email address.");
        return;
      }
      if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
        return;
      }
      setError("Could not send a reset email. Try again in a moment.");
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4 rounded-2xl border border-forest/10 bg-cream/40 px-5 py-6">
        <p className="font-serif text-2xl text-forest">Check your email</p>
        <p className="text-sm leading-relaxed text-forest/75">
          If an account exists for <span className="font-medium text-forest">{sentTo}</span>, we sent a
          link to reset your password. Open that link on this site to set a new password — email
          scanners can invalidate one-time links if they open them first, so request another if
          needed.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
        <FormField
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
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
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Remembered it? <AuthCrossLink href="/login">Sign in</AuthCrossLink>
        </p>
      </form>
    </Form>
  );
}
