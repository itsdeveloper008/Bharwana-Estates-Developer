"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ConfirmationResult } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { GoogleRoleCompletionDialog } from "@/components/auth/google-role-completion-dialog";
import { OtpDigitInputs } from "@/components/auth/otp-digit-inputs";
import { PakistanPhoneInput } from "@/components/auth/pakistan-phone-field";
import { SetPasswordOptional } from "@/components/auth/set-password-optional";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { GoogleSignupDraft } from "@/lib/mock-auth";
import { useMockAuth } from "@/lib/mock-auth";
import { firebaseErrorParts, phoneAuthErrorMessage } from "@/lib/phone-auth-errors";
import { formatPakistanMobileE164 } from "@/lib/phone-format";
import {
  clearRecaptchaContainer,
  createPhoneRecaptchaVerifier,
  ensureRecaptchaScript,
} from "@/lib/phone-recaptcha";
import {
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  type PhoneOtpRequestValues,
  type PhoneOtpVerifyValues,
} from "@/lib/schemas";
import type { User } from "@/lib/types";
import type { RecaptchaVerifier } from "firebase/auth";

type Step = "phone" | "otp" | "setPassword";

const RESEND_SECONDS = 60;

/**
 * Phone OTP for **Sign Up only** — one-time ownership proof, then mandatory password.
 * Returning users sign in with phone number + password on the merged Sign In form.
 */
