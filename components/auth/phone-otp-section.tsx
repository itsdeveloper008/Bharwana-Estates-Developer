"use client";

import { useEffect, useRef, useState } from "react";
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
import { normalizePhoneE164 } from "@/lib/phone-format";
import {
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  type PhoneOtpRequestValues,
  type PhoneOtpVerifyValues,
} from "@/lib/schemas";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "phone" | "otp";

export function PhoneOtpSection({
  onSuccess,
  variant = "login",
  recaptchaId = "phone-auth-recaptcha",
}: {
  onSuccess: (user: User) => void;
  variant?: "login" | "register";
  recaptchaId?: string;
}) {
  const { sendPhoneOtp, verifyPhoneOtp } = useMockAuth();
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

  async function resetRecaptcha() {
    recaptchaRef.current?.clear();
    recaptchaRef.current = null;
  }

  async function getRecaptchaVerifier() {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not available");

    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaId, {
        size: "invisible",
      });
      await recaptchaRef.current.render();
    }
    return recaptchaRef.current;
  }

  function toE164(localPhone: string) {
    const digits = localPhone.replace(/\D/g, "");
    if (localPhone.trim().startsWith("+")) {
      return normalizePhoneE164(localPhone);
    }
    return normalizePhoneE164(digits.startsWith("92") ? `+${digits}` : `+92${digits.replace(/^0/, "")}`);
  }

  async function handleSendOtp(values: PhoneOtpRequestValues) {
    if (!isFirebaseConfigured()) {
      setError("Phone sign-in needs Firebase on this deploy.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await resetRecaptcha();
      const verifier = await getRecaptchaVerifier();
      const e164 = toE164(values.phone);
      const result = await sendPhoneOtp(e164, verifier);
      if (!result.ok) {
        setError(result.error);
        await resetRecaptcha();
        return;
      }
      confirmationRef.current = result.confirmation;
      setSentPhone(e164);
      setStep("otp");
      otpForm.reset({ otp: "" });
      toast.success("Verification code sent.");
    } catch (err) {
      console.error(err);
      setError("Could not send code. Refresh the page and try again.");
      await resetRecaptcha();
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

  async function handleChangeNumber() {
    setStep("phone");
    setError(null);
    confirmationRef.current = null;
    otpForm.reset({ otp: "" });
    await resetRecaptcha();
  }

  if (!isFirebaseConfigured()) {
    return (
      <p className="text-sm text-muted-foreground">
        Phone sign-in is unavailable on this deploy. Use email or Google instead.
      </p>
    );
  }

  const sendLabel = "Send code";
  const verifyLabel = variant === "register" ? "Verify & create account" : "Verify & sign in";

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
                      <div className="flex">
                        <span className="inline-flex items-center rounded-l-md border border-r-0 border-forest/15 bg-cream/70 px-3 text-sm font-medium text-forest">
                          +92
                        </span>
                        <Input
                          className={cn(
                            "rounded-l-none bg-white",
                            fieldState.error && "border-destructive focus-visible:ring-destructive",
                          )}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-national"
                          placeholder="300 1234567"
                          {...field}
                        />
                      </div>
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
                    Sending code…
                  </>
                ) : (
                  sendLabel
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
                          "bg-white text-center text-lg tracking-[0.35em]",
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
                  verifyLabel
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => void handleChangeNumber()}>
                Use a different number
              </Button>
            </form>
          </Form>
        )}
        <div id={recaptchaId} />
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
