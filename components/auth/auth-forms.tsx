"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMockAuth } from "@/lib/mock-auth";
import { registerSchema, userLoginSchema, type RegisterFormValues, type UserLoginValues } from "@/lib/schemas";
import type { UserRole } from "@/lib/types";

const roleHome: Record<UserRole, string> = {
  BUYER: "/properties",
  HOUSE_OWNER: "/owner",
  SALES_REP: "/sales",
  ADMIN: "/admin",
};

function safeReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useMockAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UserLoginValues>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: UserLoginValues) {
    setError(null);
    const result = await login(values.email, values.password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Signed in");
    const returnTo = safeReturnTo(searchParams.get("returnTo"));
    router.push(returnTo ?? roleHome[result.user.role]);
  }

  const registerHref = (() => {
    const returnTo = searchParams.get("returnTo");
    return returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register";
  })();

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input className="bg-white" type="email" placeholder="imran@bharwana.example" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input className="bg-white" type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href={registerHref} className="text-forest underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="text-center text-[11px] text-muted-foreground">
        Demo owner: imran@bharwana.example / owner123
      </p>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useMockAuth();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "HOUSE_OWNER",
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    setError(null);
    const result = await register({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: values.role,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Account created");
    const returnTo = safeReturnTo(searchParams.get("returnTo"));
    router.push(returnTo ?? roleHome[values.role]);
  }

  const loginHref = (() => {
    const returnTo = searchParams.get("returnTo");
    return returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
  })();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input className="bg-white" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input className="bg-white" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input className="bg-white" placeholder="+92 3…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input className="bg-white" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>I am a</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={field.value === "BUYER" ? "secondary" : "outline"}
                  onClick={() => field.onChange("BUYER")}
                >
                  Buyer
                </Button>
                <Button
                  type="button"
                  variant={field.value === "HOUSE_OWNER" ? "secondary" : "outline"}
                  onClick={() => field.onChange("HOUSE_OWNER")}
                >
                  House owner
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating…" : "Create account"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already on the floor?{" "}
          <Link href={loginHref} className="text-forest underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
