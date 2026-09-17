"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PasswordCreateField, ConfirmPasswordField } from "@/components/auth/password-create-field";
import { Button } from "@/components/ui/button";
import { Form, FormField } from "@/components/ui/form";
import { useMockAuth } from "@/lib/mock-auth";
import { passwordCreateSchema } from "@/lib/schemas";
import type { User } from "@/lib/types";

const schema = z
  .object({
    password: passwordCreateSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

/** Password link after phone signup (or from Settings). No email field. */
export function SetPasswordOptional({
  onDone,
  onSkip,
  profile,
  title = "Set your password",
  description = "Create a password to finish signing up. Next time, sign in with your phone number and this password.",
  showSkip = false,
  submitLabel = "Sign in",
  successToast: _successToast,
}: {
  /** @deprecated Ignored - phone accounts never collect email here. */
  defaultEmail?: string;
  /** Pending profile when app session is not committed yet (post-phone signup). */
  profile?: User | null;
  onDone?: (user: User) => void;
  onSkip?: () => void;
  title?: string;
  description?: string;
  showSkip?: boolean;
  submitLabel?: string;
  successToast?: string;
}) {
  const { linkEmailPassword } = useMockAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const result = await linkEmailPassword({
      password: values.password,
      profile: profile ?? undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone?.(result.user);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-forest/10 bg-cream/40 px-4 py-5">
      <div>
        <p className="font-serif text-xl text-forest">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-forest/70">{description}</p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-3"
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
        >
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
              <ConfirmPasswordField field={field} fieldState={fieldState} />
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
                Signing in…
              </>
            ) : (
              submitLabel
            )}
          </Button>
          {showSkip && onSkip ? (
            <Button type="button" variant="ghost" className="w-full" onClick={onSkip}>
              Skip for now
            </Button>
          ) : null}
        </form>
      </Form>
    </div>
  );
}
