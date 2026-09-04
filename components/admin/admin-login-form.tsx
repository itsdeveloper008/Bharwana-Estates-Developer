"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/lib/admin-auth";
import { adminLoginSchema, type AdminLoginValues } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export function AdminLoginForm() {
  const router = useRouter();
  const { login } = useAdminAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    form.reset({ email: "", password: "" });
  }, [form]);

  async function onSubmit(values: AdminLoginValues) {
    setFormError(null);
    const result = await login(values.email, values.password);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    toast.success("Welcome back.");
    router.replace("/admin/dashboard");
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="text-left"
        autoComplete="off"
        data-lpignore="true"
        data-1p-ignore
      >
        <span className="inline-flex rounded-full bg-forest px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
          Admin access
        </span>

        <h1 className="mt-5 font-serif text-3xl text-forest sm:text-[2rem]">Welcome back</h1>

        <div className="mt-6 space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-forest">Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-700/75"
                      aria-hidden
                    />
                    <Input
                      type="email"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder=""
                      value={field.value ?? ""}
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      ref={field.ref}
                      className={cn(
                        "border-forest/10 bg-cream/60 pl-10",
                        fieldState.error && "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-forest">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gold-700/75"
                      aria-hidden
                    />
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder=""
                      value={field.value ?? ""}
                      name={field.name}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                      ref={field.ref}
                      className={cn(
                        "border-forest/10 bg-cream/60 pl-10 pr-10",
                        fieldState.error && "border-destructive focus-visible:ring-destructive",
                      )}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/45 transition-colors hover:text-forest"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {formError && (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={form.formState.isSubmitting}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest px-4 text-sm font-semibold text-ivory",
              "transition-all duration-200 hover:-translate-y-px hover:bg-[#1a4a30] hover:shadow-[0_10px_24px_-8px_rgba(15,46,29,0.55)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-60",
            )}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        <div className="mt-6 border-t border-forest/10 pt-5">
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 shrink-0 text-gold-700/80" aria-hidden />
            Authorized personnel only
          </p>
        </div>
      </form>
    </Form>
  );
}
