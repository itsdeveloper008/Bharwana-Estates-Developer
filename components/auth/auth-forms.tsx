"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type Ref } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { AuthCrossLink } from "@/components/auth/auth-shell";
import { AuthMethodToggle, type AuthMethod } from "@/components/auth/auth-method-toggle";
import { GoogleRoleCompletionDialog } from "@/components/auth/google-role-completion-dialog";
import { PhoneOtpSection } from "@/components/auth/phone-otp-section";
import { RoleSelector } from "@/components/auth/role-selector";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMockAuth } from "@/lib/mock-auth";
import type { GoogleSignupDraft } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import { registerSchema, userLoginSchema, type RegisterFormValues, type UserLoginValues } from "@/lib/schemas";
import { DEFAULT_DEALER_COMMISSION_RATE, type User, type UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const roleHome: Record<UserRole, string> = {
  BUYER: "/properties",
  HOUSE_OWNER: "/owner",
  DEALER: "/dealer",
  SALES_REP: "/sales",
  ADMIN: "/admin",
};

function OrDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-forest/10" />
      </div>
      <div className="relative flex justify-center text-[11px] uppercase tracking-[0.16em]">
        <span className="bg-ivory px-3 text-muted-foreground">or</span>
      </div>
    </div>
  );
}

function ContinueWithGoogle({ onSuccess }: { onSuccess: (user: User) => void }) {
  const { loginWithGoogle, user, isReady, pendingGoogleSignup, consumeGoogleReturn } = useMockAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [draft, setDraft] = useState<GoogleSignupDraft | null>(null);
  const handledReturn = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!isReady || handledReturn.current) return;
    if (pendingGoogleSignup) {
      handledReturn.current = true;
      consumeGoogleReturn();
      setDraft(pendingGoogleSignup);
      setRoleOpen(true);
      return;
    }
    if (user && consumeGoogleReturn()) {
      handledReturn.current = true;
      toast.success("Signed in with Google");
      onSuccessRef.current(user);
    }
  }, [isReady, pendingGoogleSignup, user, consumeGoogleReturn]);

  async function handleClick() {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const result = await loginWithGoogle();
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      if ("redirecting" in result && result.redirecting) {
        // Full-page navigate to Google — keep disabled until unload.
        return;
      }
      if ("isNewUser" in result && result.isNewUser) {
        setDraft(result.draft);
        setRoleOpen(true);
        setPending(false);
        return;
      }
      if ("user" in result) {
        toast.success("Signed in with Google");
        onSuccess(result.user);
      }
      setPending(false);
    } catch (err) {
      console.error("Google continue failed", err);
      setError("Could not sign in with Google. Try again.");
      setPending(false);
    }
  }

  return (
    <>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full border-forest/15 bg-white text-forest hover:border-forest/25 hover:bg-white hover:text-forest"
          disabled={pending}
          onClick={() => void handleClick()}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark className="h-4 w-4" />}
          {pending ? "Connecting…" : "Continue with Google"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <GoogleRoleCompletionDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        draft={draft}
        onComplete={(completed) => {
          setRoleOpen(false);
          onSuccess(completed);
        }}
      />
    </>
  );
}

