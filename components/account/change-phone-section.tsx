"use client";

import { useEffect, useRef, useState } from "react";
import type { RecaptchaVerifier } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { OtpDigitInputs } from "@/components/auth/otp-digit-inputs";
import { PakistanPhoneInput } from "@/components/auth/pakistan-phone-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { useMockAuth } from "@/lib/mock-auth";
import {
  formatPakistanMobileE164,
  isValidPakistanMobileLocal,
  toPakistanMobileLocal,
} from "@/lib/phone-format";
import {
  clearRecaptchaContainer,
  createPhoneRecaptchaVerifier,
  ensureRecaptchaScript,
} from "@/lib/phone-recaptcha";

const RESEND_SECONDS = 60;
const RECAPTCHA_ID = "change-phone-recaptcha";

type Step = "idle" | "phone" | "otp";

/** Inline Account Settings flow to add or change a verified phone number. */
export function ChangePhoneSection({ currentPhone }: { currentPhone: string }) {
  const { sendChangePhoneOtp, confirmChangePhone } = useMockAuth();
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const verificationIdRef = useRef<string | null>(null);

  const [step, setStep] = useState<Step>("idle");
  const [localPhone, setLocalPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sentPhone, setSentPhone] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const needsRecaptchaWidget = step === "phone" || (step === "otp" && secondsLeft === 0);

  useEffect(() => {
    if (!needsRecaptchaWidget) return;
    void ensureRecaptchaScript().catch((err) => {
      console.warn("[change-phone] reCAPTCHA preload failed", err);
    });
    let cancelled = false;
    void (async () => {
      try {
        const auth = getFirebaseAuth();
        if (!auth || cancelled) return;
        const verifier = await createPhoneRecaptchaVerifier(auth, RECAPTCHA_ID, recaptchaRef.current);
        if (cancelled) {
          try {
            verifier.clear();
          } catch {
            /* ignore */
          }
          return;
        }
        recaptchaRef.current = verifier;
      } catch (err) {
        console.warn("[change-phone] reCAPTCHA widget mount failed", err);
      }
    })();
    return () => {
      cancelled = true;
      try {
        recaptchaRef.current?.clear();
      } catch {
        /* ignore */
      }
      recaptchaRef.current = null;
    };
  }, [needsRecaptchaWidget]);

  async function resetRecaptcha() {
    await clearRecaptchaContainer(RECAPTCHA_ID, recaptchaRef.current);
    recaptchaRef.current = null;
  }

  async function createFreshRecaptchaVerifier() {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase Auth is not available");
    const verifier = await createPhoneRecaptchaVerifier(auth, RECAPTCHA_ID, recaptchaRef.current);
    recaptchaRef.current = verifier;
    return verifier;
  }

  function startChange() {
    setError(null);
    setOtp("");
    setSecondsLeft(0);
    verificationIdRef.current = null;
    setLocalPhone(toPakistanMobileLocal(currentPhone));
    setStep("phone");
  }

  function cancel() {
    setStep("idle");
    setError(null);
    setOtp("");
    setSecondsLeft(0);
    verificationIdRef.current = null;
    void resetRecaptcha();
  }

  async function sendCode(localDigits: string) {
    if (!isFirebaseConfigured()) {
      setError("Phone updates need Firebase on this deploy.");
      return false;
    }
    if (!isValidPakistanMobileLocal(localDigits)) {
      setError("Enter a valid 10-digit mobile number");
      return false;
    }

    setError(null);
    setPending(true);
    try {
      const verifier = recaptchaRef.current ?? (await createFreshRecaptchaVerifier());
      const e164 = formatPakistanMobileE164(localDigits);
      console.info("[change-phone] preparing send", { e164 });
      const result = await sendChangePhoneOtp(e164, verifier);
      if (!result.ok) {
        setError(result.error);
        await resetRecaptcha();
        try {
          await createFreshRecaptchaVerifier();
        } catch {
          /* user can refresh */
        }
        return false;
      }
      await resetRecaptcha();
      verificationIdRef.current = result.verificationId;
      setSentPhone(result.phone);
      setLocalPhone(localDigits);
      setStep("otp");
      setSecondsLeft(RESEND_SECONDS);
      setOtp("");
      toast.success("Verification code sent.");
      return true;
    } catch (err) {
      console.error("[change-phone] send exception", err);
      setError("Something went wrong sending your code. Please try again in a moment.");
      await resetRecaptcha();
      try {
        await createFreshRecaptchaVerifier();
      } catch {
        /* user can refresh */
      }
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleSend() {
    await sendCode(localPhone);
  }

  async function handleResend() {
    if (secondsLeft > 0 || !localPhone || pending) return;
    await sendCode(localPhone);
  }

  async function handleVerify() {
    const verificationId = verificationIdRef.current;
    if (!verificationId) {
      setError("Request a new code first.");
      return;
    }
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const result = await confirmChangePhone({
        verificationId,
        code: otp,
        phone: sentPhone || formatPakistanMobileE164(localPhone),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Phone number updated");
      setStep("idle");
      setOtp("");
      setSecondsLeft(0);
      verificationIdRef.current = null;
      await resetRecaptcha();
    } catch (err) {
      console.error("[change-phone] verify exception", err);
      setError("Could not verify the code. Try again or resend a new code.");
    } finally {
      setPending(false);
    }
  }

  const displayPhone = currentPhone?.trim() || "—";
  const actionLabel = currentPhone?.trim() ? "Change" : "Add";

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Phone</dt>
          <dd className="mt-1 break-all">{displayPhone}</dd>
        </div>
        {step === "idle" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl"
            onClick={startChange}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>

      {step !== "idle" ? (
        <div className="mt-4 space-y-3 rounded-2xl border border-forest/10 bg-ivory px-4 py-4">
          {step === "phone" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="change-phone-input">New mobile number</Label>
                <PakistanPhoneInput
                  id="change-phone-input"
                  value={localPhone}
                  onChange={(value) => {
                    setLocalPhone(value);
                    setError(null);
                  }}
                  hasError={Boolean(error)}
                  disabled={pending}
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium text-forest">{sentPhone}</span>.
              </p>
              <div className="space-y-1.5">
                <Label>Verification code</Label>
                <OtpDigitInputs
                  value={otp}
                  onChange={(value) => {
                    setOtp(value);
                    setError(null);
                  }}
                  disabled={pending}
                  hasError={Boolean(error)}
                />
              </div>
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                className="w-full"
                disabled={pending || otp.length !== 6}
                onClick={() => void handleVerify()}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Confirm phone number"
                )}
              </Button>
              {secondsLeft > 0 ? (
                <p className="text-center text-xs text-muted-foreground">
                  Resend code in {secondsLeft}s
                </p>
              ) : null}
            </>
          )}

          <div
            className={
              needsRecaptchaWidget
                ? "space-y-1"
                : "pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
            }
          >
            <div className="flex justify-center py-1">
              <div id={RECAPTCHA_ID} className="min-h-[78px]" />
            </div>
            {needsRecaptchaWidget ? (
              <p className="text-center text-[11px] text-muted-foreground">
                Complete the security check above, then continue.
              </p>
            ) : null}
          </div>

          {step === "phone" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="w-full sm:flex-1"
                disabled={pending || !isValidPakistanMobileLocal(localPhone)}
                onClick={() => void handleSend()}
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={cancel}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {secondsLeft <= 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                  onClick={() => void handleResend()}
                >
                  Resend OTP
                </Button>
              ) : null}
              <Button type="button" variant="ghost" className="w-full" disabled={pending} onClick={cancel}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
