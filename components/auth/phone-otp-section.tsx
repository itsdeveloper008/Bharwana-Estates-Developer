"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchSignInMethodsForEmail, RecaptchaVerifier, type ConfirmationResult } from "firebase/auth";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { GoogleRoleCompletionDialog } from "@/components/auth/google-role-completion-dialog";
import { OtpDigitInputs } from "@/components/auth/otp-digit-inputs";
import { PakistanPhoneInput } from "@/components/auth/pakistan-phone-field";
import { SetPasswordOptional } from "@/components/auth/set-password-optional";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import type { GoogleSignupDraft } from "@/lib/mock-auth";
import { useMockAuth } from "@/lib/mock-auth";
import { firebaseErrorParts, phoneAuthErrorMessage } from "@/lib/phone-auth-errors";
import { formatPakistanMobileE164 } from "@/lib/phone-format";
import {
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  type PhoneOtpRequestValues,
  type PhoneOtpVerifyValues,
} from "@/lib/schemas";
import type { User } from "@/lib/types";
import { authEmailFromLoginIdentifier } from "@/lib/user-display";
import { cn } from "@/lib/utils";

type Step = "phone" | "password" | "otp" | "setPassword";

const RESEND_SECONDS = 60;
/** Client-side OTP validity window — invalidate confirmation when this elapses. */
const OTP_VALID_SECONDS = 180;

const phonePasswordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type PhonePasswordValues = z.infer<typeof phonePasswordSchema>;

async function phoneAccountHasPassword(localDigits: string): Promise<boolean> {
  const auth = getFirebaseAuth();
  if (!auth) return false;
  const email = authEmailFromLoginIdentifier(localDigits);
  if (!email.includes("@")) return false;
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.includes("password");
  } catch (error) {
    console.warn("[phone-otp] could not check password methods", error);
    return false;
  }
}

