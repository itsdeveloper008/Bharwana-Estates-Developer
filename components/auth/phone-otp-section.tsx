"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { RecaptchaVerifier, type ConfirmationResult } from "firebase/auth";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { GoogleRoleCompletionDialog } from "@/components/auth/google-role-completion-dialog";
import { OtpDigitInputs } from "@/components/auth/otp-digit-inputs";
import { PakistanPhoneInput } from "@/components/auth/pakistan-phone-field";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { GoogleSignupDraft } from "@/lib/mock-auth";
import { useMockAuth } from "@/lib/mock-auth";
import { formatPakistanMobileE164 } from "@/lib/phone-format";
import {
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  type PhoneOtpRequestValues,
  type PhoneOtpVerifyValues,
} from "@/lib/schemas";
import type { User } from "@/lib/types";

type Step = "phone" | "otp";

const RESEND_SECONDS = 60;

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
  const completingRef = useRef(false);

  const [step, setStep] = useState<Step>("phone");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [draft, setDraft] = useState<GoogleSignupDraft | null>(null);
  const [sentPhone, setSentPhone] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);

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

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  async function resetRecaptcha() {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // ignore stale widget clear errors
    }
    recaptchaRef.current = null;
  }

  async function getRecaptchaVerifier() {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not available");

    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaId, {
        size: "invisible",
        callback: () => undefined,
        "expired-callback": () => {
          void resetRecaptcha();
        },
      });
      await recaptchaRef.current.render();
    }
    return recaptchaRef.current;
  }

  async function sendCode(localDigits: string) {
    if (!isFirebaseConfigured()) {
      setError("Phone sign-in needs Firebase on this deploy.");
      return false;
    }
    setError(null);
    setPending(true);
    try {
      await resetRecaptcha();
      const verifier = await getRecaptchaVerifier();
      const e164 = formatPakistanMobileE164(localDigits);
      console.info("[phone-otp] sending", e164);
      const result = await sendPhoneOtp(e164, verifier);
      if (!result.ok) {
        console.error("[phone-otp] send failed", result.error);
        setError(result.error);
        await resetRecaptcha();
        return false;
      }
      confirmationRef.current = result.confirmation;
      setSentPhone(e164);
      setLocalPhone(localDigits);
      setStep("otp");
      setSecondsLeft(RESEND_SECONDS);
      otpForm.reset({ otp: "" });
      toast.success("Verification code sent.");
      return true;
    } catch (err) {
      console.error("[phone-otp] send exception", err);
      setError("Could not send code. Refresh the page and try again.");
      await resetRecaptcha();
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleSendOtp(values: PhoneOtpRequestValues) {
    await sendCode(values.phone);
  }

  async function handleResend() {
    if (secondsLeft > 0 || !localPhone || pending) return;
    await sendCode(localPhone);
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
      console.info("[phone-otp] verifying");
      const result = await verifyPhoneOtp(confirmation, values.otp);
      if (!result.ok) {
        console.error("[phone-otp] verify failed", result.error);
        setError(result.error);
        return;
      }
      if (result.isNewUser) {
        setDraft(result.draft);
        setRoleOpen(true);
        return;
      }
      toast.success(variant === "register" ? "Account ready" : "Welcome back");
      onSuccess(result.user);
    } catch (err) {
      console.error("[phone-otp] verify exception", err);
      setError("Could not verify the code. Try again or resend a new code.");
    } finally {
      setPending(false);
    }
  }

  async function handleChangeNumber() {
    setStep("phone");
    setError(null);
    confirmationRef.current = null;
    setSecondsLeft(0);
    otpForm.reset({ otp: "" });
    await resetRecaptcha();
  }

  if (!isFirebaseConfigured()) {
    return (
      <p className="text-sm text-muted-foreground">
        Phone sign-in needs Firebase environment variables on this deploy. Use email or Google instead.
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
                      <PakistanPhoneInput
                        name={field.name}
                        ref={field.ref}
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                        hasError={Boolean(fieldState.error)}
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
                      <OtpDigitInputs
                        value={field.value}
                        onChange={field.onChange}
                        disabled={pending}
                        hasError={Boolean(fieldState.error)}
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
              <Button type="submit" className="w-full" disabled={pending || otpForm.watch("otp").length !== 6}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  verifyLabel
                )}
              </Button>
              <div className="flex flex-col gap-2">
                {secondsLeft > 0 ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Resend code in {secondsLeft}s
                  </p>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={pending}
                    onClick={() => void handleResend()}
                  >
                    Resend OTP
                  </Button>
                )}
                <Button type="button" variant="ghost" className="w-full" onClick={() => void handleChangeNumber()}>
                  Use a different number
                </Button>
              </div>
            </form>
          </Form>
        )}
        <div id={recaptchaId} />
      </div>

      <GoogleRoleCompletionDialog
        open={roleOpen}
        onOpenChange={(open) => {
          if (!open && completingRef.current) return;
          setRoleOpen(open);
        }}
        draft={draft}
        requireFullName
        phoneVerified
        onComplete={(user) => {
          if (completingRef.current) return;
          completingRef.current = true;
          setRoleOpen(false);
          onSuccess(user);
        }}
      />
    </>
  );
}
