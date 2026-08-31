"use client";

import { useEffect, useId, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { RecaptchaVerifier, type ConfirmationResult } from "firebase/auth";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { GoogleRoleCompletionDialog } from "@/components/auth/google-role-completion-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { GoogleSignupDraft } from "@/lib/mock-auth";
import { useMockAuth } from "@/lib/mock-auth";
import { phoneOtpRequestSchema, phoneOtpVerifySchema, type PhoneOtpRequestValues, type PhoneOtpVerifyValues } from "@/lib/schemas";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "phone" | "otp";

export function PhoneOtpSection({
  onSuccess,
  variant = "login",
}: {
  onSuccess: (user: User) => void;
  variant?: "login" | "register";
}) {
  const { sendPhoneOtp, verifyPhoneOtp } = useMockAuth();
  const recaptchaContainerId = useId().replace(/:/g, "");
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const [step, setStep] = useState<Step>("phone");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [draft, setDraft] = useState<GoogleSignupDraft | null>(null);
  const [sentPhone, setSentPhone] = useState("");

  const phoneForm = useForm<PhoneOtpRequestValues>({
    resolver: zodResolver(phoneOtpRequestSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<PhoneOtpVerifyValues>({
    resolver: zodResolver(phoneOtpVerifySchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  function getRecaptchaVerifier() {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not available");
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerId, {
        size: "invisible",
      });
    }
    return recaptchaRef.current;
  }

  async function handleSendOtp(values: PhoneOtpRequestValues) {
    if (!isFirebaseConfigured()) {
      setError("Phone sign-in needs Firebase on this deploy.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const verifier = getRecaptchaVerifier();
      const result = await sendPhoneOtp(values.phone, verifier);
      if (!result.ok) {
        setError(result.error);
        recaptchaRef.current?.clear();
        recaptchaRef.current = null;
        return;
      }
      confirmationRef.current = result.confirmation;
      setSentPhone(values.phone);
      setStep("otp");
      otpForm.reset({ otp: "" });
      toast.success("Verification code sent.");
    } catch (err) {
      console.error(err);
      setError("Could not send code. Refresh and try again.");
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyOtp(values: PhoneOtpVerifyValues) {
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      setError("Request a new code first.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await verifyPhoneOtp(confirmation, values.otp);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.isNewUser) {
        setDraft(result.draft);
        setRoleOpen(true);
        return;
      }
      toast.success(variant === "register" ? "Account ready" : "Signed in with phone");
      onSuccess(result.user);
    } finally {
      setPending(false);
    }
  }

  function handleChangeNumber() {
    setStep("phone");
    setError(null);
    confirmationRef.current = null;
    otpForm.reset({ otp: "" });
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  }

  if (!isFirebaseConfigured()) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        {step === "phone" ? (
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(handleSendOtp)} className="space-y-3">
              <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Mobile number</FormLabel>
                    <FormControl>
                      <Input
                        className={cn(
                          "bg-white",
                          fieldState.error && "border-destructive focus-visible:ring-destructive",
                        )}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+92 300 1234567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" variant="outline" className="w-full border-forest/15 bg-white" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Continue with phone"
                )}
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="font-medium text-forest">{sentPhone}</span>.
              </p>
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Verification code</FormLabel>
                    <FormControl>
                      <Input
                        className={cn(
                          "bg-white tracking-[0.35em]",
                          fieldState.error && "border-destructive focus-visible:ring-destructive",
                        )}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        maxLength={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify & continue"
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={handleChangeNumber}>
                Use a different number
              </Button>
            </form>
          </Form>
        )}
        <div id={recaptchaContainerId} />
      </div>

      <GoogleRoleCompletionDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        draft={draft}
        requireFullName
        onComplete={(user) => {
          setRoleOpen(false);
          onSuccess(user);
        }}
      />
    </>
  );
}
