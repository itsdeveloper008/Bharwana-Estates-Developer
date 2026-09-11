"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState, type Ref } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AuthMethodToggle, type AuthMethod } from "@/components/auth/auth-method-toggle";
import { GoogleRoleCompletionDialog } from "@/components/auth/google-role-completion-dialog";
import { PakistanPhoneInput } from "@/components/auth/pakistan-phone-field";
import { PasswordCreateField } from "@/components/auth/password-create-field";
import { PhoneOtpSection } from "@/components/auth/phone-otp-section";
import { RoleSelector } from "@/components/auth/role-selector";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { pathAfterAuth } from "@/lib/auth-redirect";
import { useMockAuth } from "@/lib/mock-auth";
import type { GoogleSignupDraft } from "@/lib/mock-auth";
import { formatPakistanMobileE164 } from "@/lib/phone-format";
import { useMockStore } from "@/lib/mock-store";
import {
  formatPakistanCnic,
  PK_CNIC_FORMATTED_LENGTH,
  registerSchema,
  userLoginSchema,
  type RegisterFormValues,
  type UserLoginValues,
} from "@/lib/schemas";
import { DEFAULT_DEALER_COMMISSION_RATE, type User } from "@/lib/types";
import { cn } from "@/lib/utils";

function safeReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function OrDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-forest/10" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase tracking-[0.16em]">
        <span className="bg-white px-3 text-forest/40">or</span>
      </div>
    </div>
  );
}

function ContinueWithGoogle({ onSuccess }: { onSuccess: (user: User) => void }) {
  return <SocialAuthButtons onSuccess={onSuccess} />;
}