export function PhoneOtpSection({
  onSuccess,
  recaptchaId = "phone-auth-recaptcha",
}: {
  onSuccess: (user: User) => void;
  /** @deprecated Sign In no longer uses phone OTP. Kept for older call sites. */
  variant?: "login" | "register";
  recaptchaId?: string;
  /** @deprecated Unused — Sign In is email-or-phone + password only. */
  onPreferPassword?: () => void;
}) {
  const { sendPhoneOtp, verifyPhoneOtp } = useMockAuth();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const sendInFlightRef = useRef(false);
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
  const [hasConfirmation, setHasConfirmation] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const phoneForm = useForm<PhoneOtpRequestValues>({
    resolver: zodResolver(phoneOtpRequestSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<PhoneOtpVerifyValues>({
    resolver: zodResolver(phoneOtpVerifySchema),
    defaultValues: { otp: "" },
  });
  const otpValue = useWatch({ control: otpForm.control, name: "otp" }) ?? "";

  useEffect(() => {
    return () => {
      const previous = recaptchaRef.current;
      recaptchaRef.current = null;
      void clearRecaptchaContainer(recaptchaId, previous);
    };
  }, [recaptchaId]);

  useEffect(() => {
    void ensureRecaptchaScript().catch((err) => {
      console.warn("[phone-otp] reCAPTCHA preload failed", err);
    });
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  async function resetRecaptcha() {
    const previous = recaptchaRef.current;
    recaptchaRef.current = null;
    await clearRecaptchaContainer(recaptchaId, previous);
  }

  async function createFreshRecaptchaVerifier() {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not available");
    const previous = recaptchaRef.current;
    recaptchaRef.current = null;
    const verifier = await createPhoneRecaptchaVerifier(auth, recaptchaId, previous);
    recaptchaRef.current = verifier;
    return verifier;
  }

  async function sendCode(localDigits: string) {
    if (!isFirebaseConfigured()) {
      setError("Phone sign-up needs Firebase on this deploy.");
      return false;
    }
    if (sendInFlightRef.current) return false;
    sendInFlightRef.current = true;
    setError(null);
    setPending(true);
    // Resend / retry: discard previous confirmation so the old OTP can never verify.
    confirmationRef.current = null;
    setHasConfirmation(false);
    try {
      const e164 = formatPakistanMobileE164(localDigits);
      console.info("[phone-otp] preparing send", { localDigits, e164 });
      const verifier = await createFreshRecaptchaVerifier();
      const result = await sendPhoneOtp(e164, verifier);
      if (!result.ok) {
        console.error("[phone-otp] send failed", result.error);
        setError(result.error);
        await resetRecaptcha();
        return false;
      }
      await resetRecaptcha();
      confirmationRef.current = result.confirmation;
      setHasConfirmation(true);
      setSentPhone(e164);
      setLocalPhone(localDigits);
      setStep("otp");
      setSecondsLeft(RESEND_SECONDS);
      otpForm.reset({ otp: "" });
      toast.success("Verification code sent.");
      return true;
    } catch (err) {
      const { code, message } = firebaseErrorParts(err);
      console.error("[phone-otp] send exception", { code, message, err });
      setError(phoneAuthErrorMessage(code, message));
      await resetRecaptcha();
      return false;
    } finally {
      sendInFlightRef.current = false;
      setPending(false);
    }
  }

  async function handleSendOtp(values: PhoneOtpRequestValues) {
    setLocalPhone(values.phone);
    await sendCode(values.phone);
  }

  async function handleResend() {
    if (secondsLeft > 0 || !localPhone || pending) return;
    await sendCode(localPhone);
  }

  function finishWithUser(user: User) {
    if (completingRef.current) return;
    completingRef.current = true;
    onSuccess(user);
  }

  async function handleVerifyOtp(values: PhoneOtpVerifyValues) {
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      setError("Request a new code, then try again.");
      setHasConfirmation(false);
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
      // One-time use — drop confirmation so a stale code cannot be replayed.
      confirmationRef.current = null;
      setHasConfirmation(false);
      if (result.isNewUser) {
        setDraft(result.draft);
        setRoleOpen(true);
        return;
      }
      // Existing phone account without going through password setup here —
      // they should use Sign In (phone + password). Still land them after OTP verify.
      toast.success("Account ready");
      finishWithUser(result.user);
    } catch (err) {
      const { code, message } = firebaseErrorParts(err);
      console.error("[phone-otp] verify exception", code, message, err);
      setError(phoneAuthErrorMessage(code, message));
    } finally {
      setPending(false);
    }
  }

  async function handleChangeNumber() {
    setStep("phone");
    setError(null);
    confirmationRef.current = null;
    setHasConfirmation(false);
    setSecondsLeft(0);
    otpForm.reset({ otp: "" });
    await resetRecaptcha();
  }

  if (!isFirebaseConfigured()) {
    return (
      <p className="text-sm text-muted-foreground">
        Phone sign-up needs Firebase environment variables on this deploy. Use email or Google instead.
      </p>
    );
  }

  if (step === "setPassword" && pendingUser) {
    return (
      <SetPasswordOptional
        profile={pendingUser}
        showSkip={false}
        submitLabel="Sign in"
        title="Set your password"
        description="Create a password to finish signing up. Next time, sign in with your phone number and this password."
        successToast="Welcome — you are signed in."
        onDone={(user) => {
          finishWithUser(user);
        }}
      />
    );
  }

  return (
    <>
      <div className="relative space-y-4">
        {step === "phone" ? (
          <Form {...phoneForm}>
            <form
              id="phone-otp-request-form"
              onSubmit={phoneForm.handleSubmit(handleSendOtp)}
              className="space-y-3"
            >
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
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
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
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="w-full"
                disabled={pending || otpValue.length !== 6 || !hasConfirmation}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify & create account"
                )}
              </Button>
              {secondsLeft > 0 ? (
                <p className="text-center text-xs text-muted-foreground">
                  Resend code in {secondsLeft}s
                </p>
              ) : null}
            </form>
          </Form>
        )}

        <div id={recaptchaId} className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden />

        {step === "phone" ? (
          <Button type="submit" form="phone-otp-request-form" className="w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send code"
            )}
          </Button>
        ) : null}

        {step === "otp" ? (
          <div className="flex flex-col gap-2">
            {secondsLeft <= 0 ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => void handleResend()}
              >
                Resend code
              </Button>
            ) : null}
            <Button type="button" variant="ghost" className="w-full" onClick={() => void handleChangeNumber()}>
              Use a different number
            </Button>
          </div>
        ) : null}
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
        skipCommit
        onComplete={(user) => {
          setRoleOpen(false);
          setPendingUser(user);
          setStep("setPassword");
        }}
      />
    </>
  );
}