export function PhoneOtpSection({
  onSuccess,
  variant = "login",
  recaptchaId = "phone-auth-recaptcha",
  onPreferPassword,
}: {
  onSuccess: (user: User) => void;
  variant?: "login" | "register";
  recaptchaId?: string;
  /** Switch Sign In UI to the email/password tab. */
  onPreferPassword?: () => void;
}) {
  const { sendPhoneOtp, verifyPhoneOtp, adoptSession, login } = useMockAuth();
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
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [otpTick, setOtpTick] = useState(0);
  const [hasConfirmation, setHasConfirmation] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const phoneForm = useForm<PhoneOtpRequestValues>({
    resolver: zodResolver(phoneOtpRequestSchema),
    defaultValues: { phone: "" },
  });

  const otpForm = useForm<PhoneOtpVerifyValues>({
    resolver: zodResolver(phoneOtpVerifySchema),
    defaultValues: { otp: "" },
  });
  const otpValue = useWatch({ control: otpForm.control, name: "otp" }) ?? "";

  const passwordForm = useForm<PhonePasswordValues>({
    resolver: zodResolver(phonePasswordSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    return () => {
      try {
        recaptchaRef.current?.clear();
      } catch {
        // ignore
      }
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

  useEffect(() => {
    if (step !== "otp" || !otpExpiresAt) return;
    const remaining = otpExpiresAt - Date.now();
    if (remaining <= 0) {
      confirmationRef.current = null;
      setHasConfirmation(false);
      setError("Code expired, please resend");
      return;
    }
    const tickId = window.setInterval(() => setOtpTick((n) => n + 1), 1000);
    const id = window.setTimeout(() => {
      confirmationRef.current = null;
      setHasConfirmation(false);
      setError("Code expired, please resend");
    }, remaining);
    return () => {
      window.clearInterval(tickId);
      window.clearTimeout(id);
    };
  }, [otpExpiresAt, step]);

  async function resetRecaptcha() {
    try {
      recaptchaRef.current?.clear();
    } catch {
      // ignore stale widget clear errors
    }
    recaptchaRef.current = null;
    const host = document.getElementById(recaptchaId);
    if (host) host.innerHTML = "";
  }

  async function getRecaptchaVerifier() {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not available");

    if (recaptchaRef.current) return recaptchaRef.current;

    const host = document.getElementById(recaptchaId);
    if (!host) {
      throw Object.assign(new Error("reCAPTCHA container is missing from the page."), {
        code: "auth/argument-error",
      });
    }

    recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaId, {
      size: "invisible",
      callback: () => undefined,
      "expired-callback": () => {
        void resetRecaptcha();
      },
    });
    await recaptchaRef.current.render();
    return recaptchaRef.current;
  }

  async function sendCode(localDigits: string) {
    if (!isFirebaseConfigured()) {
      setError("Phone sign-in needs Firebase on this deploy.");
      return false;
    }
    setError(null);
    setPending(true);
    // Invalidate any previous confirmation before requesting a new code.
    confirmationRef.current = null;
    setHasConfirmation(false);
    setOtpExpiresAt(null);
    try {
      let verifier = recaptchaRef.current;
      if (!verifier) {
        verifier = await getRecaptchaVerifier();
      }
      const e164 = formatPakistanMobileE164(localDigits);
      console.info("[phone-otp] sending E.164", e164);
      const result = await sendPhoneOtp(e164, verifier);
      if (!result.ok) {
        console.error("[phone-otp] send failed", result.error);
        setError(result.error);
        await resetRecaptcha();
        return false;
      }
      confirmationRef.current = result.confirmation;
      setHasConfirmation(true);
      setSentPhone(e164);
      setLocalPhone(localDigits);
      setStep("otp");
      setSecondsLeft(RESEND_SECONDS);
      setOtpExpiresAt(Date.now() + OTP_VALID_SECONDS * 1000);
      setOtpTick(0);
      otpForm.reset({ otp: "" });
      toast.success("Verification code sent.");
      return true;
    } catch (err) {
      const { code, message } = firebaseErrorParts(err);
      console.error("[phone-otp] send exception", code, message, err);
      setError(phoneAuthErrorMessage(code, message));
      await resetRecaptcha();
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleSendOtp(values: PhoneOtpRequestValues) {
    setLocalPhone(values.phone);
    if (variant === "login") {
      setPending(true);
      setError(null);
      try {
        const hasPassword = await phoneAccountHasPassword(values.phone);
        if (hasPassword) {
          setStep("password");
          passwordForm.reset({ password: "" });
          return;
        }
      } finally {
        setPending(false);
      }
    }
    await sendCode(values.phone);
  }

  async function handlePasswordSignIn(values: PhonePasswordValues) {
    setError(null);
    setPending(true);
    try {
      const result = await login(localPhone, values.password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Welcome back");
      finishWithUser(result.user);
    } catch (err) {
      console.error("[phone-password] sign-in failed", err);
      setError("Could not sign in. Check your password or use OTP.");
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || !localPhone || pending) return;
    await resetRecaptcha();
    await sendCode(localPhone);
  }

  function finishWithUser(user: User) {
    if (completingRef.current) return;
    completingRef.current = true;
    onSuccess(user);
  }

  async function handleVerifyOtp(values: PhoneOtpVerifyValues) {
    if (otpExpiresAt && Date.now() > otpExpiresAt) {
      confirmationRef.current = null;
      setHasConfirmation(false);
      setError("Code expired, please resend");
      return;
    }
    const confirmation = confirmationRef.current;
    if (!confirmation) {
      setError("Code expired, please resend");
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
      setOtpExpiresAt(null);
      if (result.isNewUser) {
        setDraft(result.draft);
        setRoleOpen(true);
        return;
      }
      toast.success(variant === "register" ? "Account ready" : "Welcome back");
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
    setOtpExpiresAt(null);
    setSecondsLeft(0);
    otpForm.reset({ otp: "" });
    passwordForm.reset({ password: "" });
    await resetRecaptcha();
  }

  if (!isFirebaseConfigured()) {
    return (
      <p className="text-sm text-muted-foreground">
        Phone sign-in needs Firebase environment variables on this deploy. Use email or Google instead.
      </p>
    );
  }

  if (step === "setPassword" && pendingUser) {
    return (
      <SetPasswordOptional
        defaultEmail={pendingUser.email}
        onDone={() => {
          finishWithUser(pendingUser);
        }}
        onSkip={() => {
          adoptSession(pendingUser);
          finishWithUser(pendingUser);
        }}
      />
    );
  }

  const sendLabel = "Send code";
  const verifyLabel = variant === "register" ? "Verify & create account" : "Verify & sign in";
  const otpRemainingDisplay = otpExpiresAt
    ? Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000))
    : 0;
  // otpTick forces a re-render each second while the expiry countdown is active.
  void otpTick;

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
              {onPreferPassword ? (
                <p className="text-xs text-muted-foreground">
                  Prefer email?{" "}
                  <button
                    type="button"
                    className="font-medium text-forest underline-offset-2 hover:text-gold-700 hover:underline"
                    onClick={onPreferPassword}
                  >
                    Sign in with email instead
                  </button>
                </p>
              ) : null}
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking…
                  </>
                ) : (
                  variant === "login" ? "Continue" : sendLabel
                )}
              </Button>
            </form>
          </Form>
        ) : step === "password" ? (
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSignIn)} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This number has a password. Sign in with it, or use an SMS code instead.
              </p>
              <FormField
                control={passwordForm.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/35"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="Password"
                          className={cn(
                            "h-12 rounded-xl border-forest/10 bg-[#F4F2ED] pl-10 pr-10 shadow-none focus-visible:ring-forest/30",
                            fieldState.error && "border-destructive focus-visible:ring-destructive",
                          )}
                          {...field}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/45 transition-colors hover:text-forest"
                          onClick={() => setShowPassword((current) => !current)}
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
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in with password"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() => void sendCode(localPhone)}
              >
                Send OTP instead
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => void handleChangeNumber()}>
                Use a different number
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
              {otpExpiresAt && otpRemainingDisplay > 0 ? (
                <p className="text-center text-xs text-muted-foreground">
                  Code expires in {Math.floor(otpRemainingDisplay / 60)}:
                  {String(otpRemainingDisplay % 60).padStart(2, "0")}
                </p>
              ) : null}
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
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