function SocialAuthButtons({ onSuccess }: { onSuccess: (user: User) => void }) {
  const {
    loginWithGoogle,
    loginWithFacebook,
    user,
    isReady,
    pendingGoogleSignup,
    consumeGoogleReturn,
    cancelPendingOAuthSignup,
  } = useMockAuth();
  const [pendingProvider, setPendingProvider] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [draft, setDraft] = useState<GoogleSignupDraft | null>(null);
  const handledReturn = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!isReady || handledReturn.current) return;
    // Only auto-open role dialog after an OAuth redirect return — never when the user
    // simply opens Sign In with a stale incomplete Google/Facebook session.
    const fromRedirect = consumeGoogleReturn();
    if (!fromRedirect) return;
    handledReturn.current = true;
    if (pendingGoogleSignup) {
      setDraft(pendingGoogleSignup);
      setRoleOpen(true);
      return;
    }
    if (user) {
      toast.dismiss();
      onSuccessRef.current(user);
    }
  }, [isReady, pendingGoogleSignup, user, consumeGoogleReturn]);

  async function handleOAuth(provider: "google" | "facebook") {
    if (pendingProvider) return;
    setError(null);
    setPendingProvider(provider);
    try {
      const result = provider === "google" ? await loginWithGoogle() : await loginWithFacebook();
      if (!result.ok) {
        setError(result.error);
        setPendingProvider(null);
        return;
      }
      if ("redirecting" in result && result.redirecting) {
        return;
      }
      if ("isNewUser" in result && result.isNewUser) {
        setDraft(result.draft);
        setRoleOpen(true);
        setPendingProvider(null);
        return;
      }
      if ("user" in result) {
        toast.dismiss();
        onSuccess(result.user);
      }
      setPendingProvider(null);
    } catch (err) {
      console.error(`${provider} continue failed`, err);
      setError(
        provider === "google"
          ? "Could not sign in with Google. Try again."
          : "Could not sign in with Facebook. Try again.",
      );
      setPendingProvider(null);
    }
  }

  const busy = pendingProvider !== null;

  return (
    <>
      <div className="space-y-2">
        {pendingGoogleSignup && !roleOpen ? (
          <div className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-sm text-forest">
            <p className="text-[13px] leading-snug">
              Finish setting up your Google/Facebook account, or continue with email/phone below.
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-700 underline-offset-2 hover:underline"
              onClick={() => {
                setDraft(pendingGoogleSignup);
                setRoleOpen(true);
              }}
            >
              Continue setup
            </button>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl border-forest/15 bg-white text-forest shadow-none hover:border-forest/25 hover:bg-[#FBFAF6] hover:text-forest"
          disabled={busy}
          onClick={() => void handleOAuth("google")}
        >
          {pendingProvider === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleMark className="h-4 w-4" />
          )}
          {pendingProvider === "google" ? "Connecting…" : "Continue with Google"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full rounded-xl border-forest/15 bg-white text-forest shadow-none hover:border-forest/25 hover:bg-[#FBFAF6] hover:text-forest"
          disabled={busy}
          onClick={() => void handleOAuth("facebook")}
        >
          {pendingProvider === "facebook" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FacebookMark className="h-4 w-4" />
          )}
          {pendingProvider === "facebook" ? "Connecting…" : "Continue with Facebook"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <GoogleRoleCompletionDialog
        open={roleOpen}
        onOpenChange={(open) => {
          setRoleOpen(open);
          if (!open) {
            setDraft(null);
            void cancelPendingOAuthSignup();
          }
        }}
        draft={draft}
        onComplete={(completed) => {
          setRoleOpen(false);
          onSuccess(completed);
        }}
      />
    </>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

export { ContinueWithGoogle, SocialAuthButtons };

function PasswordField({
  field,
  fieldState,
}: {
  field: { value: string; onChange: (...args: unknown[]) => void; onBlur: () => void; name: string; ref: Ref<HTMLInputElement> };
  fieldState: { error?: { message?: string } };
}) {
  const [show, setShow] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const value = field.value ?? "";
  return (
    <FormItem>
      <FormLabel className="text-forest/80">Password</FormLabel>
      <FormControl>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/35"
            strokeWidth={1.75}
            aria-hidden
          />
          <Input
            type={show ? "text" : "password"}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            placeholder="Password"
            readOnly={!unlocked}
            onFocus={() => setUnlocked(true)}
            value={value}
            name="bharwana-login-password"
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            className={cn(
              "h-12 rounded-xl border-forest/10 bg-[#F4F2ED] pl-10 pr-10 shadow-none focus-visible:ring-forest/30",
              fieldState.error && "border-destructive focus-visible:ring-destructive",
            )}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/45 transition-colors duration-200 hover:text-forest"
            onClick={() => setShow((current) => !current)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

function EmailField({
  field,
  fieldState,
  className,
}: {
  field: { value: string; onChange: (...args: unknown[]) => void; onBlur: () => void; name: string; ref: Ref<HTMLInputElement> };
  fieldState: { error?: { message?: string } };
  className?: string;
}) {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <FormItem>
      <FormLabel className="text-forest/80">Email or phone</FormLabel>
      <FormControl>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/35"
            strokeWidth={1.75}
            aria-hidden
          />
          <Input
            type="text"
            inputMode="email"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            placeholder="Email or phone"
            maxLength={50}
            readOnly={!unlocked}
            onFocus={() => setUnlocked(true)}
            value={field.value ?? ""}
            name="bharwana-login-email"
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            className={cn(
              "h-12 rounded-xl border-forest/10 bg-[#F4F2ED] pl-10 shadow-none focus-visible:ring-forest/30",
              className,
              fieldState.error && "border-destructive focus-visible:ring-destructive",
            )}
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useMockAuth();
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [error, setError] = useState<string | null>(null);

  const form = useForm<UserLoginValues>({
    resolver: zodResolver(userLoginSchema),
    mode: "onSubmit",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    form.reset({ email: "", password: "" });
    // Clear any browser-injected autofill after paint.
    const timer = window.setTimeout(() => {
      form.reset({ email: "", password: "" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [form]);

  function goAfterAuth(nextUser?: User) {
    router.push(pathAfterAuth(safeReturnTo(searchParams.get("returnTo")), nextUser?.role));
  }

  async function onSubmit(values: UserLoginValues) {
    setError(null);
    try {
      const result = await login(values.email, values.password);
      if (!result.ok) {
        console.error("[login] rejected", result.error);
        setError(result.error);
        form.setValue("password", "");
        return;
      }
      toast.success("Signed in.");
      goAfterAuth(result.user);
    } catch (err) {
      console.error("[login] unexpected failure", err);
      setError("Could not sign in. Check your connection and try again.");
    }
  }

  return (
    <div className="space-y-4">
      <AuthMethodToggle value={authMethod} onChange={setAuthMethod} />

      {authMethod === "email" ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit, (fieldErrors) => {
              console.warn("[login] validation failed", fieldErrors);
              setError("Enter a valid email or phone and password to continue.");
            })}
            className="space-y-4"
            autoComplete="off"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <EmailField field={field} fieldState={fieldState} />
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <PasswordField field={field} fieldState={fieldState} />
              )}
            />
            <div className="-mt-1 flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#1F6B4F] underline-offset-2 transition-colors hover:text-forest hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="h-12 w-full rounded-xl bg-forest text-ivory hover:bg-forest-800"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </>
              )}
            </Button>
          </form>
        </Form>
      ) : (
        <PhoneOtpSection
          variant="login"
          recaptchaId="phone-auth-recaptcha-login"
          onSuccess={(user) => goAfterAuth(user)}
          onPreferPassword={() => setAuthMethod("email")}
        />
      )}

      <OrDivider />
      <ContinueWithGoogle onSuccess={(user) => goAfterAuth(user)} />
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useMockAuth();
  const { addDeveloper } = useMockStore();
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "HOUSE_OWNER",
      agencyName: "",
      registrationNumber: "",
    },
  });

  const selectedRole = useWatch({ control: form.control, name: "role" });

  function goAfterAuth(nextUser?: User) {
    router.push(pathAfterAuth(safeReturnTo(searchParams.get("returnTo")), nextUser?.role));
  }

  async function onSubmit(values: RegisterFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      console.info("[RegisterForm] submit start", { email: values.email, role: values.role });
      const result = await register({
        fullName: values.fullName,
        email: values.email,
        phone: formatPakistanMobileE164(values.phone),
        password: values.password,
        role: values.role,
        agencyName: values.role === "DEALER" ? values.agencyName : undefined,
        registrationNumber: values.role === "DEALER" ? values.registrationNumber : undefined,
      });
      if (!result.ok) {
        console.error("[RegisterForm] rejected", result.error);
        setError(result.error);
        toast.error(result.error);
        return;
      }

      if (values.role === "DEALER") {
        try {
          await addDeveloper({
            id: `d-${result.user.id}`,
            companyName: values.agencyName!.trim(),
            contactPerson: values.fullName.trim(),
            commissionRate: DEFAULT_DEALER_COMMISSION_RATE,
            dealerUserId: result.user.id,
            status: "PENDING_REVIEW",
            origin: "SELF_REGISTERED",
            registrationNumber: values.registrationNumber?.trim() || undefined,
          });
        } catch (err) {
          console.error("[RegisterForm] dealer profile save failed", err);
          setError("Account created, but dealer profile failed to save. Open Dealer Desk to retry, or contact support.");
          toast.error("Account created, but dealer profile failed to save.");
          goAfterAuth(result.user);
          return;
        }
      }

      const successMessage =
        values.role === "DEALER"
          ? "Dealer account created. Pending review."
          : "Account created successfully.";
      toast.success(successMessage, { duration: 5000 });
      console.info("[RegisterForm] success", { uid: result.user.id });
      goAfterAuth(result.user);
    } catch (err) {
      console.error("[RegisterForm] unexpected failure", err);
      const message = "Could not create your account. Check your connection and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <AuthMethodToggle value={authMethod} onChange={setAuthMethod} />

      {authMethod === "email" ? (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, (fieldErrors) => {
            console.warn("[RegisterForm] validation failed", fieldErrors);
            const first =
              fieldErrors.fullName?.message ||
              fieldErrors.email?.message ||
              fieldErrors.phone?.message ||
              fieldErrors.password?.message ||
              fieldErrors.agencyName?.message ||
              fieldErrors.registrationNumber?.message ||
              "Please fix the highlighted fields and try again.";
            setError(first);
            toast.error(first);
          })}
          className="space-y-2"
          autoComplete="off"
        >
          <FormField
            control={form.control}
            name="fullName"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-1">
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    className={cn(
                      "h-10 rounded-xl border-forest/10 bg-[#F4F2ED] shadow-none focus-visible:ring-forest/30",
                      fieldState.error && "border-destructive focus-visible:ring-destructive",
                    )}
                    maxLength={50}
                    placeholder="Your name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <EmailField field={field} fieldState={fieldState} className="h-10" />
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-1">
                <FormLabel>Phone</FormLabel>
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
          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <PasswordCreateField field={field} fieldState={fieldState} />
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="gap-1 space-y-1">
                <FormLabel>I am a</FormLabel>
                <RoleSelector
                  value={field.value}
                  onChange={field.onChange}
                  compact
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedRole === "DEALER" && (
            <div className="space-y-2 rounded-2xl border border-forest/10 bg-cream/40 p-2.5">
              <FormField
                control={form.control}
                name="agencyName"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Agency / Company Name</FormLabel>
                    <FormControl>
                      <Input
                        className={cn(
                          "h-10 bg-white",
                          fieldState.error && "border-destructive focus-visible:ring-destructive",
                        )}
                        placeholder="e.g. Ali Realty"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registrationNumber"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>CNIC</FormLabel>
                    <FormControl>
                      <Input
                        className={cn(
                          "h-10 bg-white",
                          fieldState.error && "border-destructive focus-visible:ring-destructive",
                        )}
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={PK_CNIC_FORMATTED_LENGTH}
                        placeholder="e.g. 34201-1234567-1"
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        onChange={(event) => field.onChange(formatPakistanCnic(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Dealer accounts list under Bharwana&apos;s standard commission structure. Your account will be
                reviewed before your first listing is approved.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-10 w-full rounded-xl bg-forest text-ivory hover:bg-forest-800"
            disabled={submitting || form.formState.isSubmitting}
          >
            {submitting || form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </>
            )}
          </Button>
        </form>
      </Form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Verify your mobile number to create an account. First-time sign-in will ask for your role, same as Google or Facebook.
          </p>
          <PhoneOtpSection
            variant="register"
            recaptchaId="phone-auth-recaptcha-register"
            onSuccess={(user) => goAfterAuth(user)}
          />
        </div>
      )}

      <OrDivider />
      <ContinueWithGoogle onSuccess={(user) => goAfterAuth(user)} />
    </div>
  );
}
