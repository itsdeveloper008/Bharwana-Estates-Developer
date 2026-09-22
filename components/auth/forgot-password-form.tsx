"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ConfirmationResult, type RecaptchaVerifier } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AuthMethodToggle, type AuthMethod } from "@/components/auth/auth-method-toggle";
import { AuthCrossLink } from "@/components/auth/auth-shell";
import { OtpDigitInputs } from "@/components/auth/otp-digit-inputs";
import { PakistanPhoneInput } from "@/components/auth/pakistan-phone-field";
import { PasswordCreateField, ConfirmPasswordField } from "@/components/auth/password-create-field";
import { PhoneRecaptchaHost } from "@/components/auth/phone-recaptcha-host";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { sendPasswordResetLink } from "@/lib/auth-reset";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { useMockAuth } from "@/lib/mock-auth";
import {
  firebaseErrorParts,
  isNetworkAuthError,
  logPersistentNetworkAuthFailure,
  PHONE_NOT_REGISTERED_CODE,
  PHONE_NOT_REGISTERED_MESSAGE,
  phoneAuthErrorMessage,
} from "@/lib/phone-auth-errors";
import { formatPakistanMobileE164 } from "@/lib/phone-format";
import {
  clearRecaptchaContainer,
  createPhoneRecaptchaVerifier,
  ensureRecaptchaScript,
} from "@/lib/phone-recaptcha";
import {
  passwordCreateSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  type PhoneOtpRequestValues,
  type PhoneOtpVerifyValues,
} from "@/lib/schemas";
import { isSyntheticPhoneEmail } from "@/lib/user-display";
import { cn, delay } from "@/lib/utils";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});
type EmailFormValues = z.infer<typeof emailSchema>;

