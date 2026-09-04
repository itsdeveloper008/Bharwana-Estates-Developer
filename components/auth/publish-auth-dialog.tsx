"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ContinueWithGoogle } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMockAuth } from "@/lib/mock-auth";
import {
  registerSchema,
  userLoginSchema,
  type RegisterFormValues,
  type UserLoginValues,
} from "@/lib/schemas";
import type { User } from "@/lib/types";

export function PublishAuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticated: (user: User) => void;
}) {
  const { login, register, user, isReady } = useMockAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  // If Google already signed the user in, continue publish immediately.
  useEffect(() => {
    if (!open || !isReady || !user) return;
    onAuthenticated(user);
  }, [open, isReady, user, onAuthenticated]);

  const loginForm = useForm<UserLoginValues>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "HOUSE_OWNER",
    },
  });

  async function onLogin(values: UserLoginValues) {
    setError(null);
    const result = await login(values.email, values.password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Signed in");
    onAuthenticated(result.user);
  }

  async function onRegister(values: RegisterFormValues) {
    setError(null);
    const result = await register({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: "HOUSE_OWNER",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Account created");
    onAuthenticated(result.user);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-forest/10 bg-ivory">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-forest">
            {mode === "login" ? "Sign in to publish" : "Create an account"}
          </DialogTitle>
          <DialogDescription>
            Your listing details stay on this page. After you sign in, we submit it for review
            automatically.
          </DialogDescription>
        </DialogHeader>

        {mode === "login" ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white"
                        type="email"
                        placeholder=""
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white"
                        type="password"
                        placeholder=""
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                {loginForm.formState.isSubmitting ? "Signing in…" : "Sign in & publish"}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
              <FormField
                control={registerForm.control}
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
                control={registerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white"
                        type="email"
                        placeholder=""
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
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
                control={registerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white"
                        type="password"
                        placeholder=""
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                {registerForm.formState.isSubmitting ? "Creating…" : "Create account & publish"}
              </Button>
            </form>
          </Form>
        )}

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-forest/10" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-[0.16em]">
            <span className="bg-ivory px-3 text-muted-foreground">or</span>
          </div>
        </div>

        <ContinueWithGoogle
          onSuccess={(authed) => {
            setError(null);
            onAuthenticated(authed);
          }}
        />

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                type="button"
                className="text-forest underline-offset-4 hover:underline"
                onClick={() => {
                  setError(null);
                  setMode("register");
                }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button
                type="button"
                className="text-forest underline-offset-4 hover:underline"
                onClick={() => {
                  setError(null);
                  setMode("login");
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
