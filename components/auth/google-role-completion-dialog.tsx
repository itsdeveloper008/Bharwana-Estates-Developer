"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FullNameInput } from "@/components/auth/full-name-input";
import { PakistanPhoneInput } from "@/components/auth/pakistan-phone-field";
import { RoleSelector } from "@/components/auth/role-selector";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GoogleSignupDraft } from "@/lib/mock-auth";
import { useMockAuth } from "@/lib/mock-auth";
import { useMockStore } from "@/lib/mock-store";
import {
  formatPakistanMobileE164,
  isValidPakistanMobileLocal,
  toPakistanMobileLocal,
} from "@/lib/phone-format";
import {
  FULL_NAME_MAX_LENGTH,
  isLettersAndSpacesOnly,
  normalizePersonName,
  PERSON_NAME_LETTERS_MESSAGE,
} from "@/lib/person-name";
import {
  formatPakistanCnic,
  isValidPakistanCnic,
  PK_CNIC_FORMATTED_LENGTH,
} from "@/lib/schemas";
import { DEFAULT_DEALER_COMMISSION_RATE, type User } from "@/lib/types";

export function GoogleRoleCompletionDialog({
  open,
  onOpenChange,
  draft,
  onComplete,
  requireFullName = false,
  phoneVerified = false,
  skipCommit = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: GoogleSignupDraft | null;
  onComplete: (user: User) => void;
  requireFullName?: boolean;
  /** When true (phone OTP already verified), hide the phone field. */
  phoneVerified?: boolean;
  /** Defer app session until caller finishes optional password step. */
  skipCommit?: boolean;
}) {
  const { completeGoogleSignup } = useMockAuth();
  const { addDeveloper } = useMockStore();
  const [role, setRole] = useState<"INDIVIDUAL" | "DEALER">("INDIVIDUAL");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const hidePhoneField =
    phoneVerified || isValidPakistanMobileLocal(toPakistanMobileLocal(draft?.phone ?? ""));

  useEffect(() => {
    if (!open || !draft) return;
    setPhone(toPakistanMobileLocal(draft.phone || ""));
    setFullName("");
    setAgencyName("");
    setRegistrationNumber("");
    setError(null);
    setRole("INDIVIDUAL");
  }, [open, draft]);

  async function handleSubmit() {
    if (!draft) return;
    const resolvedName = requireFullName
      ? normalizePersonName(fullName)
      : draft.fullName.trim();
    if (requireFullName) {
      if (resolvedName.length < 2) {
        setError("Please enter your name.");
        return;
      }
      if (resolvedName.length > FULL_NAME_MAX_LENGTH) {
        setError(`Name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.`);
        return;
      }
      if (!isLettersAndSpacesOnly(resolvedName)) {
        setError(PERSON_NAME_LETTERS_MESSAGE);
        return;
      }
    }
    const localPhone = toPakistanMobileLocal(phone || draft.phone || "");
    if (!isValidPakistanMobileLocal(localPhone)) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    if (role === "DEALER" && !agencyName.trim()) {
      setError("Agency name is required for dealer accounts.");
      return;
    }
    if (role === "DEALER" && !isValidPakistanCnic(registrationNumber)) {
      setError("Enter a valid 13-digit CNIC (e.g. 34201-1234567-1).");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await completeGoogleSignup({
        draft: {
          ...draft,
          fullName: resolvedName || draft.fullName,
          phone: formatPakistanMobileE164(localPhone),
        },
        role,
        agencyName: agencyName.trim() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
        skipCommit,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (role === "DEALER") {
        try {
          await addDeveloper({
            id: `d-${result.user.id}`,
            companyName: agencyName.trim(),
            contactPerson: resolvedName || draft.fullName,
            commissionRate: DEFAULT_DEALER_COMMISSION_RATE,
            dealerUserId: result.user.id,
            status: "PENDING_REVIEW",
            origin: "SELF_REGISTERED",
            registrationNumber: registrationNumber.trim() || undefined,
          });
        } catch (err) {
          console.error("[GoogleRole] dealer profile save failed", err);
          setError("Account created, but dealer profile failed to save. Open Dealer Desk or contact support.");
          return;
        }
      }
      // Parent closes the dialog and navigates - do not call onOpenChange(false) first
      // (that used to cancel the OAuth session and bounce users back to Sign in).
      onComplete(result.user);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-forest/10 bg-ivory sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-forest">Choose your role</DialogTitle>
          <DialogDescription className="text-forest/70">
            Welcome{draft?.fullName ? `, ${draft.fullName.split(" ")[0]}` : ""}. Tell us how you&apos;ll use
            Bharwana before we finish setting up your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {requireFullName && (
            <div className="space-y-1.5">
              <Label htmlFor="signup-full-name">Full name</Label>
              <FullNameInput
                id="signup-full-name"
                className="bg-white"
                placeholder="Your full name"
                value={fullName}
                maxLength={FULL_NAME_MAX_LENGTH}
                onChange={setFullName}
              />
              {error &&
              (error === PERSON_NAME_LETTERS_MESSAGE ||
                error.toLowerCase().includes("name")) ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          )}

          {!hidePhoneField ? (
            <div className="space-y-1.5">
              <Label htmlFor="signup-phone">Phone</Label>
              <PakistanPhoneInput
                id="signup-phone"
                value={phone}
                onChange={setPhone}
                hasError={Boolean(
                  error?.toLowerCase().includes("mobile") || error?.toLowerCase().includes("phone"),
                )}
              />
              <p className="text-[11px] text-muted-foreground">
                Required so we can reach you about listings.
              </p>
            </div>
          ) : null}

          <div>
            <Label className="mb-2 block">I am a</Label>
            <RoleSelector value={role} onChange={setRole} compact />
          </div>

          {role === "DEALER" && (
            <div className="space-y-3 rounded-2xl border border-forest/10 bg-cream/40 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="google-agency">Agency / Company Name</Label>
                <Input
                  id="google-agency"
                  className="bg-white"
                  placeholder="e.g. Ali Realty"
                  value={agencyName}
                  onChange={(event) => setAgencyName(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="google-reg">CNIC</Label>
                <Input
                  id="google-reg"
                  className="bg-white"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={PK_CNIC_FORMATTED_LENGTH}
                  placeholder="e.g. 34201-1234567-1"
                  value={registrationNumber}
                  onChange={(event) => setRegistrationNumber(formatPakistanCnic(event.target.value))}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" disabled={pending || !draft} onClick={() => void handleSubmit()}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
