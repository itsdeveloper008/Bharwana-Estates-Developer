"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { DEFAULT_DEALER_COMMISSION_RATE, type User } from "@/lib/types";

export function GoogleRoleCompletionDialog({
  open,
  onOpenChange,
  draft,
  onComplete,
  requireFullName = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: GoogleSignupDraft | null;
  onComplete: (user: User) => void;
  requireFullName?: boolean;
}) {
  const { completeGoogleSignup } = useMockAuth();
  const { addDeveloper } = useMockStore();
  const [role, setRole] = useState<"BUYER" | "HOUSE_OWNER" | "DEALER">("BUYER");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open || !draft) return;
    setPhone(draft.phone || "");
    setFullName("");
    setAgencyName("");
    setRegistrationNumber("");
    setError(null);
  }, [open, draft]);

  async function handleSubmit() {
    if (!draft) return;
    const resolvedName = requireFullName ? fullName.trim() : draft.fullName.trim();
    if (requireFullName && resolvedName.length < 2) {
      setError("Enter your full name.");
      return;
    }
    const resolvedPhone = (phone.trim() || draft.phone.trim());
    if (resolvedPhone.replace(/\D/g, "").length < 10) {
      setError("A phone number is required so we can reach you about your listing");
      return;
    }
    if (role === "DEALER" && !agencyName.trim()) {
      setError("Agency name is required for dealer accounts.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const result = await completeGoogleSignup({
        draft: {
          ...draft,
          fullName: resolvedName || draft.fullName,
          phone: resolvedPhone,
        },
        role,
        agencyName: agencyName.trim() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (role === "DEALER") {
        await addDeveloper({
          id: `d-${Date.now()}`,
          companyName: agencyName.trim(),
          contactPerson: draft.fullName,
          commissionRate: DEFAULT_DEALER_COMMISSION_RATE,
          dealerUserId: result.user.id,
          status: "PENDING_REVIEW",
          origin: "SELF_REGISTERED",
          registrationNumber: registrationNumber.trim() || undefined,
        });
      }
      toast.success(role === "DEALER" ? "Dealer account created. Pending review." : "Account created");
      onOpenChange(false);
      onComplete(result.user);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-ivory sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Choose your role</DialogTitle>
          <DialogDescription>
            Welcome{draft?.fullName ? `, ${draft.fullName.split(" ")[0]}` : ""}. Tell us how you&apos;ll use
            Bharwana before we finish setting up your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {requireFullName && (
            <div className="space-y-1.5">
              <Label htmlFor="signup-full-name">Full name</Label>
              <Input
                id="signup-full-name"
                className="bg-white"
                placeholder="Your name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="signup-phone">Phone</Label>
            <Input
              id="signup-phone"
              className="bg-white"
              type="tel"
              inputMode="tel"
              placeholder="+92 300 1234567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Required so we can reach you about listings.
            </p>
          </div>

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
                <Label htmlFor="google-reg">CNIC or Business Registration (optional)</Label>
                <Input
                  id="google-reg"
                  className="bg-white"
                  placeholder="e.g. 34201-1234567-1"
                  value={registrationNumber}
                  onChange={(event) => setRegistrationNumber(event.target.value)}
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
