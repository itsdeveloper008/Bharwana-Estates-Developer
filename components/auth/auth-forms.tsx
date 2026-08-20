"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { findMockUser } from "@/lib/api/users";
import { useMockAuth } from "@/lib/mock-auth";
import { users } from "@/lib/mock-data/users";
import { loginSchema, otpSchema } from "@/lib/schemas";
import { delay } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { z } from "zod";

const roleHome: Record<UserRole, string> = {
  BUYER: "/properties",
  HOUSE_OWNER: "/owner",
  SALES_REP: "/sales",
  ADMIN: "/admin",
};

export function LoginForm() {
  const router = useRouter();
  const { loginAs } = useMockAuth();
  const [step, setStep] = useState<"identifier" | "otp">("identifier");
  const [identifier, setIdentifier] = useState("");

  const idForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "" },
  });
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  async function requestCode(values: z.infer<typeof loginSchema>) {
    // TODO: replace with real backend call
    await delay(500);
    setIdentifier(values.identifier);
    setStep("otp");
    toast.message("Use any 6-digit code. This is a UI preview.");
  }

  async function verify() {
    // TODO: replace with real backend call
    await delay(600);
    const matched = findMockUser(identifier) ?? users.find((user) => user.role === "BUYER");
    if (!matched) return;
    loginAs(matched);
    toast.success(`Signed in as ${matched.fullName}`);
    router.push(roleHome[matched.role]);
  }

  return (
    <div className="space-y-6">
      {step === "identifier" ? (
        <Form {...idForm}>
          <form onSubmit={idForm.handleSubmit(requestCode)} className="space-y-4">
            <FormField
              control={idForm.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or phone</FormLabel>
                  <FormControl>
                    <Input className="bg-white" placeholder="ahmed.khan@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={idForm.formState.isSubmitting}>
              Send code
            </Button>
          </form>
        </Form>
      ) : (
        <Form {...otpForm}>
          <form onSubmit={otpForm.handleSubmit(verify)} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A six-digit code was “sent” to {identifier}. Enter any six digits to continue.
            </p>
            <FormField
              control={otpForm.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>One-time code</FormLabel>
                  <FormControl>
                    <Input className="bg-white tracking-[0.4em]" maxLength={6} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
              Verify
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("identifier")}>
              Use a different number
            </Button>
          </form>
        </Form>
      )}

      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Review as</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {users.map((user) => (
            <Button
              key={user.id}
              variant="outline"
              className="h-auto justify-start px-3 py-2 text-left"
              onClick={() => {
                loginAs(user);
                router.push(roleHome[user.role]);
              }}
            >
              <span>
                <span className="block text-xs text-forest">{user.fullName}</span>
                <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {user.role.replace("_", " ")}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { loginAs } = useMockAuth();
  const [step, setStep] = useState<"details" | "otp">("details");

  const form = useForm({
    resolver: zodResolver(
      z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        phone: z.string().min(10),
        role: z.enum(["BUYER", "HOUSE_OWNER"]),
      }),
    ),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      role: "BUYER" as const,
    },
  });

  async function onSubmit() {
    // TODO: replace with real backend call
    if (step === "details") {
      await delay(400);
      setStep("otp");
      return;
    }
    await delay(500);
    const values = form.getValues();
    loginAs({
      id: `u-${Date.now()}`,
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      role: values.role,
    });
    toast.success("Account created (mock).");
    router.push(values.role === "HOUSE_OWNER" ? "/owner" : "/properties");
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {step === "details" ? (
          <>
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
                    <Input className="bg-white" {...field} />
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
                    <Input className="bg-white" {...field} />
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Confirm the code sent to {form.getValues("phone")}. Any six digits will do in this preview.
          </p>
        )}
        {step === "otp" && (
          <Input className="bg-white tracking-[0.4em]" maxLength={6} placeholder="000000" required />
        )}
        <Button type="submit" className="w-full">
          {step === "details" ? "Continue" : "Create account"}
        </Button>
        {step === "otp" && (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("details")}>
            Back
          </Button>
        )}
        <p className="text-center text-sm text-muted-foreground">
          Already on the floor?{" "}
          <Link href="/login" className="text-forest underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}