function safeReturnTo(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
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

export { ContinueWithGoogle };

function PasswordField({
  field,
  fieldState,
}: {
  field: { value: string; onChange: (...args: unknown[]) => void; onBlur: () => void; name: string; ref: Ref<HTMLInputElement> };
  fieldState: { error?: { message?: string } };
}) {
  const [show, setShow] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  return (
    <FormItem>
      <FormLabel>Password</FormLabel>
      <FormControl>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            autoComplete="new-password"
            placeholder=""
            readOnly={!unlocked}
            onFocus={() => setUnlocked(true)}
            value={field.value ?? ""}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            className={cn(
              "bg-white pr-10",
              fieldState.error && "border-destructive focus-visible:ring-destructive",
            )}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/50 transition-colors duration-200 hover:text-forest"
            onClick={() => setShow((value) => !value)}
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
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input
          type="email"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder=""
          readOnly={!unlocked}
          onFocus={() => setUnlocked(true)}
          value={field.value ?? ""}
          name={field.name}
          onBlur={field.onBlur}
          onChange={field.onChange}
          ref={field.ref}
          className={cn(
            "bg-white",
            className,
            fieldState.error && "border-destructive focus-visible:ring-destructive",
          )}
        />
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
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    form.reset({ email: "", password: "" });
  }, [form]);

  function goAfterAuth(role: UserRole) {
    const returnTo = safeReturnTo(searchParams.get("returnTo"));
    router.push(returnTo ?? roleHome[role]);
  }

  async function onSubmit(values: UserLoginValues) {
    setError(null);
    const result = await login(values.email, values.password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("Signed in");
    goAfterAuth(result.user.role);
  }

  return (
    <div className="space-y-6">
      <AuthMethodToggle value={authMethod} onChange={setAuthMethod} />

      {authMethod === "email" ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
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
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>
      ) : (
        <PhoneOtpSection
          variant="login"
          recaptchaId="phone-auth-recaptcha-login"
          onSuccess={(authed) => goAfterAuth(authed.role)}
        />
      )}

      <OrDivider />
      <ContinueWithGoogle onSuccess={(authed) => goAfterAuth(authed.role)} />
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
    mode: "onBlur",
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

  function goAfterAuth(role: UserRole) {
    const returnTo = safeReturnTo(searchParams.get("returnTo"));
    router.push(returnTo ?? roleHome[role]);
  }

  async function onSubmit(values: RegisterFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await register({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: values.role,
        agencyName: values.role === "DEALER" ? values.agencyName : undefined,
        registrationNumber: values.role === "DEALER" ? values.registrationNumber : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (values.role === "DEALER") {
        void addDeveloper({
          id: `d-${Date.now()}`,
          companyName: values.agencyName!.trim(),
          contactPerson: values.fullName.trim(),
          commissionRate: DEFAULT_DEALER_COMMISSION_RATE,
          dealerUserId: result.user.id,
          status: "PENDING_REVIEW",
          origin: "SELF_REGISTERED",
          registrationNumber: values.registrationNumber?.trim() || undefined,
        }).catch((err) => console.error("Dealer profile save failed", err));
      }

      toast.success(
        values.role === "DEALER"
          ? "Dealer account created. Pending review."
          : "Account created successfully.",
      );
      goAfterAuth(values.role);
    } finally {
      setSubmitting(false);
    }
  }

  const loginHref = (() => {
    const returnTo = searchParams.get("returnTo");
    return returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
  })();

  return (
    <div className="space-y-4">
      <AuthMethodToggle value={authMethod} onChange={setAuthMethod} />

      {authMethod === "email" ? (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3" autoComplete="off">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
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
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <EmailField field={field} fieldState={fieldState} />
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    className={cn(
                      "bg-white",
                      fieldState.error && "border-destructive focus-visible:ring-destructive",
                    )}
                    placeholder="+92 3…"
                    {...field}
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
              <PasswordField field={field} fieldState={fieldState} />
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="gap-1.5">
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
            <div className="space-y-3 rounded-2xl border border-forest/10 bg-cream/40 p-3">
              <FormField
                control={form.control}
                name="agencyName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Agency / Company Name</FormLabel>
                    <FormControl>
                      <Input
                        className={cn(
                          "bg-white",
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
                  <FormItem>
                    <FormLabel>CNIC or Business Registration (optional)</FormLabel>
                    <FormControl>
                      <Input
                        className={cn(
                          "bg-white",
                          fieldState.error && "border-destructive focus-visible:ring-destructive",
                        )}
                        placeholder="e.g. 34201-1234567-1"
                        {...field}
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
          <Button type="submit" className="w-full" disabled={submitting || form.formState.isSubmitting}>
            {submitting || form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create account"
            )}
          </Button>
          <p className="!mt-2 text-center text-sm text-muted-foreground">
            Already on the floor? <AuthCrossLink href={loginHref}>Sign in</AuthCrossLink>
          </p>
        </form>
      </Form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Verify your mobile number to create an account. First-time sign-in will ask for your role, same as Google.
          </p>
          <PhoneOtpSection
            variant="register"
            recaptchaId="phone-auth-recaptcha-register"
            onSuccess={(authed) => goAfterAuth(authed.role)}
          />
          <p className="text-center text-sm text-muted-foreground">
            Already on the floor? <AuthCrossLink href={loginHref}>Sign in</AuthCrossLink>
          </p>
        </div>
      )}

      <OrDivider />
      <ContinueWithGoogle onSuccess={(authed) => goAfterAuth(authed.role)} />
    </div>
  );
}
