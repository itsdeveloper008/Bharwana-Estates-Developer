"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { PasswordCreateField } from "@/components/auth/password-create-field";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMockAuth } from "@/lib/mock-auth";
import { passwordCreateSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

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

/** Optional password link after phone signup (or from Settings). No email field. */
export function SetPasswordOptional({
  onDone,
  onSkip,
  title = "Add a password for faster sign-in",
  description = "Avoid entering a code every time you log in. You can still use phone OTP whenever you want.",
  showSkip = true,
}: {
  /** @deprecated Ignored — phone accounts never collect email here. */
  defaultEmail?: string;
  onDone?: () => void;
  onSkip?: () => void;
  title?: string;
  description?: string;
  showSkip?: boolean;
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
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Password added. Use your phone number and password on the Email tab next time.");
    onDone?.();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-forest/10 bg-cream/40 px-4 py-5">
      <div>
        <p className="font-serif text-xl text-forest">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-forest/70">{description}</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" autoComplete="off">
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
                      "bg-white text-sm placeholder:text-sm",
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
                Saving…
              </>
            ) : (
              "Save password"
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