const passwordSchema = z
  .object({
    password: passwordCreateSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

const RESEND_SECONDS = 60;
const OTP_VALID_SECONDS = 180;
const NETWORK_RETRY_DELAY_MS = 2000;
const RECAPTCHA_ID = "forgot-password-phone-recaptcha";

type PhoneStep = "phone" | "otp" | "password" | "done";

export function ForgotPasswordForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const { sendPhoneResetOtp, verifyPhoneResetOtp, logout } = useMockAuth();
  const [method, setMethod] = useState<AuthMethod>("email");

  // —— Email flow (unchanged behavior) ——
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: defaultEmail },
  });

  // —— Phone flow ——
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const sendInFlightRef = useRef(false);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const otpExpiresAtRef = useRef<number>(0);
  const idTokenRef = useRef<string | null>(null);

  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneErrorCode, setPhoneErrorCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [localPhone, setLocalPhone] = useState("");
  const [sentPhone, setSentPhone] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(0);
  const [hasConfirmation, setHasConfirmation] = useState(false);

  const phoneForm = useForm<PhoneOtpRequestValues>({
    resolver: zodResolver(phoneOtpRequestSchema),
    defaultValues: { phone: "" },
  });
  const otpForm = useForm<PhoneOtpVerifyValues>({
    resolver: zodResolver(phoneOtpVerifySchema),
    defaultValues: { otp: "" },
  });
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const otpValue = useWatch({ control: otpForm.control, name: "otp" }) ?? "";

  const showSignUpInstead =
    phoneErrorCode === PHONE_NOT_REGISTERED_CODE ||
    phoneError === PHONE_NOT_REGISTERED_MESSAGE;

  useEffect(() => {
    return () => {
      const previous = recaptchaRef.current;
      recaptchaRef.current = null;
      void clearRecaptchaContainer(RECAPTCHA_ID, previous);
    };
  }, []);

  useEffect(() => {
    if (method !== "phone") return;
    void ensureRecaptchaScript().catch((err) => {
      console.warn("[forgot-password-phone] reCAPTCHA preload failed", err);
    });
  }, [method]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  useEffect(() => {
    if (otpSecondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setOtpSecondsLeft((current) => {
        const next = Math.max(0, current - 1);
        if (next === 0 && confirmationRef.current) {
          confirmationRef.current = null;
          setHasConfirmation(false);
          setPhoneError("Code expired. Request a new one.");
          setPhoneErrorCode(null);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [otpSecondsLeft]);

  async function resetRecaptcha() {
    const previous = recaptchaRef.current;
    recaptchaRef.current = null;
    await clearRecaptchaContainer(RECAPTCHA_ID, previous);
  }

  async function createFreshRecaptchaVerifier() {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not available");
    const previous = recaptchaRef.current;
    recaptchaRef.current = null;
    const verifier = await createPhoneRecaptchaVerifier(auth, RECAPTCHA_ID, previous);
    recaptchaRef.current = verifier;
    return verifier;
  }

  function applyPhoneFailure(message: string, code?: string | null) {
    setPhoneError(message);
    setPhoneErrorCode(
      code ?? (message === PHONE_NOT_REGISTERED_MESSAGE ? PHONE_NOT_REGISTERED_CODE : null),
    );
  }

  async function sendCode(localDigits: string) {
    if (!isFirebaseConfigured()) {
      applyPhoneFailure("Phone reset needs Firebase on this deploy.");
      return false;
    }
    if (sendInFlightRef.current) return false;
    sendInFlightRef.current = true;
    setPhoneError(null);
    setPhoneErrorCode(null);
    setPending(true);
    confirmationRef.current = null;
    otpExpiresAtRef.current = 0;
    idTokenRef.current = null;
    setHasConfirmation(false);
    setOtpSecondsLeft(0);
    const e164 = formatPakistanMobileE164(localDigits);
    try {
      let verifier = await createFreshRecaptchaVerifier();
      let result = await sendPhoneResetOtp(e164, verifier);

      if (!result.ok && isNetworkAuthError(result.code ?? "", result.error)) {
        await delay(NETWORK_RETRY_DELAY_MS);
        await resetRecaptcha();
        verifier = await createFreshRecaptchaVerifier();
        result = await sendPhoneResetOtp(e164, verifier);
        if (!result.ok && isNetworkAuthError(result.code ?? "", result.error)) {
          logPersistentNetworkAuthFailure(
            "phone-reset-send",
            { code: result.code ?? "auth/network-request-failed", message: result.error },
            { e164, retried: true },
          );
        }
      }

      if (!result.ok) {
        applyPhoneFailure(result.error, result.code);
        await resetRecaptcha();
        return false;
      }
      await resetRecaptcha();
      confirmationRef.current = result.confirmation;
      otpExpiresAtRef.current = Date.now() + OTP_VALID_SECONDS * 1000;
      setHasConfirmation(true);
      setSentPhone(e164);
      setLocalPhone(localDigits);
      setPhoneStep("otp");
      setSecondsLeft(RESEND_SECONDS);
      setOtpSecondsLeft(OTP_VALID_SECONDS);
      otpForm.reset({ otp: "" });
      return true;
    } catch (err) {
      const { code, message } = firebaseErrorParts(err);
      applyPhoneFailure(phoneAuthErrorMessage(code, message), code || null);
      await resetRecaptcha();
      return false;
    } finally {
      sendInFlightRef.current = false;
      setPending(false);
    }
  }

  async function handleSendPhone(values: PhoneOtpRequestValues) {
    setLocalPhone(values.phone);
    await sendCode(values.phone);
  }

  async function handleResend() {
    if (secondsLeft > 0 || !localPhone || pending) return;
    await sendCode(localPhone);
  }

  async function handleVerifyOtp(values: PhoneOtpVerifyValues) {
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      applyPhoneFailure("Request a new code, then try again.");
      setHasConfirmation(false);
      return;
    }
    if (Date.now() > otpExpiresAtRef.current) {
      confirmationRef.current = null;
      otpExpiresAtRef.current = 0;
      setHasConfirmation(false);
      setOtpSecondsLeft(0);
      applyPhoneFailure("Code expired. Request a new one.");
      return;
    }
    setPhoneError(null);
    setPhoneErrorCode(null);
    setPending(true);
    try {
      const result = await verifyPhoneResetOtp(confirmation, values.otp);
      if (!result.ok) {
        if (/expired/i.test(result.error)) {
          confirmationRef.current = null;
          otpExpiresAtRef.current = 0;
          setHasConfirmation(false);
          setOtpSecondsLeft(0);
        }
        applyPhoneFailure(result.error);
        otpForm.reset({ otp: "" });
        return;
      }
      confirmationRef.current = null;
      otpExpiresAtRef.current = 0;
      setHasConfirmation(false);
      setOtpSecondsLeft(0);
      idTokenRef.current = result.idToken;
      passwordForm.reset({ password: "", confirmPassword: "" });
      setPhoneStep("password");
    } catch (err) {
      const { code, message } = firebaseErrorParts(err);
      applyPhoneFailure(phoneAuthErrorMessage(code, message), code || null);
      otpForm.reset({ otp: "" });
    } finally {
      setPending(false);
    }
  }

  async function handleSetPassword(values: PasswordFormValues) {
    const idToken = idTokenRef.current;
    if (!idToken) {
      applyPhoneFailure("Verification expired. Request a new code.");
      setPhoneStep("phone");
      return;
    }
    setPhoneError(null);
    setPhoneErrorCode(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/phone-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, newPassword: values.password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!response.ok || !data.ok) {
        applyPhoneFailure(data.error || "Could not update password. Try again.");
        if (response.status === 401) {
          idTokenRef.current = null;
          setPhoneStep("phone");
        }
        return;
      }
      idTokenRef.current = null;
      logout();
      setPhoneStep("done");
    } catch (err) {
      console.error("[forgot-password-phone] reset API failed", err);
      applyPhoneFailure("Could not update password. Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  async function onEmailSubmit(values: EmailFormValues) {
    setEmailError(null);
    const email = values.email.trim().toLowerCase();
    if (!isFirebaseConfigured()) {
      setEmailError("Password reset needs Firebase on this deploy.");
      return;
    }
    if (isSyntheticPhoneEmail(email)) {
      setEmailError(
        "This looks like a phone-only account email. Use the Phone tab to reset with OTP, or sign in with your phone number and password.",
      );
      return;
    }
    try {
      await sendPasswordResetLink(email);
      setSentTo(email);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
      console.error("[forgot-password]", code, err);
      if (code === "auth/user-not-found") {
        setSentTo(email);
        return;
      }
      if (code === "auth/invalid-email") {
        setEmailError("Enter a valid email address.");
        return;
      }
      if (code === "auth/too-many-requests") {
        setEmailError("Too many attempts. Try again later.");
        return;
      }
      if (code === "auth/missing-continue-uri" || code === "auth/invalid-continue-uri") {
        setEmailError("Password reset is misconfigured (continue URL). Contact support.");
        return;
      }
      setEmailError("Could not send a reset email. Try again in a moment.");
    }
  }

  function PhoneErrorAlert() {
    if (!phoneError) return null;
    return (
      <div className="space-y-2" role="alert">
        <p className="text-sm text-destructive">{phoneError}</p>
        {showSignUpInstead ? (
          <p className="text-sm text-forest/70">
            <Link
              href="/register"
              className="font-medium text-[#1F6B4F] underline-offset-2 hover:text-forest hover:underline"
            >
              Sign up instead
            </Link>
          </p>
        ) : null}
      </div>
    );
  }

  if (sentTo) {
    return (
      <div className="space-y-4 rounded-2xl border border-forest/10 bg-cream/40 px-5 py-6">
        <p className="font-serif text-2xl text-forest">Check your email</p>
        <p className="text-sm leading-relaxed text-forest/75">
          If an account with a real email exists for{" "}
          <span className="font-medium text-forest">{sentTo}</span>, Firebase sent a password-reset
          link. Check inbox and spam. Open the link on this site to set a new password. Some email
          scanners can invalidate one-time links if they open them first, so request another if
          needed.
        </p>
        <p className="text-xs text-muted-foreground">
          Phone-only accounts (no real email) should use the Phone tab on this page instead.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  if (phoneStep === "done") {
    return (
      <div className="space-y-4 rounded-2xl border border-forest/10 bg-cream/40 px-5 py-6">
        <p className="font-serif text-2xl text-forest">Password updated</p>
        <p className="text-sm leading-relaxed text-forest/75">
          Your password for{" "}
          <span className="font-medium text-forest">{sentPhone || formatPakistanMobileE164(localPhone)}</span>{" "}
          has been changed. Sign in with your phone number and new password.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AuthMethodToggle value={method} onChange={setMethod} />

      {method === "email" ? (
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4" autoComplete="off">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Email"
                      autoComplete="email"
                      className={cn(
                        "bg-white",
                        fieldState.error && "border-destructive focus-visible:ring-destructive",
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {emailError ? (
              <p className="text-sm text-destructive" role="alert">
                {emailError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
              {emailForm.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Remembered it? <AuthCrossLink href="/login">Sign in</AuthCrossLink>
            </p>
          </form>
        </Form>
      ) : (
        <div className="relative space-y-4">
          {phoneStep === "phone" ? (
            <Form {...phoneForm}>
              <form
                onSubmit={phoneForm.handleSubmit(handleSendPhone)}
                className="space-y-3"
                autoComplete="off"
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
                <PhoneErrorAlert />
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send code"
                  )}
                </Button>
              </form>
            </Form>
          ) : null}

          {phoneStep === "otp" ? (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(handleVerifyOtp)} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-medium text-forest">{sentPhone}</span>.
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
                <PhoneErrorAlert />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    pending || otpValue.length !== 6 || !hasConfirmation || otpSecondsLeft <= 0
                  }
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify code"
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
                      Resend code
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setPhoneStep("phone");
                      setPhoneError(null);
                      setPhoneErrorCode(null);
                      confirmationRef.current = null;
                      idTokenRef.current = null;
                      setHasConfirmation(false);
                      setSecondsLeft(0);
                      setOtpSecondsLeft(0);
                      otpForm.reset({ otp: "" });
                      void resetRecaptcha();
                    }}
                  >
                    Use a different number
                  </Button>
                </div>
              </form>
            </Form>
          ) : null}

          {phoneStep === "password" ? (
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(handleSetPassword)}
                className="space-y-3"
                autoComplete="off"
              >
                <div>
                  <p className="font-serif text-xl text-forest">Set a new password</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-forest/70">
                    Choose a new password for{" "}
                    <span className="font-medium text-forest">{sentPhone}</span>.
                  </p>
                </div>
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <PasswordCreateField field={field} fieldState={fieldState} />
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field, fieldState }) => (
                    <ConfirmPasswordField field={field} fieldState={fieldState} />
                  )}
                />
                <PhoneErrorAlert />
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Update password"
                  )}
                </Button>
              </form>
            </Form>
          ) : null}

          <PhoneRecaptchaHost id={RECAPTCHA_ID} />

          {phoneStep === "phone" ? (
            <p className="text-center text-sm text-muted-foreground">
              Remembered it? <AuthCrossLink href="/login">Sign in</AuthCrossLink>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
